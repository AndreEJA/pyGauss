// app/static/js/biseccion.js
// Controla el teclado matemático, la traducción pretty -> Python y pretty -> LaTeX

(function () {
    const prettyInput = document.getElementById("funcion_pretty");
    const realInput = document.getElementById("funcion_real");
    const displaySpan = document.getElementById("funcion_display");
    const latexInput = document.getElementById("funcion_latex");
  
    // Si la página no tiene estos elementos, no hacemos nada
    if (!prettyInput || !realInput) {
      return;
    }
  
    // --- Traducción de "bonito" -> expresión Python evaluable ---
    function translateToReal(pretty) {
      let real = pretty;
  
      // trigonométricas en español -> funciones de Python/Sympy
      real = real.replace(/sen/gi, "sin");
      real = real.replace(/tg/gi, "tan");
      real = real.replace(/asen/gi, "asin");
      real = real.replace(/acos/gi, "acos");
      real = real.replace(/atan/gi, "atan");
  
      // logaritmos
      real = real.replace(/\bln\(/gi, "log(");
      real = real.replace(/log10\(/gi, "log10(");
      real = real.replace(/log₁₀\(/gi, "log10(");
  
      // raíz
      real = real.replace(/√\(/g, "sqrt(");
      real = real.replace(/√([A-Za-z0-9]+)/g, "sqrt($1)");
  
      // pi
      real = real.replace(/π/g, "pi");
  
      // símbolos de operación
      real = real.replace(/×/g, "*");
      real = real.replace(/·/g, "*");
      real = real.replace(/÷/g, "/");
  
      // potencias ^ -> **
      real = real.replace(/\^/g, "**");
  
      // valor absoluto |x|
      real = real.replace(/\|([^|]+)\|/g, "abs($1)");
  
      // multiplicación implícita:
      // número pegado a variable o paréntesis: 2x, 3(x+1)
      real = real.replace(
        /(^|[^0-9A-Za-z_.])(\d+(?:\.\d+)?)\s*([A-Za-z(])/g,
        "$1$2*$3"
      );
      // función pegada a paréntesis: sin (x) -> sin*(x) (caso raro)
      real = real.replace(/(^|[^A-Za-z0-9_])([A-Za-z])\s*\(/g, "$1$2*(");
      // paréntesis pegados: )( ó )x
      real = real.replace(/\)\s*([A-Za-z])/g, ")*$1");
      real = real.replace(/\)\s*\(/g, ")*(");
  
      return real;
    }
  
    // --- Traducción "bonito" -> LaTeX para mostrar con MathJax ---
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
      tex = tex.replace(/log_([0-9A-Za-z]+)\(/g, "\\log_{$1}(");
  
      // raíz
      tex = tex.replace(/√\(([^)]+)\)/g, "\\sqrt{$1}");
      tex = tex.replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}");
  
      // pi
      tex = tex.replace(/π/g, "\\pi");
  
      // fracciones (a)/(b) y a/b simples
      tex = tex.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, "\\frac{$1}{$2}");
      tex = tex.replace(/(\d+)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}");
  
      // potencias: base^(exponente) y base^exp
      tex = tex.replace(
        /([A-Za-z0-9\)\]])\^\(([^)]+)\)/g,
        "$1^{ $2 }"
      );
      tex = tex.replace(
        /([A-Za-z0-9\)\]])\^(-?[A-Za-z0-9]+)/g,
        "$1^{ $2 }"
      );
  
      // valor absoluto |x|
      tex = tex.replace(/\|([^|]+)\|/g, "\\left| $1 \\right|");
  
      return tex;
    }
  
    // --- Sincroniza hidden "real", hidden LaTeX y vista previa ---
    function syncRealAndDisplay() {
      const pretty = prettyInput.value;
  
      // expresión real para Python
      realInput.value = translateToReal(pretty);
  
      // cuerpo LaTeX (sin los delimitadores \( \))
      const latexBody = prettyToLatex(pretty);
  
      if (latexInput) {
        latexInput.value = latexBody;
      }
  
      if (displaySpan) {
        if (!latexBody) {
          displaySpan.textContent = "";
          return;
        }
  
        const fullLatex = `\\( ${latexBody} \\)`;
        displaySpan.textContent = fullLatex;
  
        if (window.MathJax && window.MathJax.typesetPromise) {
          MathJax.typesetPromise([displaySpan]).catch((err) =>
            console.error("MathJax error:", err)
          );
        }
      }
    }
  
    // Mostrar lo que venga precargado desde el backend
    syncRealAndDisplay();
  
    // Cuando el usuario escribe o pega
    prettyInput.addEventListener("input", syncRealAndDisplay);
    prettyInput.addEventListener("paste", function () {
      setTimeout(syncRealAndDisplay, 0);
    });
  
    // --- Botones del teclado matemático ---
    document.querySelectorAll("[data-insert]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ins = btn.dataset.insert || "";
        if (!prettyInput) return;
  
        const start = prettyInput.selectionStart ?? prettyInput.value.length;
        const end = prettyInput.selectionEnd ?? start;
        const v = prettyInput.value;
  
        let toInsert = ins;
        let cursorPos = start + toInsert.length;
  
        // si es algo que termina en "(", dejamos el cursor dentro del paréntesis
        if (ins.endsWith("(")) {
          toInsert = ins;
          cursorPos = start + toInsert.length;
        } else if (ins === "| |") {
          // botón |x|
          toInsert = "||";
          cursorPos = start + 1; // dejamos el cursor entre las barras
        }
  
        prettyInput.value = v.slice(0, start) + toInsert + v.slice(end);
        prettyInput.focus();
        prettyInput.setSelectionRange(cursorPos, cursorPos);
  
        syncRealAndDisplay();
      });
    });
  })();
  