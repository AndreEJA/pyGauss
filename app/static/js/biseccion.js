// app/static/js/biseccion.js

(function () {
    const prettyInput = document.getElementById("funcion_pretty");
    const realInput   = document.getElementById("funcion_real");
    const latexInput  = document.getElementById("funcion_latex");
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
  
    // Decidir si vale la pena intentar renderizar con MathJax
    // (si la expresión está muy "incompleta", usamos texto plano)
    function shouldRenderWithMathJax(pretty) {
      if (!pretty) return false;
  
      const p = pretty.trim();
  
      // Si termina en ^, _, \ o "log_" => probablemente incompleto
      if (/[\\^_]$/.test(p)) return false;
      if (/log_$/.test(p)) return false;
  
      // Paréntesis desbalanceados: más '(' que ')'
      let balance = 0;
      for (const ch of p) {
        if (ch === "(") balance++;
        else if (ch === ")") balance--;
      }
      if (balance > 0) return false;
  
      return true;
    }
  
    // ==========================
    // 3. Sincronizar todo
    // ==========================
    function syncRealAndDisplay() {
      const pretty = prettyInput.value;
  
      // Para Python
      realInput.value = translateToReal(pretty);
  
      // Para LaTeX
      const latexBody = prettyToLatex(pretty);
      if (latexInput) {
        latexInput.value = latexBody;
      }
  
      if (!displaySpan) return;
  
      if (!latexBody) {
        displaySpan.textContent = "";
        return;
      }
  
      // Si la expresión aún está "abierta" o MathJax no está listo,
      // mostramos solo el texto plano y NO llamamos a MathJax
      if (!shouldRenderWithMathJax(pretty) ||
          !window.MathJax ||
          !MathJax.typesetPromise) {
        displaySpan.textContent = pretty;
        return;
      }
  
      // Aquí ya asumimos que es seguro renderizar con MathJax
      const fullLatex = `\\(${latexBody} \\)`;
      displaySpan.textContent = fullLatex;
  
      MathJax.typesetPromise([displaySpan]).catch((err) => {
        console.warn("MathJax error:", err);
        // Si por algo falla, caemos a texto plano
        displaySpan.textContent = pretty;
      });
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
      // ==========================
  // 4. Zoom de la gráfica
  // ==========================
  const graficaImg     = document.getElementById("grafica_img");
  const graficaWrapper = document.getElementById("grafica_wrapper");

  if (graficaImg && graficaWrapper) {
    let zoomLevel = 1;

    function aplicarZoom() {
      graficaImg.style.transform = `scale(${zoomLevel})`;
    }

    // Botones +, -, reset
    document.querySelectorAll("[data-zoom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const accion = btn.dataset.zoom;
        if (accion === "in") {
          zoomLevel *= 1.25;
        } else if (accion === "out") {
          zoomLevel /= 1.25;
        } else if (accion === "reset") {
          zoomLevel = 1;
        }

        // Limitar el zoom entre 0.5x y 8x para que no se vuelva loco
        if (zoomLevel < 0.5) zoomLevel = 0.5;
        if (zoomLevel > 8)   zoomLevel = 8;

        aplicarZoom();
      });
    });

    // Zoom con la rueda del mouse sobre la gráfica
    graficaWrapper.addEventListener("wheel", (e) => {
      // Ctrl+rueda suele usarse para zoom del navegador, mejor no interferir
      if (e.ctrlKey) return;

      e.preventDefault();
      if (e.deltaY < 0) {
        // scroll hacia arriba -> acercar
        zoomLevel *= 1.1;
      } else {
        // scroll hacia abajo -> alejar
        zoomLevel /= 1.1;
      }

      if (zoomLevel < 0.5) zoomLevel = 0.5;
      if (zoomLevel > 8)   zoomLevel = 8;

      aplicarZoom();
    });

    // valor inicial
    aplicarZoom();
  }

  })();
  