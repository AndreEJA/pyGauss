let ultimoResultado = null;

function crearCamposVectores(filas, columnas) {
  const cont = document.getElementById("contenedor-vectores");
  cont.innerHTML = "";

  // Contenedor tipo tabla (grid con columnas = vectores)
  const tabla = document.createElement("div");
  tabla.className = "flex gap-6 justify-start";

  for (let i = 0; i < filas; i++) {
    const col = document.createElement("div");
    col.className = "flex flex-col items-center bg-white border border-slate-200 rounded-xl p-3 shadow-md";

    const label = document.createElement("div");
    label.className = "font-semibold text-slate-900 mb-2";
    label.textContent = `v${i + 1}`;
    col.appendChild(label);

    for (let j = 0; j < columnas; j++) {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = "0";
      inp.className = "input w-20 text-center mb-2";
      col.appendChild(inp);
    }

    tabla.appendChild(col);
  }

  cont.appendChild(tabla);
  document.getElementById("zona-vectores").classList.remove("hidden");
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
    const colsSinB = cols - 1; // ocultamos la columna b

    const thead = document.createElement("thead");
    const thr = document.createElement("tr");
    thr.appendChild(document.createElement("th")).textContent = "";
    for (let c = 0; c < colsSinB; c++) {
      const th = document.createElement("th");
      th.textContent = "v" + (c + 1);
      thr.appendChild(th);
    }
    thead.appendChild(thr);
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let r = 0; r < filas; r++) {
      const tr = document.createElement("tr");
      const rh = document.createElement("th");
      rh.textContent = String(r + 1);
      tr.appendChild(rh);
      for (let c = 0; c < colsSinB; c++) {
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
  document.getElementById("btn-crear").addEventListener("click", () => {
    const filas = parseInt(document.getElementById("inp-filas").value, 10);
    const cols = parseInt(document.getElementById("inp-cols").value, 10);
    if (!filas || !cols || filas <= 0 || cols <= 0) {
      alert("Ingrese valores válidos.");
      return;
    }
    crearCamposVectores(filas, cols);
    document.getElementById("zona-pasos").classList.add("hidden");
    document.getElementById("zona-resultado").classList.add("hidden");
    document.getElementById("resultado-texto").textContent = "";
  });

  document.getElementById("btn-verificar").addEventListener("click", async () => {
    const data = [];
    document.querySelectorAll("#contenedor-vectores > div > div").forEach((vectorDiv, idx) => {
      if (vectorDiv.querySelector("input")) {
        // Salta el contenedor principal
        const inputs = vectorDiv.querySelectorAll("input");
        if (inputs.length) {
          const fila = [];
          inputs.forEach((inp) => fila.push(inp.value.trim()));
          data.push(fila);
        }
      }
    });

    try {
      document.getElementById("msg").textContent = "Calculando...";
      const resp = await fetch("/matrices/vectores/independencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabla: data }),
      });
      const js = await resp.json();
      if (!js.ok) throw new Error(js.error || "Error desconocido");
      mostrarPasos(js.pasos);
      document.getElementById("resultado-texto").textContent = js.mensaje;
      document.getElementById("zona-resultado").classList.remove("hidden");
      document.getElementById("msg").textContent = "Listo.";
      ultimoResultado = js;
    } catch (err) {
      document.getElementById("msg").textContent = "";
      alert("Error: " + err.message);
    }
  });
});

