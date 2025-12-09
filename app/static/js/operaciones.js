// app/static/js/operaciones.js

let ultimaCeldaActiva = null; // math-field activo

// ========= helpers LaTeX -> "pretty" =========

function latexToPretty(latex) {
  if (!latex) return "";
  let s = latex;

  // limpiar placeholders, \left, \right, espacios, \( \), $$ $$
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

  // mandamos al backend la forma "bonita" (√, sen, ^, etc.)
  hidden.value = pretty;
}

// ========= creación de tabla con math-field en cada celda =========

function crearTabla(filas, columnas, tablaId) {
  const tabla = document.getElementById(tablaId);
  if (!tabla) return;

  tabla.innerHTML = "";
  const tbody = document.createElement("tbody");

  for (let r = 0; r < filas; r++) {
    const tr = document.createElement("tr");

    for (let c = 0; c < columnas; c++) {
      const td = document.createElement("td");
      td.className = "celda";

      // math-field visible
      const mf = document.createElement("math-field");
      mf.setAttribute("math-virtual-keyboard-policy", "manual");
      mf.className = "celda-mf";

      // input hidden donde guardamos el texto que va a Python
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.className = "celda-real";
      const realId = `${tablaId}-r${r}-c${c}`;
      hidden.id = realId;

      mf.dataset.realId = realId;
      mf.dataset.fila = String(r);
      mf.dataset.col = String(c);
      mf.dataset.tablaId = tablaId;

      mf.addEventListener("focus", () => {
        ultimaCeldaActiva = mf;
      });

      mf.addEventListener("input", () => {
        syncCeldaDesdeMathfield(mf);
      });

      // Navegación con flechas dentro de la MISMA tabla
      mf.addEventListener("keydown", (e) => {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          const fila = parseInt(mf.dataset.fila, 10);
          const col = parseInt(mf.dataset.col, 10);
          moverFoco(tablaId, { r: fila, c: col }, e.key);
        }
      });

      td.appendChild(mf);
      td.appendChild(hidden);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  tabla.appendChild(tbody);
}

// leerTabla usando los inputs ocultos
function leerTabla(tablaId) {
  const tabla = document.getElementById(tablaId);
  const datos = [];
  if (!tabla) return datos;

  tabla.querySelectorAll("tbody tr").forEach((tr) => {
    const vals = [];
    tr.querySelectorAll("td").forEach((td) => {
      const hidden = td.querySelector("input.celda-real");
      const v = hidden ? hidden.value.trim() : "";
      vals.push(v || "0");
    });
    datos.push(vals);
  });
  return datos;
}

// mover foco dentro de una tabla
function moverFoco(tablaId, pos, key) {
  const tabla = document.getElementById(tablaId);
  if (!tabla) return;
  const filasDom = tabla.querySelectorAll("tbody tr");
  const filas = filasDom.length;
  const columnas = filasDom[0]
    ? filasDom[0].querySelectorAll("td math-field").length
    : 0;

  let { r, c } = pos;
  if (key === "ArrowUp") r = Math.max(0, r - 1);
  if (key === "ArrowDown") r = Math.min(filas - 1, r + 1);
  if (key === "ArrowLeft") c = Math.max(0, c - 1);
  if (key === "ArrowRight") c = Math.min(columnas - 1, c + 1);

  const filaTr = filasDom[r];
  if (!filaTr) return;
  const mfs = filaTr.querySelectorAll("td math-field");
  const mf = mfs[c];
  if (mf) mf.focus();
}

// ========= render resultado =========

function mostrarResultado(resultado) {
  const z = document.getElementById("zona-resultado");
  const tabla = document.getElementById("tabla-resultado");
  tabla.innerHTML = "";
  const tbody = document.createElement("tbody");
  resultado.forEach((fila) => {
    const tr = document.createElement("tr");
    fila.forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tabla.appendChild(tbody);
  z.classList.remove("hidden");
}

function setMsg(t) {
  const m = document.getElementById("msg");
  if (m) m.textContent = t || "";
}

function showModal(message) {
  const modal = document.getElementById("app-modal");
  const txt = document.getElementById("modal-text");
  if (!modal || !txt) {
    alert(message);
    return;
  }
  txt.textContent = message;
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);
}

// ========= Teclado blanco -> LaTeX en la celda activa =========

document.addEventListener("click", (e) => {
  const keyBtn = e.target.closest(".key");
  if (!keyBtn) return;
  if (!ultimaCeldaActiva) return;

  let ins = keyBtn.getAttribute("data-ins") || "";

  switch (ins) {
    // básicos tal cual
    case "(":
    case ")":
    case "+":
    case "-":
    case "*":
    case "/":
      break;

    // x² -> exponente bonito
    case "x^":
      ins = "^{\\placeholder{}}";
      break;

    // raíz
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

    // pi
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
});

// ========= lógica principal =========

document.addEventListener("DOMContentLoaded", () => {
  const btnCrear = document.getElementById("btn-crear");
  if (!btnCrear) return;

  btnCrear.addEventListener("click", () => {
    const filas1 = parseInt(
      document.getElementById("inp-filas1").value,
      10
    );
    const cols1 = parseInt(
      document.getElementById("inp-columnas1").value,
      10
    );
    const filas2 = parseInt(
      document.getElementById("inp-filas2").value,
      10
    );
    const cols2 = parseInt(
      document.getElementById("inp-columnas2").value,
      10
    );

    const operacion =
      document.getElementById("btn-crear").getAttribute("data-operacion");

    if (operacion === "sumar") {
      if (filas1 !== filas2 || cols1 !== cols2) {
        showModal(
          "Error: Las matrices deben tener las mismas dimensiones para poder sumarse."
        );
        return;
      }
    }

    if (operacion === "multiplicar") {
      if (cols1 !== filas2) {
        showModal(
          "Error: El número de columnas de la primera matriz debe ser igual al número de filas de la segunda para la multiplicación."
        );
        return;
      }
    }

    if (!filas1 || !cols1 || filas1 <= 0 || cols1 <= 0 || !cols2 || cols2 <= 0) {
      showModal("Ingresa números válidos para las dimensiones.");
      return;
    }

    // Matriz x Vector(es)
    if (operacion === "matriz_por_vector") {
      const entradasPorVector = cols1;
      crearTabla(filas1, cols1, "tabla-matriz1");
      crearTabla(entradasPorVector, cols2, "tabla-matriz2");
    } else {
      crearTabla(filas1, cols1, "tabla-matriz1");
      crearTabla(filas2, cols2, "tabla-matriz2");
    }

    document.getElementById("zona-matrices").classList.remove("hidden");
    document.getElementById("zona-resultado").classList.add("hidden");
    setMsg("");
  });

  // vínculo visual columnas1 -> filas2 (si quieres mantenerlo)
  const inpColumnas1 = document.getElementById("inp-columnas1");
  const valorFilas2 = document.getElementById("valor-filas2");
  if (inpColumnas1 && valorFilas2) {
    inpColumnas1.addEventListener("input", () => {
      valorFilas2.textContent = inpColumnas1.value;
    });
    valorFilas2.textContent = inpColumnas1.value;
  }

  // Resolver
  document
    .getElementById("btn-resolver")
    .addEventListener("click", async () => {
      const operacion =
        document.getElementById("btn-crear").getAttribute("data-operacion");
      setMsg("Calculando...");

      const matriz1_str = leerTabla("tabla-matriz1");
      const matriz2_str = leerTabla("tabla-matriz2");
      const modo_precision =
        document.getElementById("sel-precision").value;
      const decimales =
        parseInt(
          document.getElementById("inp-decimales").value,
          10
        ) || 6;

      try {
        const resp = await fetch("/matrices/operaciones/operar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matriz1: matriz1_str,
            matriz2: matriz2_str,
            operacion,
            modo_precision,
            decimales,
          }),
        });
        const js = await resp.json();
        if (!js.ok) throw new Error(js.error || "Error");

        mostrarResultado(js.resultado);
        setMsg("Listo.");
      } catch (err) {
        setMsg("");
        showModal("Error: " + err.message);
      }
    });
});
