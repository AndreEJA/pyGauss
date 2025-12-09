// app/static/js/gauss.js

let lineasActuales = [];
let ultimaCeldaActiva = null;  // math-field activo
let ultimoResultado = null;

// ========= helpers para convertir LaTeX -> "pretty" (como Newton) =========

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

  // Guardamos "pretty" (√, sen, etc.). El backend lo convierte a Python.
  hidden.value = pretty;
}

// ========= creación de tabla con math-field en cada celda =========

function crearTabla(filas, columnas) {
  const tabla = document.getElementById("tabla-matriz");
  tabla.innerHTML = "";

  // cabecera
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

  // cuerpo con math-field
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

      // input oculto con el valor "real" que se manda al backend
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

      // navegación con flechas entre celdas
      mf.addEventListener("keydown", (e) => {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          moverFoco(
            { r, c },
            e.key,
            filas,
            columnas + 1 // incluye columna de b
          );
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
}

// ahora moverFoco busca math-field, no <input>
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

// leerTabla ahora lee los inputs ocultos "celda-real"
function leerTabla() {
  const tabla = document.getElementById("tabla-matriz");
  const filas = tabla.querySelectorAll("tbody tr").length;
  const columnas =
    tabla.querySelectorAll("thead tr th").length - 2; // -2: quita cabecera de filas y 'b'
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

// ========= resto de helpers de presentación =========

function crearTH(txt) {
  const th = document.createElement("th");
  th.textContent = txt;
  return th;
}

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
    wrap.className = "overflow-auto mt-3 rounded-lg";
    wrap.style.border = "1px solid var(--border)";
    const tabla = document.createElement("table");
    tabla.className = "matrix-table w-full";
    const filas = p.matriz.length,
      cols = p.matriz[0].length;
    const thead = document.createElement("thead");
    const thr = document.createElement("tr");
    thr.appendChild(crearTH(""));
    for (let c = 0; c < cols - 1; c++) {
      thr.appendChild(crearTH("x" + (c + 1)));
    }
    thr.appendChild(crearTH("b"));
    thead.appendChild(thr);
    tabla.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (let r = 0; r < filas; r++) {
      const tr = document.createElement("tr");
      const rh = document.createElement("th");
      rh.className = "row-head";
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

    if (p.col_pivote) {
      const pivotHeaderIdx = 1 + (p.col_pivote - 1);
      if (thr.children[pivotHeaderIdx])
        thr.children[pivotHeaderIdx].classList.add("pivot");
      const rows = tbody.querySelectorAll("tr");
      rows.forEach((tr) => {
        const tds = tr.querySelectorAll("td");
        const idxBody = p.col_pivote - 1;
        if (tds[idxBody]) tds[idxBody].classList.add("pivot");
      });
    }

    wrap.appendChild(tabla);
    card.appendChild(wrap);
    cont.appendChild(card);
  });
  document.getElementById("zona-pasos").classList.remove("hidden");
}

function mostrarFinal(final) {
  const z = document.getElementById("zona-final");
  const desc = document.getElementById("final-desc");
  const ul = document.getElementById("final-sol");
  desc.textContent = final.descripcion || "";
  ul.innerHTML = "";
  if (final.pivotes && final.pivotes.length) {
    const li = document.createElement("li");
    li.className = "sol-item";
    li.textContent =
      `Columnas pivote: ` + final.pivotes.map((p) => "x" + p).join(", ");
    ul.appendChild(li);
  }
  if (final.variables_libres && final.variables_libres.length) {
    const li = document.createElement("li");
    li.className = "sol-item";
    li.textContent =
      `Variables libres: ` + final.variables_libres.join(", ");
    ul.appendChild(li);
  }
  if (final.solucion) {
    Object.entries(final.solucion).forEach(([k, v]) => {
      const li = document.createElement("li");
      li.className = "sol-item";
      li.textContent = `${k}: ${v}`;
      ul.appendChild(li);
    });
  }
  z.classList.remove("hidden");
  const zia = document.getElementById("zona-ia");
  if (zia) zia.classList.remove("hidden");
}

function setMsg(t) {
  document.getElementById("msg").textContent = t || "";
}

function rellenar(tipo) {
  const tabla = document.getElementById("tabla-matriz");
  if (!tabla || tabla.querySelectorAll("tbody tr").length === 0) return;
  const filas = tabla.querySelectorAll("tbody tr").length;
  const cols = tabla.querySelectorAll("thead tr th").length - 1;
  const n = cols - 1;
  const cuadrada = filas === n;
  function setCell(r, c, val) {
    const tr = tabla.querySelectorAll("tbody tr")[r];
    const td = tr.querySelectorAll("td")[c];
    const mf = td.querySelector("math-field");
    const hidden = td.querySelector("input.celda-real");
    if (mf) {
      mf.value = val === "0" ? "" : val;
    }
    if (hidden) {
      hidden.value = val;
    }
  }
  if (tipo === "nula") {
    for (let r = 0; r < filas; r++) {
      for (let c = 0; c < n + 1; c++) {
        setCell(r, c, "0");
      }
    }
    return;
  }
  if (!cuadrada) {
    showModal(
      "Esta opción requiere que la parte de coeficientes sea cuadrada."
    );
    return;
  }
  if (tipo === "identidad") {
    for (let r = 0; r < filas; r++) {
      for (let c = 0; c < n; c++) {
        setCell(r, c, r === c ? "1" : "0");
      }
      setCell(r, n, "0");
    }
  } else if (tipo === "tsup") {
    for (let r = 0; r < filas; r++) {
      for (let c = 0; c < n; c++) {
        setCell(r, c, c >= r ? "1" : "0");
      }
      setCell(r, n, "0");
    }
  } else if (tipo === "tinf") {
    for (let r = 0; r < filas; r++) {
      for (let c = 0; c < n; c++) {
        setCell(r, c, c <= r ? "1" : "0");
      }
      setCell(r, n, "0");
    }
  }
}

// ========= teclado blanco: inserta LaTeX en el math-field activo =========

document.addEventListener("click", (e) => {
  const keyBtn = e.target.closest(".key");
  if (keyBtn) {
    if (!ultimaCeldaActiva) return;
    let ins = keyBtn.getAttribute("data-ins") || "";

    // traducimos data-ins a LaTeX para MathLive
    switch (ins) {
      case "(":
      case ")":
      case "+":
      case "-":
      case "*":
      case "/":
        // se usan tal cual
        break;

      case "x^":
        // crea un exponente vacío, como en Newton
        ins = "^{\\placeholder{}}";
        break;

      case "sqrt()":
        ins = "\\sqrt{\\placeholder{}}";
        break;

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

      case "frac(, )":
        ins = "\\frac{}{}";
        break;

      default:
        // otros quedan igual
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

  const fillBtn = e.target.closest(".fill-btn");
  if (fillBtn) {
    rellenar(fillBtn.getAttribute("data-fill"));
  }
});

// ========= DOMContentLoaded: eventos de botones principales =========

document.addEventListener("DOMContentLoaded", () => {
  // Botón clásico: crear matriz manualmente
  document.getElementById("btn-crear").addEventListener("click", () => {
    const filas = parseInt(document.getElementById("inp-filas").value, 10);
    const cols = parseInt(document.getElementById("inp-columnas").value, 10);
    if (!filas || !cols || filas <= 0 || cols <= 0) {
      showModal("Ingresa números válidos para filas e incógnitas.");
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
      const modo_precision = document.getElementById("sel-precision").value;
      const decimales =
        parseInt(document.getElementById("inp-decimales").value, 10) || 6;

      if (!sistema.trim()) {
        showModal("Escribe al menos una ecuación en el sistema.");
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
              // para no complicarnos con LaTeX, mostramos el valor como texto simple
              mf.value = valor === "0" ? "" : valor;
            }
          }
        }

        document.getElementById("zona-pasos").classList.add("hidden");
        document.getElementById("zona-final").classList.add("hidden");
        ultimoResultado = null;
        lineasActuales = [];
        setMsg("Matriz cargada desde el sistema.");
      } catch (err) {
        setMsg("");
        showModal("Error: " + err.message);
      }
    });
  }

  // Botón resolver
  document.getElementById("btn-resolver").addEventListener("click", async () => {
    setMsg("Calculando...");
    const { filas, columnas, datos } = leerTabla();
    const modo_precision = document.getElementById("sel-precision").value;
    const decimales =
      parseInt(document.getElementById("inp-decimales").value, 10) || 6;
    try {
      const resp = await fetch("/matrices/gauss/resolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filas,
          columnas,
          tabla: datos,
          modo_precision,
          decimales,
        }),
      });
      const js = await resp.json();
      if (!js.ok) throw new Error(js.error || "Error");
      mostrarPasos(js.pasos);
      mostrarFinal(js.final);
      setMsg("Listo.");
      ultimoResultado = js;
      lineasActuales = (js.final && js.final.lineas) || [];
    } catch (err) {
      setMsg("");
      showModal("Error: " + err.message);
    }
  });

  // Botón PDF
  document.getElementById("btn-pdf").addEventListener("click", async () => {
    if (!ultimoResultado) {
      showModal("Primero resuelve la matriz.");
      return;
    }
    try {
      const resp = await fetch("/matrices/gauss/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: "Método de Gauss-Jordan",
          pasos: ultimoResultado.pasos,
          final: ultimoResultado.final,
        }),
      });
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gauss_pasos.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showModal("No se pudo generar el PDF: " + err.message);
    }
  });
});

// --- IA opcional ---
const btnIA = document.getElementById("btn-ia");
if (btnIA) {
  btnIA.addEventListener("click", async () => {
    const ctx = (document.getElementById("ia-contexto") || {}).value || "";
    const out = document.getElementById("ia-out");
    const msg = document.getElementById("ia-msg");
    if (msg) msg.textContent = "Consultando IA...";
    out && out.classList.add("hidden");
    out && (out.textContent = "");
    try {
      const r = await fetch("/matrices/gauss/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contexto: ctx, lineas: lineasActuales }),
      });
      const js = await r.json();
      if (js.ok) {
        out && (out.textContent = js.texto || "(sin respuesta)");
        out && out.classList.remove("hidden");
        if (msg) msg.textContent = "Listo.";
      } else {
        alert(js.error || "Error en IA");
        if (msg) msg.textContent = "";
      }
    } catch (e) {
      alert("Error al consultar IA: " + e.message);
      if (msg) msg.textContent = "";
    }
  });
}
