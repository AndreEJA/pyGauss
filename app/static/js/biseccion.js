// app/static/js/biseccion.js

(function () {
    const prettyInput = document.getElementById("funcion_pretty");
    const realInput = document.getElementById("funcion_real");
  
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
      real = real.replace(/√([a-zA-Z0-9]+)/g, "sqrt($1)");
  
      // pi
      real = real.replace(/π/g, "pi");
  
      // multiplicación y división explícitas
      real = real.replace(/×/g, "*");
      real = real.replace(/·/g, "*");
      real = real.replace(/÷/g, "/");
  
      // potencia ^ -> **
      real = real.replace(/\^/g, "**");
  
      // valor absoluto |x|
      real = real.replace(/\|([^|]+)\|/g, "abs($1)");
  
      // ----- IMPLÍCITO -> EXPLÍCITO -----
      // número (con o sin decimales) seguido de variable o función o paréntesis:  2x, 0.5x, 3sin(x), 2(x+1)
      real = real.replace(
        /(^|[^0-9A-Za-z_.])(\d+(?:\.\d+)?)\s*([A-Za-z(])/g,
        "$1$2*$3"
      );
  
      // variable seguida de paréntesis: x(x+1) -> x*(x+1)
      real = real.replace(/([A-Za-z])\s*\(/g, "$1*(");
  
      // paréntesis seguido de variable: (x+1)x -> (x+1)*x
      real = real.replace(/\)\s*([A-Za-z])/g, ")*$1");
  
      // paréntesis seguido de paréntesis: )( -> )*(
      real = real.replace(/\)\s*\(/g, ")*(");
  
      return real;
    }
  
    function syncReal() {
      realInput.value = translateToReal(prettyInput.value);
    }
  
    // Inicializar
    syncReal();
  
    // Escribir / pegar
    prettyInput.addEventListener("input", syncReal);
    prettyInput.addEventListener("paste", function () {
      setTimeout(syncReal, 0);
    });
  
    // Botones del teclado
    document.querySelectorAll("[data-insert]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.insert || "";
        prettyInput.value += text;
        syncReal();
        prettyInput.focus();
      });
    });
  })();
  