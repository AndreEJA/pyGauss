// app/static/js/biseccion.js

(function () {
    const prettyInput = document.getElementById("funcion_pretty");
    const realInput = document.getElementById("funcion_real");
    const displaySpan = document.getElementById("funcion_display");
  
    if (!prettyInput || !realInput) {
      return; // por si se carga en otra página
    }
  
    function translateToReal(pretty) {
      let real = pretty;
  
      // trig en español -> Python
      real = real.replace(/sen/gi, "sin");
      real = real.replace(/tg/gi, "tan");
  
      // logs
      real = real.replace(/\bln\(/gi, "log(");
      real = real.replace(/log10\(/gi, "log10(");
      real = real.replace(/log₁₀\(/gi, "log10(");
  
      // raíz: √(x) o √x
      real = real.replace(/√\(/g, "sqrt(");
      real = real.replace(/√([A-Za-z0-9]+)/g, "sqrt($1)");
  
      // pi
      real = real.replace(/π/g, "pi");
  
      // multiplicación y división
      real = real.replace(/×/g, "*");
      real = real.replace(/·/g, "*");
      real = real.replace(/÷/g, "/");
  
      // potencia ^ -> **
      real = real.replace(/\^/g, "**");
  
      // valor absoluto |x|
      real = real.replace(/\|([^|]+)\|/g, "abs($1)");
  
      // ----- IMPLÍCITO -> EXPLÍCITO -----
      // número seguido de variable/función/paréntesis: 2x, 0.5x, 3sin(x), 2(x+1)
      real = real.replace(
        /(^|[^0-9A-Za-z_.])(\d+(?:\.\d+)?)\s*([A-Za-z(])/g,
        "$1$2*$3"
      );
  
      // variable de UNA letra seguida de paréntesis: a(x+1) -> a*(x+1)
      // (no rompe cos(x), sen(x), log(x), etc.)
      real = real.replace(/(^|[^A-Za-z0-9_])([A-Za-z])\s*\(/g, "$1$2*(");
  
      // paréntesis seguido de variable/función: (x+1)x -> (x+1)*x, (x+1)cos(x) -> (x+1)*cos(x)
      real = real.replace(/\)\s*([A-Za-z])/g, ")*$1");
  
      // paréntesis seguido de paréntesis: )( -> )*(
      real = real.replace(/\)\s*\(/g, ")*(");
  
      return real;
    }
  
    
    function prettyToLatex(pretty) {
      if (!pretty) return "";
  
      let tex = pretty.trim();
  
      // --- trigonométricas ---
      tex = tex.replace(/\bsen\(/gi, "\\sin(");
      tex = tex.replace(/\btg\(/gi, "\\tan(");
      tex = tex.replace(/\btan\(/gi, "\\tan(");
      tex = tex.replace(/\bcos\(/gi, "\\cos(");
  
      // --- logaritmos ---
      tex = tex.replace(/\bln\(/gi, "\\ln(");
      tex = tex.replace(/log10\(/gi, "\\log_{10}(");
      tex = tex.replace(/log_([0-9A-Za-z]+)\(/g, "\\log_{$1}(");
  
      // --- raíz cuadrada ---
      tex = tex.replace(/√\(([^)]+)\)/g, "\\sqrt{$1}");
      tex = tex.replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}");
  
      // --- pi ---
      tex = tex.replace(/π/g, "\\pi");
  
      // --- fracciones sencillas ---
      tex = tex.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, "\\frac{$1}{$2}");
      tex = tex.replace(/(\d+)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}");
  
      // --- potencias ---
      // 1) base^(expresión entre paréntesis): e^(-x), x^(1/2), a^(n+1)
      tex = tex.replace(
        /([A-Za-z0-9\)\]])\^\(([^)]+)\)/g,
        "$1^{ $2 }"
      );
      // 2) base^exponente simple: x^4, a^n, 2^k
      tex = tex.replace(
        /([A-Za-z0-9\)\]])\^(-?[A-Za-z0-9]+)/g,
        "$1^{ $2 }"
      );
  
      return tex;
    }
  
    // ==========================
    // 3. Sincronizar todo
    // ==========================
    function syncRealAndDisplay() {
      const pretty = prettyInput.value;
      // Para Python
      realInput.value = translateToReal(pretty);
  
      // Para la vista con MathJax
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
  
    // Inicializar
    syncRealAndDisplay();
  
    // Escribir / pegar
    prettyInput.addEventListener("input", syncRealAndDisplay);
    prettyInput.addEventListener("paste", function () {
      setTimeout(syncRealAndDisplay, 0);
    });
  
    // Botones del teclado
    document.querySelectorAll("[data-insert]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.insert || "";
        prettyInput.value += text;
        syncRealAndDisplay();
        prettyInput.focus();
      });
    });
  })();
  