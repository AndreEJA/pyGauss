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
      td.appendChild(input);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  tabla.appendChild(tbody);
  document.getElementById("zona-tabla").classList.remove("hidden");

  console.log(`✅ Matriz creada con ${filas} filas y ${columnas} columnas.`);
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
    wrap.className = "overflow-auto mt-3 rounded-lg border border-slate-200";
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

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ gauss_simple.js cargado correctamente");

  const btnCrear = document.getElementById("btn-crear");
  if (!btnCrear) {
    console.error("❌ No se encontró el botón #btn-crear");
    return;
  }

  btnCrear.addEventListener("click", () => {
    const filas = parseInt(document.getElementById("inp-filas").value, 10);
    const cols = parseInt(document.getElementById("inp-columnas").value, 10);

    if (!filas || !cols || filas <= 0 || cols <= 0) {
      alert("Ingresa números válidos para filas e incógnitas.");
      return;
    }

    crearTabla(filas, cols);
    document.getElementById("zona-pasos").classList.add("hidden");
    document.getElementById("zona-final").classList.add("hidden");
    ultimoResultado = null;
  });

  const btnResolver = document.getElementById("btn-resolver-gauss");
  if (btnResolver) {
    btnResolver.addEventListener("click", async () => {
      const tabla = document.getElementById("tabla-matriz");
      const datos = [];
      tabla.querySelectorAll("tbody tr").forEach((tr) => {
        const fila = [];
        tr.querySelectorAll("td input").forEach((inp) => fila.push(inp.value.trim()));
        datos.push(fila);
      });

      const modo_precision = document.getElementById("sel-precision").value;
      const decimales = parseInt(document.getElementById("inp-decimales").value, 10) || 6;

      try {
        document.getElementById("msg").textContent = "Calculando...";
        const resp = await fetch("/matrices/gauss/resolver_simple", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabla: datos, modo_precision, decimales }),
        });

        const js = await resp.json();
        if (!js.ok) throw new Error(js.error || "Error desconocido");

        mostrarPasos(js.pasos);
        document.getElementById("final-desc").textContent =
          js.final?.descripcion || "Triangularización completada.";
        document.getElementById("zona-final").classList.remove("hidden");
        document.getElementById("msg").textContent = "Listo.";
        ultimoResultado = js;
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
