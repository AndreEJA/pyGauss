(function () {
    const prettyInput = document.getElementById("funcion_pretty");
    const realInput = document.getElementById("funcion_real");
    const displaySpan = document.getElementById("funcion_display");
  
    if (!prettyInput || !realInput) {
      return;
    }
  
    function translateToReal(pretty) {
      let real = pretty;
  
      real = real.replace(/sen/gi, "sin");
      real = real.replace(/tg/gi, "tan");
      real = real.replace(/asen/gi, "asin");
      real = real.replace(/acos/gi, "acos");
      real = real.replace(/atan/gi, "atan");
  
      real = real.replace(/\bln\(/gi, "log(");
      real = real.replace(/log10\(/gi, "log10(");
      real = real.replace(/log₁₀\(/gi, "log10(");
  
      real = real.replace(/√\(/g, "sqrt(");
      real = real.replace(/√([A-Za-z0-9]+)/g, "sqrt($1)");
  
      real = real.replace(/π/g, "pi");
  
      real = real.replace(/×/g, "*");
      real = real.replace(/·/g, "*");
      real = real.replace(/÷/g, "/");
  
      real = real.replace(/\^/g, "**");
  
      real = real.replace(/\|([^|]+)\|/g, "abs($1)");
  
      real = real.replace(
        /(^|[^0-9A-Za-z_.])(\d+(?:\.\d+)?)\s*([A-Za-z(])/g,
        "$1$2*$3"
      );
      real = real.replace(/(^|[^A-Za-z0-9_])([A-Za-z])\s*\(/g, "$1$2*(");
      real = real.replace(/\)\s*([A-Za-z])/g, ")*$1");
      real = real.replace(/\)\s*\(/g, ")*(");
  
      return real;
    }
  
    
    function prettyToLatex(pretty) {
      if (!pretty) return "";
  
      let tex = pretty.trim();
  
      tex = tex.replace(/\bsen\(/gi, "\\sin(");
      tex = tex.replace(/\btg\(/gi, "\\tan(");
      tex = tex.replace(/\btan\(/gi, "\\tan(");
      tex = tex.replace(/\bcos\(/gi, "\\cos(");
      tex = tex.replace(/\basen\(/gi, "\\arcsin(");
      tex = tex.replace(/\bacos\(/gi, "\\arccos(");
      tex = tex.replace(/\batan\(/gi, "\\arctan(");
  
      tex = tex.replace(/\bln\(/gi, "\\ln(");
      tex = tex.replace(/log10\(/gi, "\\log_{10}(");
      tex = tex.replace(/log_([0-9A-Za-z]+)\(/g, "\\log_{$1}(");
  
      tex = tex.replace(/√\(([^)]+)\)/g, "\\sqrt{$1}");
      tex = tex.replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}");
  
      tex = tex.replace(/π/g, "\\pi");
  
      tex = tex.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, "\\frac{$1}{$2}");
      tex = tex.replace(/(\d+)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}");
  
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
  
    document.querySelectorAll("[data-insert]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ins = btn.dataset.insert || "";
        if (!prettyInput) return;
        
        const start = prettyInput.selectionStart || prettyInput.value.length;
        const end = prettyInput.selectionEnd || start;
        const v = prettyInput.value;
        let toInsert = ins;
        let cursorPos = start + toInsert.length;

        if (ins.endsWith('(')) {
            toInsert = ins;
            cursorPos = start + toInsert.length;
        } else if (ins === '| |') {
            toInsert = '||';
            cursorPos = start + 1;
        }
        
        prettyInput.value = v.slice(0, start) + toInsert + v.slice(end);
        prettyInput.focus();
        prettyInput.setSelectionRange(cursorPos, cursorPos);
        
        syncRealAndDisplay();
      });
    });
  })();