// app/static/js/traspuesta.js

let ultimaCeldaActiva = null; // math-field activo

// ========= LaTeX -> "pretty" =========
function latexToPretty(latex) {
  if (!latex) return "";
  let s = latex;

  s = s.replace(/\\placeholder\{[^}]*\}/g, "");
  s = s.replace(/\\ /g, " ");
  s = s.replace(/\\left/g, "").replace(/\\right/g, "");
  s = s.replace(/\\\(/g, "").replace(/\\\)/g, "");
  s = s.replace(/\$\$/g, "").replace(/\$/g, "");

  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");
  s = s.replace(/\\pi/g, "π");
  s = s.replace(/\\left\|/g, "|").replace(/\\right\|/g, "|");
  s = s.replace(/([A-Za-z0-9\)\]])\^\{([^}]*)\}/g, "$1^$2");
  s = s.replace(/[{}]/g, "");

  s = s.replace(/\\sin/g, "sen");
  s = s.replace(/\\cos/g, "cos");
  s = s.replace(/\\tan/g, "tg");
  s = s.replace(/\\arcsin/g, "asen");
  s = s.replace(/\\arccos/g, "acos");
  s = s.replace(/\\arctan/g, "atan");

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

      const mf = document.createElement("math-field");
      mf.setAttribute("math-virtual-keyboard-policy", "manual");
      mf.className = "celda-mf";

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

// render de una matriz en un <table> dado su id
function renderMatrix(M, tableId) {
  const tabla = document.getElementById(tableId);
  if (!tabla) return;
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

// helper numérico
function parseNumero(str) {
  if (str === null || str === undefined) return 0;
  const s = String(str).replace(",", ".").trim();
  if (s === "") return 0;
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================
     MENÚ PRINCIPAL: mostrar/ocultar módulos
     ========================================== */
  const secSimple = document.getElementById("sec-simple");
  const secSuma = document.getElementById("sec-suma");
  const secMul = document.getElementById("sec-mul");

  function mostrarSeccion(nombre) {
    if (secSimple) secSimple.classList.add("hidden");
    if (secSuma) secSuma.classList.add("hidden");
    if (secMul) secMul.classList.add("hidden");

    let target = null;
    if (nombre === "simple") target = secSimple;
    if (nombre === "suma") target = secSuma;
    if (nombre === "mul") target = secMul;

    if (target) {
      target.classList.remove("hidden");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const btnMenuSimple = document.getElementById("btn-menu-simple");
  const btnMenuSuma = document.getElementById("btn-menu-suma");
  const btnMenuMul = document.getElementById("btn-menu-mul");

  if (btnMenuSimple) {
    btnMenuSimple.addEventListener("click", () => mostrarSeccion("simple"));
  }
  if (btnMenuSuma) {
    btnMenuSuma.addEventListener("click", () => mostrarSeccion("suma"));
  }
  if (btnMenuMul) {
    btnMenuMul.addEventListener("click", () => mostrarSeccion("mul"));
  }

  // mostrar por defecto la traspuesta simple
  mostrarSeccion("simple");

  /* ==========================================
     1) TRASPUESTA SIMPLE A (m×n)
     ========================================== */
  const btnCrear = document.getElementById("btn-crear");
  const btnResolver = document.getElementById("btn-resolver");
  const msg = document.getElementById("msg");

  if (btnCrear) {
    btnCrear.addEventListener("click", () => {
      const m = parseInt(document.getElementById("inp-filas").value, 10);
      const n = parseInt(document.getElementById("inp-columnas").value, 10);

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
        const resp = await fetch("/matrices/operaciones/traspuesta/resolver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matriz_str: matriz }),
        });

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

    switch (ins) {
      case "(":
      case ")":
      case "+":
      case "-":
      case "*":
      case "/":
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
     2) (A + B)^T con tamaño variable m×n
     ========================================== */
  const btnCrearSuma = document.getElementById("btn-crear-suma");
  const zonaSuma = document.getElementById("zona-suma");

  if (btnCrearSuma && zonaSuma) {
    btnCrearSuma.addEventListener("click", () => {
      const m = parseInt(document.getElementById("sum_m").value, 10);
      const n = parseInt(document.getElementById("sum_n").value, 10);

      if (!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1) {
        alert("Dimensiones inválidas para A y B.");
        return;
      }

      crearTabla(m, n, "tabla-suma-A");
      crearTabla(m, n, "tabla-suma-B");
      zonaSuma.classList.remove("hidden");
    });
  }

  const btnResolverSuma = document.getElementById("btn-resolver-suma");
  const contSuma = document.getElementById("res-suma-transp");

  if (btnResolverSuma && contSuma) {
    btnResolverSuma.addEventListener("click", () => {
      const A = leerTabla("tabla-suma-A");
      const B = leerTabla("tabla-suma-B");

      if (!A.length || !B.length) {
        alert("Primero crea y llena las matrices A y B.");
        return;
      }

      const m = A.length;
      const n = A[0].length;

      const C = [];
      for (let i = 0; i < m; i++) {
        C[i] = [];
        for (let j = 0; j < n; j++) {
          C[i][j] = parseNumero(A[i][j]) + parseNumero(B[i][j]);
        }
      }

      const T = [];
      for (let j = 0; j < n; j++) {
        T[j] = [];
        for (let i = 0; i < m; i++) {
          T[j][i] = C[i][j];
        }
      }

      let html = `
        <p class="text-sm text-center mb-3">
          Primero sumamos <strong>A + B</strong> (m×n) y luego tomamos la transpuesta
          <strong>(A + B)<sup>T</sup></strong> (n×m).
        </p>
        <div class="inline-block rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <table class="matrix-table text-lg font-semibold">
            <tbody>
      `;

      for (let i = 0; i < T.length; i++) {
        html += "<tr>";
        for (let j = 0; j < T[0].length; j++) {
          html += `<td class="celda text-center px-4 py-2">${T[i][j]}</td>`;
        }
        html += "</tr>";
      }

      html += `
            </tbody>
          </table>
        </div>
      `;

      contSuma.innerHTML = html;
    });
  }

  /* ==========================================
     3) Multiplicación y transpuesta (AB)^T
        A: m×n, B: n×p
     ========================================== */
  const btnCrearMul = document.getElementById("btn-crear-mul");
  const zonaMul = document.getElementById("zona-mul");

  if (btnCrearMul && zonaMul) {
    btnCrearMul.addEventListener("click", () => {
      const m = parseInt(document.getElementById("mul_m").value, 10);
      const n = parseInt(document.getElementById("mul_n").value, 10);
      const p = parseInt(document.getElementById("mul_p").value, 10);

      if (
        !Number.isInteger(m) ||
        !Number.isInteger(n) ||
        !Number.isInteger(p) ||
        m < 1 ||
        n < 1 ||
        p < 1
      ) {
        alert("Dimensiones inválidas para A (m×n) y B (n×p).");
        return;
      }

      crearTabla(m, n, "tabla-mul-A");
      crearTabla(n, p, "tabla-mul-B");
      zonaMul.classList.remove("hidden");
    });
  }

  const btnResolverMul = document.getElementById("btn-resolver-mul");
  const contMul = document.getElementById("res-mul-transp");

  if (btnResolverMul && contMul) {
    btnResolverMul.addEventListener("click", () => {
      const A = leerTabla("tabla-mul-A");
      const B = leerTabla("tabla-mul-B");

      if (!A.length || !B.length) {
        alert("Primero crea y llena las matrices A y B.");
        return;
      }

      const m = A.length;
      const n = A[0].length;
      const nB = B.length;
      const p = B[0].length;

      if (n !== nB) {
        alert("Las dimensiones no son compatibles: A es m×n y B debe ser n×p.");
        return;
      }

      const AB = [];
      for (let i = 0; i < m; i++) {
        AB[i] = [];
        for (let j = 0; j < p; j++) {
          let sum = 0;
          for (let k = 0; k < n; k++) {
            sum += parseNumero(A[i][k]) * parseNumero(B[k][j]);
          }
          AB[i][j] = sum;
        }
      }

      const T = [];
      for (let j = 0; j < p; j++) {
        T[j] = [];
        for (let i = 0; i < m; i++) {
          T[j][i] = AB[i][j];
        }
      }

      let html = `
        <p class="text-sm text-center mb-3">
          Primero calculamos <strong>AB</strong> (m×p) como producto de A (m×n) por B (n×p),
          y luego tomamos la transpuesta <strong>(AB)<sup>T</sup></strong> (p×m).
        </p>
        <div class="inline-block rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <table class="matrix-table text-lg font-semibold">
            <tbody>
      `;

      for (let i = 0; i < T.length; i++) {
        html += "<tr>";
        for (let j = 0; j < T[0].length; j++) {
          html += `<td class="celda text-center px-4 py-2">${T[i][j]}</td>`;
        }
        html += "</tr>";
      }

      html += `
            </tbody>
          </table>
        </div>
      `;

      contMul.innerHTML = html;
    });
  }
});
