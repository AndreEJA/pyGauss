(function () {
  const prettyInput = document.getElementById("funcion_pretty");
  const realInput = document.getElementById("funcion_real");
  const displaySpan = document.getElementById("funcion_display");

  if (!prettyInput || !realInput) {
    return;
  }

  // ================== TRADUCCIÓN A PYTHON ==================
  function translateToReal(pretty) {
    let real = pretty;

    // trig en español -> Python
    real = real.replace(/sen/gi, "sin");
    real = real.replace(/tg/gi, "tan");
    real = real.replace(/asen/gi, "asin");
    real = real.replace(/acos/gi, "acos");
    real = real.replace(/atan/gi, "atan");

    // logs
    real = real.replace(/\bln\(/gi, "log(");
    real = real.replace(/log10\(/gi, "log10(");
    real = real.replace(/log₁₀\(/gi, "log10(");
    // log_b(x) -> log(x, b)
    real = real.replace(
      /log_([0-9A-Za-z]+)\s*\(\s*([^)]+)\s*\)/g,
      "log($2, $1)"
    );

    // raíz
    real = real.replace(/√\(/g, "sqrt(");
    real = real.replace(/√([A-Za-z0-9]+)/g, "sqrt($1)");

    // constantes
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

  // ================== TRADUCCIÓN A LaTeX ==================
  function prettyToLatex(pretty) {
    if (!pretty) return "";

    let tex = pretty.trim();

    // trig
    tex = tex.replace(/\bsen\(/gi, "\\sin(");
    tex = tex.replace(/\btg\(/gi, "\\tan(");
    tex = tex.replace(/\btan\(/gi, "\\tan(");
    tex = tex.replace(/\bcos\(/gi, "\\cos(");
    tex = tex.replace(/\basen\(/gi, "\\arcsin(");
    tex = tex.replace(/\bacos\(/gi, "\\arccos(");
    tex = tex.replace(/\batan\(/gi, "\\arctan(");

    // logs
    tex = tex.replace(/\bln\(/gi, "\\ln(");
    tex = tex.replace(/log10\(/gi, "\\log_{10}(");
    tex = tex.replace(/log₁₀\(/gi, "\\log_{10}(");
    // log_b( -> \log_{b}(
    tex = tex.replace(/log_([0-9A-Za-z]+)\s*\(/g, "\\log_{$1}(");

    // raíz
    tex = tex.replace(/√\(([^)]+)\)/g, "\\sqrt{$1}");
    tex = tex.replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}");

    // constantes
    tex = tex.replace(/π/g, "\\pi");

    // fracciones
    tex = tex.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, "\\frac{$1}{$2}");
    tex = tex.replace(/(\d+)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}");

    // potencias
    tex = tex.replace(
      /([A-Za-z0-9\)\]])\^\(([^)]+)\)/g,
      "$1^{ $2 }"
    );
    tex = tex.replace(
      /([A-Za-z0-9\)\]])\^(-?[A-Za-z0-9]+)/g,
      "$1^{ $2 }"
    );

    return tex;
  }

  // ================== SINCRONIZAR INPUTS ==================
  function syncRealAndDisplay() {
    const pretty = prettyInput.value;
    realInput.value = translateToReal(pretty);

    if (displaySpan) {
      const latexBody = prettyToLatex(pretty);

      if (!latexBody) {
        displaySpan.textContent = "";
        return;
      }

      const fullLatex = `\\(${latexBody} \\)`;
      displaySpan.textContent = fullLatex;

      if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([displaySpan]).catch((err) =>
          console.error("MathJax error:", err)
        );
      }
    }
  }

  syncRealAndDisplay();

  prettyInput.addEventListener("input", syncRealAndDisplay);
  prettyInput.addEventListener("paste", function () {
    setTimeout(syncRealAndDisplay, 0);
  });

  // ================== TECLADO ==================
  document.querySelectorAll("[data-insert]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const ins = btn.dataset.insert || "";
      if (!prettyInput) return;

      const start = prettyInput.selectionStart || prettyInput.value.length;
      const end = prettyInput.selectionEnd || start;
      const v = prettyInput.value;

      let toInsert = ins;
      let cursorPos = start + toInsert.length;

      // botones que terminan en "(" → dejar cursor dentro
      if (ins.endsWith("(")) {
        toInsert = ins;
        cursorPos = start + toInsert.length;
      } else if (ins === "| |") {
        // botón para |x|
        toInsert = "||";
        cursorPos = start + 1;
      }

      prettyInput.value = v.slice(0, start) + toInsert + v.slice(end);
      prettyInput.focus();
      prettyInput.setSelectionRange(cursorPos, cursorPos);

      syncRealAndDisplay();
    });
  });
})();