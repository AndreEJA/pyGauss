let ultimaCeldaActiva = null;
let ultimoResultado = null;

function crearTabla(filas, columnas) {
  const tabla = document.getElementById("tabla-matriz");
  if (!tabla) {
    console.error("❌ No se encontró la tabla #tabla-matriz");
    return;
  }

  tabla.innerHTML = "";

  // Crear encabezado
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");

  const headV = document.createElement("th");
  headV.className = "row-head";
  headV.textContent = "";
  trh.appendChild(headV);

  for (let c = 0; c < columnas; c++) {
    const th = document.createElement("th");
    th.textContent = "x" + (c + 1);
    trh.appendChild(th);
  }

  const thb = document.createElement("th");
  thb.textContent = "b";
  trh.appendChild(thb);

  thead.appendChild(trh);
  tabla.appendChild(thead);

  // Crear cuerpo
  const tbody = document.createElement("tbody");
  for (let r = 0; r < filas; r++) {
    const tr = document.createElement("tr");

    const rh = document.createElement("th");
    rh.className = "row-head";
    rh.textContent = String(r + 1);
    tr.appendChild(rh);

    for (let c = 0; c < columnas + 1; c++) {
      const td = document.createElement("td");
      td.className = "celda";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "0";
      input.addEventListener("focus", () => (ultimaCeldaActiva = input));
      // Navegación con flechas entre celdas
      input.addEventListener("keydown", (e) => {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          moverFoco({ r, c }, e.key, filas, columnas + 1);
        }
      });

      td.appendChild(input);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  tabla.appendChild(tbody);
  document.getElementById("zona-tabla").classList.remove("hidden");

  console.log(`✅ Matriz creada con ${filas} filas y ${columnas} columnas.`);
}

function moverFoco(pos, key, filas, columnas) {
  let { r, c } = pos;
  if (key === "ArrowUp") r = Math.max(0, r - 1);
  if (key === "ArrowDown") r = Math.min(filas - 1, r + 1);
  if (key === "ArrowLeft") c = Math.max(0, c - 1);
  if (key === "ArrowRight") c = Math.min(columnas - 1, c + 1);
  const tabla = document.getElementById("tabla-matriz");
  const inp = tabla
    .querySelectorAll("tbody tr")
    [r].querySelectorAll("td input")[c];
  if (inp) inp.focus();
}

function mostrarPasos(pasos) {
  const cont = document.getElementById("contenedor-pasos");
  cont.innerHTML = "";

  pasos.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "card-paso";
    const titulo = document.createElement("div");
    titulo.innerHTML = `<span class="badge">Paso ${i + 1}</span> <span class="ml-2 font-medium">${p.descripcion}</span>`;
    card.appendChild(titulo);

    const wrap = document.createElement("div");
    wrap.className =
      "overflow-auto mt-3 rounded-lg border border-slate-200";
    const tabla = document.createElement("table");
    tabla.className = "matrix-table w-full";

    const filas = p.matriz.length;
    const cols = p.matriz[0].length;
    const thead = document.createElement("thead");
    const thr = document.createElement("tr");
    thr.appendChild(document.createElement("th")).textContent = "";
    for (let c = 0; c < cols - 1; c++) {
      const th = document.createElement("th");
      th.textContent = "x" + (c + 1);
      thr.appendChild(th);
    }
    thr.appendChild(document.createElement("th")).textContent = "b";
    thead.appendChild(thr);
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let r = 0; r < filas; r++) {
      const tr = document.createElement("tr");
      const rh = document.createElement("th");
      rh.textContent = String(r + 1);
      tr.appendChild(rh);
      for (let c = 0; c < cols; c++) {
        const td = document.createElement("td");
        td.textContent = p.matriz[r][c];
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tabla.appendChild(tbody);
    wrap.appendChild(tabla);
    card.appendChild(wrap);
    cont.appendChild(card);
  });

  document.getElementById("zona-pasos").classList.remove("hidden");
}

// --- Render de líneas xk=... (Gauss simple) ---
function renderLineas(lineas) {
  const ul = document.getElementById("final-sol");
  if (!ul) return;
  ul.innerHTML = "";
  (lineas || []).forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    ul.appendChild(li);
  });
}

// --- Manejo del teclado de botones (keypad) ---
document.addEventListener("click", (e) => {
  if (e.target.matches(".key")) {
    const ins = e.target.getAttribute("data-ins");
    if (ultimaCeldaActiva) {
      const start =
        ultimaCeldaActiva.selectionStart ||
        ultimaCeldaActiva.value.length;
      const end =
        ultimaCeldaActiva.selectionEnd || start;
      const v = ultimaCeldaActiva.value;
      let toInsert = ins;
      let cursorPos = start + toInsert.length;

      if (ins.endsWith("()")) {
        toInsert = ins.slice(0, -2);
        cursorPos = start + toInsert.length + 1;
      }

      // Lógica para el botón 'x²' (potenciación)
      if (ins === "x^") {
        toInsert = "^";
        cursorPos = start + 1;
      }

      ultimaCeldaActiva.value =
        v.slice(0, start) + toInsert + v.slice(end);
      ultimaCeldaActiva.focus();
      ultimaCeldaActiva.setSelectionRange(cursorPos, cursorPos);
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ gauss_simple.js cargado correctamente");

  const btnCrear = document.getElementById("btn-crear");
  if (!btnCrear) {
    console.error("❌ No se encontró el botón #btn-crear");
    return;
  }

  // Crear matriz manualmente
  btnCrear.addEventListener("click", () => {
    const filas = parseInt(
      document.getElementById("inp-filas").value,
      10
    );
    const cols = parseInt(
      document.getElementById("inp-columnas").value,
      10
    );

    if (!filas || !cols || filas <= 0 || cols <= 0) {
      alert("Ingresa números válidos para filas e incógnitas.");
      return;
    }

    crearTabla(filas, cols);
    document.getElementById("zona-pasos").classList.add("hidden");
    document.getElementById("zona-final").classList.add("hidden");
    ultimoResultado = null;
  });

  // ✅ NUEVO: botón para convertir sistema → matriz y llenar la tabla
  const btnSistema = document.getElementById("btn-sistema-a-matriz");
  if (btnSistema) {
    btnSistema.addEventListener("click", async () => {
      const sistemaEl = document.getElementById("txt-sistema");
      const varsEl = document.getElementById("inp-variables-sistema");
      const sistema = (sistemaEl && sistemaEl.value) || "";
      const variables = (varsEl && varsEl.value) || "";
      const modo_precision =
        document.getElementById("sel-precision").value;
      const decimales =
        parseInt(
          document.getElementById("inp-decimales").value,
          10
        ) || 6;

      if (!sistema.trim()) {
        alert("Escribe al menos una ecuación en el sistema.");
        return;
      }

      const msgEl = document.getElementById("msg");
      if (msgEl) msgEl.textContent = "Interpretando sistema...";

      try {
        const resp = await fetch("/matrices/gauss/sistema_matriz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sistema,
            variables,
            modo_precision,
            decimales,
          }),
        });

        const js = await resp.json();
        if (!js.ok) {
          throw new Error(js.error || "Error al interpretar el sistema.");
        }

        // Actualizar inputs de filas/columnas
        document.getElementById("inp-filas").value = js.filas;
        document.getElementById("inp-columnas").value = js.columnas;

        // Crear tabla y rellenarla con la matriz regresada
        crearTabla(js.filas, js.columnas);
        const tabla = document.getElementById("tabla-matriz");
        const filasDom = tabla.querySelectorAll("tbody tr");
        for (let r = 0; r < js.filas; r++) {
          const inputs = filasDom[r].querySelectorAll("td input");
          for (let c = 0; c < inputs.length; c++) {
            inputs[c].value =
              (js.matriz[r] && js.matriz[r][c]) !== undefined
                ? js.matriz[r][c]
                : "";
          }
        }

        // Ocultar pasos y resultado anteriores
        document
          .getElementById("zona-pasos")
          .classList.add("hidden");
        document
          .getElementById("zona-final")
          .classList.add("hidden");
        ultimoResultado = null;

        if (msgEl) msgEl.textContent = "Matriz cargada desde el sistema.";
      } catch (err) {
        if (msgEl) msgEl.textContent = "";
        alert("Error: " + err.message);
      }
    });
  }

  const btnResolver = document.getElementById("btn-resolver-gauss");
  if (btnResolver) {
    btnResolver.addEventListener("click", async () => {
      const tabla = document.getElementById("tabla-matriz");
      if (!tabla) {
        alert("Primero crea o carga la matriz.");
        return;
      }

      const datos = [];
      tabla.querySelectorAll("tbody tr").forEach((tr) => {
        const fila = [];
        tr
          .querySelectorAll("td input")
          .forEach((inp) => fila.push(inp.value.trim()));
        datos.push(fila);
      });

      const modo_precision =
        document.getElementById("sel-precision").value;
      const decimales =
        parseInt(
          document.getElementById("inp-decimales").value,
          10
        ) || 6;

      try {
        document.getElementById("msg").textContent = "Calculando...";
        const resp = await fetch("/matrices/gauss/resolver_simple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabla: datos,
            modo_precision,
            decimales,
          }),
        });

        const js = await resp.json();
        if (!js.ok) throw new Error(js.error || "Error desconocido");

        mostrarPasos(js.pasos);
        document.getElementById("final-desc").textContent =
          js.final?.descripcion || "Triangularización completada.";
        document
          .getElementById("zona-final")
          .classList.remove("hidden");
        document.getElementById("msg").textContent = "Listo.";
        ultimoResultado = js;
        try {
          renderLineas(
            js.final && js.final.lineas ? js.final.lineas : []
          );
        } catch (_) {}
      } catch (err) {
        document.getElementById("msg").textContent = "";
        alert("Error: " + err.message);
      }
    });
  }

  const btnPDF = document.getElementById("btn-pdf-gauss");
  if (btnPDF) {
    btnPDF.addEventListener("click", async () => {
      if (!ultimoResultado) {
        alert("Primero resuelve la matriz.");
        return;
      }
      try {
        const resp = await fetch("/matrices/gauss/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: "Método de Gauss (eliminación hacia adelante)",
            pasos: ultimoResultado.pasos,
            final: ultimoResultado.final,
          }),
        });
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gauss_simple_pasos.pdf";
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert("No se pudo generar el PDF: " + err.message);
      }
    });
  }
});
