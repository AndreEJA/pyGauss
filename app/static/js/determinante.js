// app/static/js/determinante.js

let ultimaCeldaActiva = null; // math-field activo

// ========== LaTeX -> "pretty" ==========
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

  // logs básicos
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
  hidden.value = pretty || "0";
}

// ========= creación de tabla n×n con math-field en cada celda =========
function crearTablaCuadrada(n, idTabla) {
  const tabla = document.getElementById(idTabla);
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

      // input oculto que se manda a Python
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
  const filas = [...tabla.querySelectorAll("tbody tr")];
  return filas.map((tr) =>
    [...tr.querySelectorAll("td")].map((td) => {
      const hidden = td.querySelector("input.celda-real");
      const v = hidden ? hidden.value.trim() : "";
      return v || "0";
    })
  );
}

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

function setMsg(t) {
  document.getElementById("msg").textContent = t || "";
}

function showModal(message) {
  const modal = document.getElementById("app-modal");
  const txt = document.getElementById("modal-text");
  txt.textContent = message;
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);
}

function renderPasoDet(p, idx) {
  const wrap = document.createElement("div");
  wrap.className = "rounded-xl border border-slate-200 overflow-auto";

  const head = document.createElement("div");
  head.className =
    "px-3 py-2 text-slate-700 bg-slate-50 border-b border-slate-200 text-sm font-semibold";

  // Muestra la operación y el factor si aplica
  head.textContent = `Paso ${idx}: ${
    p.op.split(". det(A)")[0].split(". Factor")[0]
  }`;

  const body = document.createElement("div");
  body.className = "grid sm:grid-cols-2 gap-4 p-3 items-start";

  // Contenedor Matriz Izquierda
  const leftCont = document.createElement("div");
  leftCont.className = "space-y-2";
  const leftHead = document.createElement("h4");
  leftHead.className = "text-sm font-medium";
  leftHead.textContent = "Matriz";
  const left = document.createElement("table");
  left.className = "matrix-table w-full";

  // Contenedor Operación Derecha
  const rightCont = document.createElement("div");
  rightCont.className = "space-y-2";
  const rightHead = document.createElement("h4");
  rightHead.className = "text-sm font-medium";
  rightHead.textContent = "Operación / Factor";
  const right = document.createElement("table");
  right.className = "matrix-table w-full";

  // render matrices
  const render = (M, tbl) => {
    const tbody = document.createElement("tbody");
    M.forEach((fila) => {
      const tr = document.createElement("tr");
      fila.forEach((celda) => {
        const td = document.createElement("td");
        td.className = "celda";
        const div = document.createElement("div");
        div.textContent = celda;
        td.appendChild(div);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
  };

  render(p.matriz_izq, left);
  render(p.matriz_der, right);

  leftCont.appendChild(leftHead);
  leftCont.appendChild(left);
  rightCont.appendChild(rightHead);
  rightCont.appendChild(right);

  body.appendChild(leftCont);
  if (
    p.matriz_der &&
    p.matriz_der.length > 0 &&
    p.matriz_der[0].length > 0
  ) {
    body.appendChild(rightCont);
  }

  wrap.appendChild(head);
  wrap.appendChild(body);
  return wrap;
}

// ========= helpers numéricos simples para la parte teórica =========

function parseNumero(str) {
  if (str === null || str === undefined) return 0;
  const s = String(str).replace(",", ".").trim();
  if (s === "") return 0;
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Determinante normal por Gauss (ya existente) ----------
  document.getElementById("btn-crear").addEventListener("click", () => {
    const n = parseInt(document.getElementById("inp-orden").value, 10);
    if (!Number.isInteger(n) || n < 2) {
      showModal("n debe ser un entero ≥ 2");
      return;
    }
    crearTablaCuadrada(n, "tabla-A");
    document.getElementById("zona-matriz").classList.remove("hidden");
    document.getElementById("zona-pasos").classList.add("hidden");
    document.getElementById("zona-resultado").classList.add("hidden");
  });

  document.getElementById("btn-resolver").addEventListener("click", async () => {
    const matriz = leerTabla("tabla-A");
    const modo = document.getElementById("sel-modo").value;
    const decimales =
      parseInt(document.getElementById("inp-decimales").value, 10) || 6;
    setMsg("Calculando...");

    try {
      const resp = await fetch(
        "/matrices/operaciones/determinante/resolver",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matriz_str: matriz,
            modo_precision: modo,
            decimales,
          }),
        }
      );
      const js = await resp.json();

      if (js.ok) {
        document.getElementById("zona-pasos").classList.add("hidden");
        document.getElementById("zona-resultado").classList.add("hidden");

        // 1. Mostrar pasos (solo si hay más de 1 paso)
        if (js.pasos && js.pasos.length > 1) {
          const lista = document.getElementById("lista-pasos");
          lista.innerHTML = "";
          js.pasos.forEach((p, i) =>
            lista.appendChild(renderPasoDet(p, i + 1))
          );
          document.getElementById("zona-pasos").classList.remove("hidden");
        }

        // 2. Mostrar resultado
        document.getElementById("resultado-valor").textContent = js.det;
        document
          .getElementById("zona-resultado")
          .classList.remove("hidden");
        setMsg("Listo.");
      } else {
        setMsg("");
        showModal(js.error || "Error desconocido");
      }
    } catch (e) {
      setMsg("");
      showModal("Error al conectar con el servidor: " + e.message);
    }
  });

  /* ============================
        TECLADO con MathLive
     ============================ */

  document.addEventListener("click", (e) => {
    // acepta tanto .kbd como .key (como en los otros módulos)
    const btn = e.target.closest(".kbd, .key");
    if (!btn) return;
    if (!ultimaCeldaActiva) return;

    let ins =
      btn.getAttribute("data-ins") ||
      btn.getAttribute("data-insert") ||
      btn.textContent.trim();

    if (!ins) return;

    // Mapear a comandos LaTeX para que se vea bonito
    switch (ins) {
      case "(":
      case ")":
      case "+":
      case "−":
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

 /* ==========================================
   NUEVO 1: Propiedad det(kA) = k^n · det(A)
   ========================================== */

const btnDetkA = document.getElementById("btn-det-kA");
if (btnDetkA) {
  btnDetkA.addEventListener("click", () => {
    const n = parseInt(document.getElementById("inp-det-n").value, 10);
    const detA = parseNumero(document.getElementById("inp-detA").value);
    const k = parseNumero(document.getElementById("inp-k").value);

    if (!Number.isInteger(n) || n <= 0) {
      showModal("n debe ser un entero positivo (n ≥ 1).");
      return;
    }

    const kPotN = Math.pow(k, n);
    const detkA = detA * kPotN;

    // spans dentro de la tarjeta
    const card = document.getElementById("res-det-kA-card");
    const spanN = document.getElementById("res-det-n");
    const spanDetA = document.getElementById("res-det-detA");
    const spanK = document.getElementById("res-det-k");
    const spanKPow = document.getElementById("res-det-kpow");
    const spanFormula = document.getElementById("res-det-formula");
    const spanValor = document.getElementById("res-det-kA-valor");

    if (!card) return;

    // rellenar texto
    spanN.textContent = n.toString();
    spanDetA.textContent = detA.toString();
    spanK.textContent = k.toString();
    spanKPow.textContent = `${k}^${n} = ${kPotN}`;
    spanFormula.textContent = `${kPotN} · ${detA} = ${detkA}`;
    spanValor.textContent = detkA.toString();

    card.classList.remove("hidden");
  });
}


  /* ==========================================
     NUEVO 2: (A + B)^T para matrices 2×2
     ========================================== */

  const btnSumaTransp = document.getElementById("btn-suma-transp");
  if (btnSumaTransp) {
    btnSumaTransp.addEventListener("click", () => {
      // leemos A
      const a11 = parseNumero(document.getElementById("a11").value);
      const a12 = parseNumero(document.getElementById("a12").value);
      const a21 = parseNumero(document.getElementById("a21").value);
      const a22 = parseNumero(document.getElementById("a22").value);

      // leemos B
      const b11 = parseNumero(document.getElementById("b11").value);
      const b12 = parseNumero(document.getElementById("b12").value);
      const b21 = parseNumero(document.getElementById("b21").value);
      const b22 = parseNumero(document.getElementById("b22").value);

      // C = A + B
      const c11 = a11 + b11;
      const c12 = a12 + b12;
      const c21 = a21 + b21;
      const c22 = a22 + b22;

      // (A+B)^T: se intercambian filas por columnas
      const t11 = c11;
      const t12 = c21;
      const t21 = c12;
      const t22 = c22;

      // mostramos la matriz resultante
      const cont = document.getElementById("res-suma-transp");
      cont.innerHTML = `
        <p class="text-sm mb-2">
          Primero sumamos A + B y luego tomamos la transpuesta:
          <strong>(A + B)<sup>T</sup></strong>.
        </p>
        <div class="inline-block border border-slate-300 rounded-lg px-3 py-2 bg-white">
          <table class="matrix-table">
            <tbody>
              <tr>
                <td class="celda text-center px-3 py-1">${t11}</td>
                <td class="celda text-center px-3 py-1">${t12}</td>
              </tr>
              <tr>
                <td class="celda text-center px-3 py-1">${t21}</td>
                <td class="celda text-center px-3 py-1">${t22}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });
  }
});
