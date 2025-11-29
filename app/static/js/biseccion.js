// app/static/js/newton_mathlive.js
(function () {
  const mathfield = document.getElementById("funcion_mf");
  const realInput = document.getElementById("funcion_real");   // Python
  const latexInput = document.getElementById("funcion_latex"); // LaTeX crudo

  // si no hay mathfield, no hacemos nada (otra página)
  if (!mathfield) return;

  // 1. LaTeX -> "pretty" (sen, tg, √, π, etc.)
  function latexToPretty(latex) {
    if (!latex) return "";
    let s = latex;

    // limpiar \left, \right, espacios, \( \), $$ $$
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

  // 2. Pretty -> Python/Sympy
  function translateToReal(pretty) {
    let real = pretty || "";

    // trig en español -> Python
    real = real.replace(/asen/gi, "asin");
    real = real.replace(/acos/gi, "acos");
    real = real.replace(/atan/gi, "atan");
    real = real.replace(/sen/gi, "sin");
    real = real.replace(/tg/gi, "tan");
    real = real.replace(/cos/gi, "cos");

    // logs
    real = real.replace(/\bln\(/gi, "log(");
    real = real.replace(/log10\(/gi, "log10(");
    real = real.replace(/log₁₀\(/gi, "log10(");
    real = real.replace(/log_([0-9A-Za-z]+)\s*\(\s*([^)]+)\s*\)/g, "log($2, $1)");

    // raíz
    real = real.replace(/√\(/g, "sqrt(");
    real = real.replace(/√([A-Za-z0-9]+)/g, "sqrt($1)");

    // pi
    real = real.replace(/π/g, "pi");

    // operaciones
    real = real.replace(/×/g, "*").replace(/·/g, "*").replace(/÷/g, "/");

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

  // 3. Sincronizar MathLive -> hidden inputs
  function syncFromMathfield() {
    const latex = mathfield.value || "";

    if (latexInput) latexInput.value = latex;

    const pretty = latexToPretty(latex);
    const real = translateToReal(pretty);

    if (realInput) realInput.value = real;
  }

  // sincronizar al inicio
  syncFromMathfield();
  mathfield.addEventListener("input", syncFromMathfield);

  // 4. Botones del teclado -> insertar LaTeX
  document.querySelectorAll("[data-insert]").forEach((btn) => {
    btn.addEventListener("click", () => {
      let ins = btn.dataset.insert || "";
      if (!mathfield) return;

      // caso especial: potencia -> exponente con placeholder
      if (ins === "^") {
        ins = "^{\\placeholder{}}";
      }

      // normalizar dobles backslash del HTML
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

  // 5. Forzar sync al enviar el formulario
  const form = mathfield.closest("form");
  if (form) {
    form.addEventListener("submit", () => {
      syncFromMathfield();
    });
  }

  // 6. Personalizar menú contextual de MathLive
  function setupMenu() {
    const menuItems = mathfield.menuItems;
    if (!Array.isArray(menuItems) || menuItems.length === 0) return;

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

  if (mathfield.menuItems && mathfield.menuItems.length > 0) {
    setupMenu();
  }

  mathfield.addEventListener("mount", setupMenu);

  const observer = new MutationObserver(() => {
    if (mathfield.menuItems && mathfield.menuItems.length > 0) {
      setupMenu();
      observer.disconnect();
    }
  });

  observer.observe(mathfield, { attributes: true, childList: true, subtree: true });
})();
