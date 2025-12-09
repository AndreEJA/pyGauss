// app/static/js/inversa.js

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

  // logs básicos (por si algún día los usas)
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

  // al backend le enviamos la forma “bonita”
  hidden.value = pretty;
}

// ========= creación de tabla n×n con math-field en cada celda =========
function crearTablaCuadrada(n, idTabla) {
  const tabla = document.getElementById(idTabla);
  if (!tabla) return;

  tabla.innerHTML = "";
  const tbody = document.createElement("tbody");

  for (let r = 0; r < n; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < n; c++) {
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
  const filas = [...tabla.querySelectorAll("tbody tr")];
  return filas.map((tr) =>
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

// =======================
// Resto: render de matrices y pasos (sin cambios visuales de contenido)
// =======================

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

function renderPaso(p, idx) {
  const wrap = document.createElement("div");
  wrap.className = "rounded-xl border border-slate-200 overflow-auto";

  const head = document.createElement("div");
  head.className =
    "px-3 py-2 text-slate-700 bg-slate-50 border-b border-slate-200 text-sm";
  head.textContent = `Paso ${idx}: ${p.op}`;

  const body = document.createElement("div");
  body.className = "grid sm:grid-cols-2 gap-4 p-3";

  const left = document.createElement("table");
  left.className = "matrix-table w-full";
  const right = document.createElement("table");
  right.className = "matrix-table w-full";

  const render = (M, tbl) => {
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
    tbl.appendChild(tbody);
  };

  render(p.matriz_izq, left);
  render(p.matriz_der, right);

  body.appendChild(left);
  body.appendChild(right);
  wrap.appendChild(head);
  wrap.appendChild(body);

  return wrap;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnCrear = document.getElementById("btn-crear");
  const btnResolver = document.getElementById("btn-resolver");
  const msg = document.getElementById("msg");

  if (btnCrear) {
    btnCrear.addEventListener("click", () => {
      const n = parseInt(document.getElementById("inp-orden").value, 10);
      if (!Number.isInteger(n) || n < 2) {
        alert("n debe ser un entero ≥ 2");
        return;
      }
      crearTablaCuadrada(n, "tabla-A");
      document.getElementById("zona-matriz").classList.remove("hidden");
    });
  }

  if (btnResolver) {
    btnResolver.addEventListener("click", async () => {
      const n = parseInt(document.getElementById("inp-orden").value, 10);
      const matriz = leerTabla("tabla-A");
      const modo = document.getElementById("sel-modo").value;
      const decimales =
        parseInt(document.getElementById("inp-decimales").value, 10) || 6;

      if (msg) msg.textContent = "Calculando...";

      try {
        const resp = await fetch("/matrices/operaciones/inversa/resolver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            n,
            matriz_str: matriz,
            modo_precision: modo,
            decimales,
          }),
        });

        const js = await resp.json();

        if (js.ok) {
          document.getElementById("zona-resultado").classList.add("hidden");
          document.getElementById("zona-pasos").classList.add("hidden");

          if (js.pasos && js.pasos.length) {
            const lista = document.getElementById("lista-pasos");
            lista.innerHTML = "";
            js.pasos.forEach((p, i) => lista.appendChild(renderPaso(p, i)));
            document
              .getElementById("zona-pasos")
              .classList.remove("hidden");
          }

          if (js.inversa) {
            renderMatrix(js.inversa, "tabla-resultado");
            document
              .getElementById("zona-resultado")
              .classList.remove("hidden");
          }

          if (js.mensaje) {
            alert(js.mensaje);
          }
        } else {
          alert(js.error || "Error");
        }
      } catch (e) {
        alert(e.message);
      }

      if (msg) msg.textContent = "";
    });
  }

  // ========== TECLADO -> inserta LaTeX en la celda activa ==========
  document.addEventListener("click", (e) => {
    // Acepta tanto .kbd como .key
    const btn = e.target.closest(".kbd, .key");
    if (!btn) return;
    if (!ultimaCeldaActiva) return;

    let ins =
      btn.getAttribute("data-ins") ||
      btn.getAttribute("data-insert") ||
      btn.textContent.trim();

    if (!ins) return;

    // Mapear a comandos LaTeX como en Newton / Gauss
    switch (ins) {
      case "(":
      case ")":
      case "+":
      case "-":
        // se insertan tal cual
        break;

      case "^":
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

      case "/":
        ins = "/";
        break;

      case "pi":
        ins = "\\pi";
        break;

      case "e":
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
