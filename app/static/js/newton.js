// app/static/js/newton_mathlive.js
// Versión para Newton-Raphson usando MathLive (<math-field>)

(function () {
  const mathfield = document.getElementById("funcion_mf");
  const realInput = document.getElementById("funcion_real");   // sintaxis Python
  const latexInput = document.getElementById("funcion_latex"); // LaTeX que viaja al backend

  // Si no estamos en la página de Newton, salimos
  if (!mathfield || !realInput) {
    return;
  }

  // ================= 1. LaTeX (MathLive) -> "pretty" =================
  function latexToPretty(latex) {
    if (!latex) return "";

    let s = latex;

    // quitar espacios LaTeX tipo "\ "
    s = s.replace(/\\ /g, " ");

    // quitar \left y \right (son solo visuales)
    s = s.replace(/\\left/g, "");
    s = s.replace(/\\right/g, "");

    // fracciones: \frac{a}{b} -> (a)/(b)
    s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");

    // raíz: \sqrt{expr} -> √(expr)
    s = s.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");

    // pi: \pi -> π
    s = s.replace(/\\pi/g, "π");

    // valor absoluto: \left|x\right| -> |x|
    s = s.replace(/\\left\|/g, "|");
    s = s.replace(/\\right\|/g, "|");

    // potencias con llaves: x^{2} -> x^2
    s = s.replace(/([A-Za-z0-9\)\]])\^\{([^}]*)\}/g, "$1^$2");

    // quitar llaves sueltas
    s = s.replace(/[{}]/g, "");

    // trig y logs LaTeX -> tu notación “bonita”
    s = s.replace(/\\sin/g, "sen");
    s = s.replace(/\\cos/g, "cos");
    s = s.replace(/\\tan/g, "tg");
    s = s.replace(/\\arcsin/g, "asen");
    s = s.replace(/\\arccos/g, "acos");
    s = s.replace(/\\arctan/g, "atan");

    s = s.replace(/\\ln/g, "ln");
    s = s.replace(/\\log_?\{?10\}?/g, "log10"); // \log_{10} -> log10

    // por si viniera envuelto en \( ... \) o $...$
    s = s.replace(/\\\(/g, "");
    s = s.replace(/\\\)/g, "");
    s = s.replace(/\$\$/g, "");
    s = s.replace(/\$/g, "");

    return s.trim();
  }

  // ================= 2. "pretty" -> Python =================
  function translateToReal(pretty) {
    let real = pretty || "";

    // trig en español -> funciones Python/Sympy
    real = real.replace(/asen/gi, "asin");
    real = real.replace(/acos/gi, "acos");
    real = real.replace(/atan/gi, "atan");
    real = real.replace(/sen/gi, "sin");
    real = real.replace(/tg/gi, "tan");
    real = real.replace(/cos/gi, "cos");

    // logaritmos
    real = real.replace(/\bln\(/gi, "log(");
    real = real.replace(/log10\(/gi, "log10(");
    real = real.replace(/log₁₀\(/gi, "log10(");
    // log_b(x) -> log(x, b)
    real = real.replace(/log_([0-9A-Za-z]+)\s*\(\s*([^)]+)\s*\)/g, "log($2, $1)");

    // raíz
    real = real.replace(/√\(/g, "sqrt(");
    real = real.replace(/√([A-Za-z0-9]+)/g, "sqrt($1)");

    // pi
    real = real.replace(/π/g, "pi");

    // operaciones
    real = real.replace(/×/g, "*");
    real = real.replace(/·/g, "*");
    real = real.replace(/÷/g, "/");

    // potencias
    real = real.replace(/\^/g, "**");

    // valor absoluto |x|
    real = real.replace(/\|([^|]+)\|/g, "abs($1)");

    // multiplicación implícita: 2x, 3(x+1), etc.
    real = real.replace(
      /(^|[^0-9A-Za-z_.])(\d+(?:\.\d+)?)\s*([A-Za-z(])/g,
      "$1$2*$3"
    );
    real = real.replace(/(^|[^A-Za-z0-9_])([A-Za-z])\s*\(/g, "$1$2*(");
    real = real.replace(/\)\s*([A-Za-z])/g, ")*$1");
    real = real.replace(/\)\s*\(/g, ")*(");

    return real;
  }

  // ================= 3. Sincronizar MathLive -> inputs ocultos =================
  function syncFromMathfield() {
    const latex = mathfield.value || "";

    if (latexInput) {
      latexInput.value = latex;
    }

    const pretty = latexToPretty(latex);
    const real = translateToReal(pretty);

    realInput.value = real;
  }

  // Sincronizamos una vez al cargar (por si vienen valores del backend)
  syncFromMathfield();

  // Cada vez que se edita el mathfield
  mathfield.addEventListener("input", syncFromMathfield);

  // ================= 4. Botones del teclado -> MathLive =================
  document.querySelectorAll("[data-insert]").forEach((btn) => {
    btn.addEventListener("click", () => {
      let ins = btn.dataset.insert || "";
      if (!mathfield) return;

      // Normalizar dobles backslash del HTML (\\sin -> \sin)
      ins = ins.replace(/\\\\/g, "\\");

      mathfield.focus();

      if (typeof mathfield.insert === "function") {
        mathfield.insert(ins, { format: "latex" });
      } else {
        mathfield.value = (mathfield.value || "") + ins;
      }

      syncFromMathfield();
    });
  });

// ================= 5. Menú contextual (solo permitir ciertas opciones) =================
function setupMenu() {
  const menuItems = mathfield.menuItems;
  if (!Array.isArray(menuItems) || menuItems.length === 0) {
    return;
  }

  // IDs que NO queremos mostrar
  const removeIds = new Set([
    "insert-matrix",
    "mode",
    "ink-color",
    "background-color",
    "highlight-color",
    "color",
    "outline-color",
    "border-color",
  ]);

  const filtered = menuItems.filter((item) => {
    if (!item || !item.id) return true;
    return !removeIds.has(item.id);
  });

  if (filtered.length > 0) {
    mathfield.menuItems = filtered;
  }
}

// ---- EJECUTAR EN EL MOMENTO CORRECTO ----

// 1. Si ya está montado
if (mathfield.menuItems && mathfield.menuItems.length > 0) {
  setupMenu();
}

// 2. Si todavía no, esperar al "mount"
mathfield.addEventListener("mount", setupMenu);

// 3. POR SI ACASO: usar observer de mutación (solución definitiva 🔥)
const observer = new MutationObserver(() => {
  if (mathfield.menuItems && mathfield.menuItems.length > 0) {
    setupMenu();
    observer.disconnect();
  }
});

observer.observe(mathfield, { attributes: true, childList: true, subtree: true });


  // ================= 6. FORZAR sync al enviar el formulario =================
  const form = mathfield.closest("form");
  if (form) {
    form.addEventListener("submit", () => {
      // justo antes de que se mande la petición POST
      syncFromMathfield();
    });
  }
})();
