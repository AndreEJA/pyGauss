// app/static/js/traspuesta.js

let ultimaCeldaActiva = null; // math-field activo

// ========= LaTeX -> "pretty" =========
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

  // al backend le mandamos la forma “bonita”
  hidden.value = pretty;
}

// ========= creación de tabla con math-field en cada celda =========
function crearTabla(filas, columnas, idTabla) {
  const tabla = document.getElementById(idTabla);
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

      // input oculto con el texto que se manda a Python
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.className = "celda-real";
      const realId = `${idTabla}-r${r}-c${c}`;
      hidden.id = realId;

      mf.dataset.realId = realId;
      mf.dataset.fila = String(r);
      mf.dataset.col = String(c);
      mf.dataset.tablaId = idTabla;

      mf.addEventListener("focus", () => {
        ultimaCeldaActiva = mf;
      });

      mf.addEventListener("input", () => {
        syncCeldaDesdeMathfield(mf);
      });

      // navegación con flechas
      mf.addEventListener("keydown", (e) => {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          const fila = parseInt(mf.dataset.fila, 10);
          const col = parseInt(mf.dataset.col, 10);
          moverFoco(idTabla, { r: fila, c: col }, e.key);
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

// leer tabla desde inputs ocultos
function leerTabla(idTabla) {
  const tabla = document.getElementById(idTabla);
  if (!tabla) return [];
  const filasDom = [...tabla.querySelectorAll("tbody tr")];
  return filasDom.map((tr) =>
    [...tr.querySelectorAll("td")].map((td) => {
      const hidden = td.querySelector("input.celda-real");
      const v = hidden ? hidden.value.trim() : "";
      return v || "0";
    })
  );
}

// mover foco en la tabla
function moverFoco(idTabla, pos, key) {
  const tabla = document.getElementById(idTabla);
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

// render de la matriz resultado (texto plano)
function renderMatrix(M, tableId) {
  const tabla = document.getElementById(tableId);
  tabla.innerHTML = "";
  const tbody = document.createElement("tbody");

  for (const fila of M) {
    const tr = document.createElement("tr");
    for (const celda of fila) {
      const td = document.createElement("td");
      td.className = "celda";
      const div = document.createElement("div");
      div.textContent = celda;
      td.appendChild(div);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  tabla.appendChild(tbody);
}

document.addEventListener("DOMContentLoaded", () => {
  const btnCrear = document.getElementById("btn-crear");
  const btnResolver = document.getElementById("btn-resolver");
  const msg = document.getElementById("msg");

  if (btnCrear) {
    btnCrear.addEventListener("click", () => {
      const m = parseInt(document.getElementById("inp-filas").value, 10);
      const n = parseInt(
        document.getElementById("inp-columnas").value,
        10
      );

      if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1) {
        alert("Dimensiones inválidas.");
        return;
      }

      crearTabla(m, n, "tabla-A");
      document.getElementById("zona-matriz").classList.remove("hidden");
    });
  }

  if (btnResolver) {
    btnResolver.addEventListener("click", async () => {
      const matriz = leerTabla("tabla-A");
      if (msg) msg.textContent = "Calculando...";

      try {
        const resp = await fetch(
          "/matrices/operaciones/traspuesta/resolver",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matriz_str: matriz }),
          }
        );

        const js = await resp.json();

        if (js.ok) {
          renderMatrix(js.resultado, "tabla-resultado");
          document
            .getElementById("zona-resultado")
            .classList.remove("hidden");
        } else {
          alert(js.error || "Error");
        }
      } catch (e) {
        alert(e.message);
      }

      if (msg) msg.textContent = "";
    });
  }

  // ========== TECLADO BLANCO -> LaTeX en la celda activa ==========
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".key");
    if (!btn) return;
    if (!ultimaCeldaActiva) return;

    let ins = btn.dataset.ins || btn.dataset.insert || btn.textContent.trim();
    if (!ins) return;

    // normalizar a comandos LaTeX como en Gauss / operaciones
    switch (ins) {
      case "(":
      case ")":
      case "+":
      case "-":
      case "*":
      case "/":
        // se insertan tal cual
        break;

      case "x^":
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

      case "e":
        // se puede dejar como 'e' tal cual
        ins = "e";
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
});
