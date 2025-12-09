// app/static/js/gauss_simple.js

let ultimaCeldaActiva = null; // math-field activo
let ultimoResultado = null;

// ========= helpers LaTeX -> "pretty" =========

function latexToPretty(latex) {
  if (!latex) return "";
  let s = latex;

  // limpiar \placeholder{}, \left, \right, espacios, \( \), $$ $$
  s = s.replace(/\\placeholder\{[^}]*\}/g, "");
  s = s.replace(/\\ /g, " ");
  s = s.replace(/\\left/g, "").replace(/\\right/g, "");
  s = s.replace(/\\\(/g, "").replace(/\\\)/g, "");
  s = s.replace(/\$\$/g, "").replace(/\$/g, "");

  // \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");

  // \sqrt{...} -> √(...)
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");

  // \pi -> π
  s = s.replace(/\\pi/g, "π");

  // |x|: \left|x\right| -> |x|
  s = s.replace(/\\left\|/g, "|").replace(/\\right\|/g, "|");

  // potencias: x^{2} -> x^2
  s = s.replace(/([A-Za-z0-9\)\]])\^\{([^}]*)\}/g, "$1^$2");

  // quitar llaves restantes
  s = s.replace(/[{}]/g, "");

  // trig: LaTeX -> español pretty
  s = s.replace(/\\sin/g, "sen");
  s = s.replace(/\\cos/g, "cos");
  s = s.replace(/\\tan/g, "tg");
  s = s.replace(/\\arcsin/g, "asen");
  s = s.replace(/\\arccos/g, "acos");
  s = s.replace(/\\arctan/g, "atan");

  // logs
  s = s.replace(/\\ln/g, "ln");
  s = s.replace(/\\log_?\{?10\}?/g, "log10");

  return s.trim();
}

// sincroniza UN math-field con su input oculto "real"
function syncCeldaDesdeMathfield(mf) {
  const idReal = mf.dataset.realId;
  if (!idReal) return;
  const hidden = document.getElementById(idReal);
  if (!hidden) return;

  const latex = mf.value || "";
  const pretty = latexToPretty(latex);

  // Guardamos "pretty" (√, sen, ^, etc.). Python lo normaliza después.
  hidden.value = pretty;
}

// ========= creación de tabla con math-field en cada celda =========

function crearTabla(filas, columnas) {
  const tabla = document.getElementById("tabla-matriz");
  if (!tabla) {
    console.error("❌ No se encontró la tabla #tabla-matriz");
    return;
  }

  tabla.innerHTML = "";

  // encabezado
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");

  const headV = document.createElement("th");
  headV.className = "row-head";
  headV.textContent = "";
  trh.appendChild(headV);

  for (let c = 0; c < columnas; c++) {
    const th = document.createElement("th");
    th.textContent = "x" + (c + 1);
    trh.appendChild(th);
  }

  const thb = document.createElement("th");
  thb.textContent = "b";
  trh.appendChild(thb);

  thead.appendChild(trh);
  tabla.appendChild(thead);

  // cuerpo con math-field + hidden
  const tbody = document.createElement("tbody");
  for (let r = 0; r < filas; r++) {
    const tr = document.createElement("tr");

    const rh = document.createElement("th");
    rh.className = "row-head";
    rh.textContent = String(r + 1);
    tr.appendChild(rh);

    for (let c = 0; c < columnas + 1; c++) {
      const td = document.createElement("td");
      td.className = "celda";

      const mf = document.createElement("math-field");
      mf.setAttribute("math-virtual-keyboard-policy", "manual");
      mf.className = "celda-mf";

      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.className = "celda-real";
      const realId = `celda-r${r}-c${c}`;
      hidden.id = realId;

      mf.dataset.realId = realId;
      mf.dataset.fila = String(r);
      mf.dataset.col = String(c);

      mf.addEventListener("focus", () => {
        ultimaCeldaActiva = mf;
      });

      mf.addEventListener("input", () => {
        syncCeldaDesdeMathfield(mf);
      });

      // Navegación con flechas entre celdas
      mf.addEventListener("keydown", (e) => {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          moverFoco({ r, c }, e.key, filas, columnas + 1);
        }
      });

      td.appendChild(mf);
      td.appendChild(hidden);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  tabla.appendChild(tbody);
  document.getElementById("zona-tabla").classList.remove("hidden");

  console.log(`✅ Matriz creada con ${filas} filas y ${columnas} columnas.`);
}

function moverFoco(pos, key, filas, columnas) {
  let { r, c } = pos;
  if (key === "ArrowUp") r = Math.max(0, r - 1);
  if (key === "ArrowDown") r = Math.min(filas - 1, r + 1);
  if (key === "ArrowLeft") c = Math.max(0, c - 1);
  if (key === "ArrowRight") c = Math.min(columnas - 1, c + 1);

  const tabla = document.getElementById("tabla-matriz");
  const filasDom = tabla.querySelectorAll("tbody tr");
  const filaTr = filasDom[r];
  if (!filaTr) return;
  const mfs = filaTr.querySelectorAll("td math-field");
  const mf = mfs[c];
  if (mf) mf.focus();
}

// leerTabla: leemos los inputs ocultos "celda-real"
function leerTabla() {
  const tabla = document.getElementById("tabla-matriz");
  const filas = tabla.querySelectorAll("tbody tr").length;
  const columnas =
    tabla.querySelectorAll("thead tr th").length - 2; // quita cabecera filas + b
  const datos = [];

  tabla.querySelectorAll("tbody tr").forEach((tr) => {
    const vals = [];
    tr.querySelectorAll("td").forEach((td) => {
      const hidden = td.querySelector("input.celda-real");
      const v = hidden ? hidden.value.trim() : "";
      vals.push(v || "0");
    });
    datos.push(vals);
  });

  return { filas, columnas, datos };
}

// ========= mostrar pasos / resultado =========

function mostrarPasos(pasos) {
  const cont = document.getElementById("contenedor-pasos");
  cont.innerHTML = "";

  pasos.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "card-paso";
    const titulo = document.createElement("div");
    titulo.innerHTML = `<span class="badge">Paso ${
      i + 1
    }</span> <span class="ml-2 font-medium">${p.descripcion}</span>`;
    card.appendChild(titulo);

    const wrap = document.createElement("div");
    wrap.className =
      "overflow-auto mt-3 rounded-lg border border-slate-200";
    const tabla = document.createElement("table");
    tabla.className = "matrix-table w-full";

    const filas = p.matriz.length;
    const cols = p.matriz[0].length;
    const thead = document.createElement("thead");
    const thr = document.createElement("tr");
    thr.appendChild(document.createElement("th")).textContent = "";
    for (let c = 0; c < cols - 1; c++) {
      const th = document.createElement("th");
      th.textContent = "x" + (c + 1);
      thr.appendChild(th);
    }
    thr.appendChild(document.createElement("th")).textContent = "b";
    thead.appendChild(thr);
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let r = 0; r < filas; r++) {
      const tr = document.createElement("tr");
      const rh = document.createElement("th");
      rh.textContent = String(r + 1);
      tr.appendChild(rh);
      for (let c = 0; c < cols; c++) {
        const td = document.createElement("td");
        td.textContent = p.matriz[r][c];
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tabla.appendChild(tbody);
    wrap.appendChild(tabla);
    card.appendChild(wrap);
    cont.appendChild(card);
  });

  document.getElementById("zona-pasos").classList.remove("hidden");
}

// Render de líneas xk=... (Gauss simple)
function renderLineas(lineas) {
  const ul = document.getElementById("final-sol");
  if (!ul) return;
  ul.innerHTML = "";
  (lineas || []).forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    ul.appendChild(li);
  });
}

function setMsg(t) {
  const m = document.getElementById("msg");
  if (m) m.textContent = t || "";
}

// ========= Teclado blanco -> LaTeX en el math-field activo =========

document.addEventListener("click", (e) => {
  const keyBtn = e.target.closest(".key");
  if (keyBtn) {
    if (!ultimaCeldaActiva) return;
    let ins = keyBtn.getAttribute("data-ins") || "";

    switch (ins) {
      // Paréntesis y operaciones básicas tal cual
      case "(":
      case ")":
      case "+":
      case "-":
      case "*":
      case "/":
        break;

      // x² -> exponente vacío
      case "x^":
        ins = "^{\\placeholder{}}";
        break;

      // √ -> raíz como MathLive
      case "sqrt()":
        ins = "\\sqrt{\\placeholder{}}";
        break;

      // trig
      case "sin()":
        ins = "\\sin(";
        break;
      case "cos()":
        ins = "\\cos(";
        break;
      case "tan()":
        ins = "\\tan(";
        break;

      case "pi":
        ins = "\\pi";
        break;

      // a/b
      case "frac(, )":
        ins = "\\frac{}{}";
        break;

      default:
        break;
    }

    ins = ins.replace(/\\\\/g, "\\");

    const mf = ultimaCeldaActiva;
    mf.focus();
    if (typeof mf.insert === "function") {
      mf.insert(ins, { format: "latex" });
    } else {
      mf.value = (mf.value || "") + ins;
    }
    syncCeldaDesdeMathfield(mf);
  }
});

// ========= DOMContentLoaded =========

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ gauss_simple.js cargado correctamente");

  const btnCrear = document.getElementById("btn-crear");
  if (!btnCrear) {
    console.error("❌ No se encontró el botón #btn-crear");
    return;
  }

  // Crear matriz
  btnCrear.addEventListener("click", () => {
    const filas = parseInt(
      document.getElementById("inp-filas").value,
      10
    );
    const cols = parseInt(
      document.getElementById("inp-columnas").value,
      10
    );

    if (!filas || !cols || filas <= 0 || cols <= 0) {
      alert("Ingresa números válidos para filas e incógnitas.");
      return;
    }

    crearTabla(filas, cols);
    document.getElementById("zona-pasos").classList.add("hidden");
    document.getElementById("zona-final").classList.add("hidden");
    ultimoResultado = null;
  });

  // botón sistema → matriz
  const btnSistema = document.getElementById("btn-sistema-a-matriz");
  if (btnSistema) {
    btnSistema.addEventListener("click", async () => {
      const sistemaEl = document.getElementById("txt-sistema");
      const varsEl = document.getElementById("inp-variables-sistema");
      const sistema = (sistemaEl && sistemaEl.value) || "";
      const variables = (varsEl && varsEl.value) || "";
      const modo_precision =
        document.getElementById("sel-precision").value;
      const decimales =
        parseInt(
          document.getElementById("inp-decimales").value,
          10
        ) || 6;

      if (!sistema.trim()) {
        alert("Escribe al menos una ecuación en el sistema.");
        return;
      }

      setMsg("Interpretando sistema...");

      try {
        const resp = await fetch("/matrices/gauss/sistema_matriz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sistema,
            variables,
            modo_precision,
            decimales,
          }),
        });

        const js = await resp.json();
        if (!js.ok) {
          throw new Error(js.error || "Error al interpretar el sistema.");
        }

        // Actualizar inputs de filas/columnas
        document.getElementById("inp-filas").value = js.filas;
        document.getElementById("inp-columnas").value = js.columnas;

        // Crear tabla y rellenarla
        crearTabla(js.filas, js.columnas);
        const tabla = document.getElementById("tabla-matriz");
        const filasDom = tabla.querySelectorAll("tbody tr");
        for (let r = 0; r < js.filas; r++) {
          const tds = filasDom[r].querySelectorAll("td");
          for (let c = 0; c < tds.length; c++) {
            const td = tds[c];
            const mf = td.querySelector("math-field");
            const hidden = td.querySelector("input.celda-real");
            const valor =
              (js.matriz[r] && js.matriz[r][c]) !== undefined
                ? js.matriz[r][c]
                : "";
            if (hidden) hidden.value = valor;
            if (mf) {
              mf.value = valor === "0" ? "" : valor;
            }
          }
        }

        document
          .getElementById("zona-pasos")
          .classList.add("hidden");
        document
          .getElementById("zona-final")
          .classList.add("hidden");
        ultimoResultado = null;

        setMsg("Matriz cargada desde el sistema.");
      } catch (err) {
        setMsg("");
        alert("Error: " + err.message);
      }
    });
  }

  const btnResolver = document.getElementById("btn-resolver-gauss");
  if (btnResolver) {
    btnResolver.addEventListener("click", async () => {
      const tabla = document.getElementById("tabla-matriz");
      if (!tabla) {
        alert("Primero crea o carga la matriz.");
        return;
      }

      const { datos } = leerTabla();

      const modo_precision =
        document.getElementById("sel-precision").value;
      const decimales =
        parseInt(
          document.getElementById("inp-decimales").value,
          10
        ) || 6;

      try {
        setMsg("Calculando...");
        const resp = await fetch("/matrices/gauss/resolver_simple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabla: datos,
            modo_precision,
            decimales,
          }),
        });

        const js = await resp.json();
        if (!js.ok) throw new Error(js.error || "Error desconocido");

        mostrarPasos(js.pasos);
        document.getElementById("final-desc").textContent =
          js.final?.descripcion || "Triangularización completada.";
        document
          .getElementById("zona-final")
          .classList.remove("hidden");
        setMsg("Listo.");
        ultimoResultado = js;
        try {
          renderLineas(
            js.final && js.final.lineas ? js.final.lineas : []
          );
        } catch (_) {}
      } catch (err) {
        setMsg("");
        alert("Error: " + err.message);
      }
    });
  }

  const btnPDF = document.getElementById("btn-pdf-gauss");
  if (btnPDF) {
    btnPDF.addEventListener("click", async () => {
      if (!ultimoResultado) {
        alert("Primero resuelve la matriz.");
        return;
      }
      try {
        const resp = await fetch("/matrices/gauss/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: "Método de Gauss (eliminación hacia adelante)",
            pasos: ultimoResultado.pasos,
            final: ultimoResultado.final,
          }),
        });
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gauss_simple_pasos.pdf";
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert("No se pudo generar el PDF: " + err.message);
      }
    });
  }
});
