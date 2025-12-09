let ultimaCeldaActiva = null;

// --- FUNCIONES DE TABLA ---

function crearTabla(filas, columnas, idTabla) {
  const tabla = document.getElementById(idTabla);
  if (!tabla) return;

  tabla.innerHTML = '';
  const tbody = document.createElement('tbody');

  for (let r = 0; r < filas; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < columnas; c++) {
      const td = document.createElement('td');
      td.className = 'celda';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '0';
      // Clases de estructura + conexión directa a variables de texto
      input.className = "w-full h-full bg-transparent text-center outline-none font-medium";
      // Forzamos el color del texto a la variable del tema
      input.style.color = "var(--text)";

      input.addEventListener('focus', () => ultimaCeldaActiva = input);

      td.appendChild(input);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
}

function leerTabla(idTabla) {
  const tabla = document.getElementById(idTabla);
  if (!tabla) return [];
  const filas = [...tabla.querySelectorAll('tbody tr')];
  return filas.map(tr => [...tr.querySelectorAll('input')].map(inp => (inp.value.trim() || '0')));
}

function setMsg(t) {
  const el = document.getElementById('msg');
  if (el) el.textContent = t || '';
}

function showModal(message) {
  const modal = document.getElementById('app-modal');
  const txt = document.getElementById('modal-text');
  if (modal && txt) {
    txt.textContent = message;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
  } else {
    alert(message);
  }
}

// --- RENDERIZADO DE PASOS ---

function renderPasoDet(p, idx) {
  const wrap = document.createElement('div');
  wrap.className = 'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-3';
  // Forzamos el fondo usando variables del sistema (se ve un poco más oscuro que el panel para contraste)
  wrap.style.backgroundColor = "rgba(148, 163, 184, 0.05)"; 

  const head = document.createElement('div');
  head.className = 'px-3 py-2 border-b border-slate-200 dark:border-slate-600 text-sm font-bold';
  head.style.color = "var(--muted)"; // Color de texto secundario
  
  let tituloOp = `Paso ${idx}`;
  if (p.op) {
    tituloOp += `: ${p.op.split('. det(A)')[0].split('. Factor')[0]}`;
  }
  head.textContent = tituloOp;

  const body = document.createElement('div');
  body.className = 'grid sm:grid-cols-2 gap-4 p-3';

  // Función interna para dibujar matriz pequeña
  const renderMat = (M, title) => {
    const container = document.createElement('div');
    container.className = 'space-y-1';

    if (title) {
      const h = document.createElement('h5');
      h.className = 'text-xs font-bold uppercase tracking-wide';
      h.style.color = "var(--muted)";
      h.textContent = title;
      container.appendChild(h);
    }

    const tbl = document.createElement('table');
    tbl.className = 'matrix-table w-full text-center text-sm';
    const tb = document.createElement('tbody');

    M.forEach(fila => {
      const tr = document.createElement('tr');
      fila.forEach(val => {
        const td = document.createElement('td');
        td.className = 'p-2 border border-slate-300 dark:border-slate-600';
        td.style.color = "var(--text)";
        td.textContent = val;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    container.appendChild(tbl);
    return container;
  };

  if (p.matriz_izq) body.appendChild(renderMat(p.matriz_izq, "Matriz"));
  if (p.matriz_der && p.matriz_der.length > 0 && p.matriz_der[0].length > 0) {
    body.appendChild(renderMat(p.matriz_der, "Operación / Factor"));
  }

  wrap.appendChild(head);
  wrap.appendChild(body);
  return wrap;
}

function renderCramerStep(p, idx) {
  const card = document.createElement('div');
  
  // ESTRUCTURA BASE
  card.className = 'mb-8 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 transition-colors duration-200';
  card.style.backgroundColor = "var(--panel)";
  card.style.color = "var(--text)";

  const title = document.createElement('h3');
  title.className = 'text-xl font-extrabold mb-4 flex items-center gap-2';
  title.style.color = "var(--accent)"; 
  
  title.innerHTML = `<span class="text-xs px-2 py-1 rounded-full" style="background: rgba(225, 29, 72, 0.1);">Var</span> ${p.variable}`;
  card.appendChild(title);

  // 1. Matriz A_i(b)
  if (p.A_i_b) {
    const subTitle = document.createElement('div');
    subTitle.className = 'text-sm font-semibold mb-2';
    subTitle.style.color = "var(--muted)";
    subTitle.textContent = `1. Matriz asociada (columna ${idx} reemplazada por b):`;
    card.appendChild(subTitle);

    const divMat = document.createElement('div');
    divMat.className = 'overflow-x-auto mb-6 inline-block rounded-lg border border-slate-200 dark:border-slate-600';
    const tbl = document.createElement('table');
    tbl.className = 'text-center border-collapse';
    const tb = document.createElement('tbody');
    p.A_i_b.forEach(fila => {
      const tr = document.createElement('tr');
      fila.forEach(val => {
        const td = document.createElement('td');
        td.className = 'px-4 py-2 border border-slate-200 dark:border-slate-600 font-mono text-sm';
        td.style.color = "var(--text)";
        td.style.backgroundColor = "var(--bg)";
        td.textContent = val;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    divMat.appendChild(tbl);
    card.appendChild(divMat);
  }

  // 2. Pasos del determinante
  if (p.det_Ai_pasos && p.det_Ai_pasos.length > 0) {
    const detTitle = document.createElement('div');
    detTitle.className = 'text-sm font-semibold mb-3';
    detTitle.style.color = "var(--muted)";
    detTitle.textContent = `2. Desarrollo del determinante:`;
    card.appendChild(detTitle);

    const detContainer = document.createElement('div');
    detContainer.className = 'space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700';
    p.det_Ai_pasos.forEach((paso, i) => {
      detContainer.appendChild(renderPasoDet(paso, i + 1));
    });
    card.appendChild(detContainer);
  }

  // 3. Resultado Final del Paso
  const finalDiv = document.createElement('div');
  finalDiv.className = 'mt-6 pt-4 border-t border-slate-100 dark:border-slate-700';
  finalDiv.innerHTML = `
      <div class="text-xs uppercase tracking-wide font-bold mb-1" style="color: var(--muted)">Resultado Parcial</div>
      <div class="flex flex-col sm:flex-row sm:items-baseline gap-2">
        <span class="text-2xl font-bold" style="color: var(--text)">
            ${p.variable} = <span style="color: var(--accent)">${p.calculo.split('=')[2] || p.calculo}</span>
        </span>
        <span class="text-sm font-mono px-2 py-1 rounded" style="background: rgba(148,163,184,0.1); color: var(--muted)">
            (${p.formula})
        </span>
      </div>
  `;
  card.appendChild(finalDiv);

  return card;
}

// --- EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
  const btnCrear = document.getElementById('btn-crear');
  const btnResolver = document.getElementById('btn-resolver');

  // Crear Matriz
  if (btnCrear) {
    btnCrear.addEventListener('click', () => {
      const n = parseInt(document.getElementById('inp-orden').value, 10);
      if (!Number.isInteger(n) || n < 2) {
        showModal('n debe ser un entero ≥ 2');
        return;
      }

      crearTabla(n, n, 'tabla-A');
      crearTabla(n, 1, 'tabla-b');

      document.getElementById('zona-matrices').classList.remove('hidden');

      ['zona-detA', 'zona-cramer', 'zona-resultado'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
      });
    });
  }

  // ✅ NUEVO: SISTEMA → A y b
  const btnSistema = document.getElementById('btn-sistema-a-matrices');
  if (btnSistema) {
    btnSistema.addEventListener('click', async () => {
      const sistemaEl = document.getElementById('txt-sistema');
      const varsEl = document.getElementById('inp-variables-sistema');
      const sistema = (sistemaEl && sistemaEl.value) || '';
      const variables = (varsEl && varsEl.value) || '';

      if (!sistema.trim()) {
        showModal('Escribe al menos una ecuación en el sistema.');
        return;
      }

      const modo = document.getElementById('sel-modo').value;
      const decimales = parseInt(document.getElementById('inp-decimales').value, 10) || 6;

      setMsg('Interpretando sistema...');

      try {
        const resp = await fetch('/matrices/operaciones/cramer/sistema_matriz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sistema,
            variables,
            modo_precision: modo,
            decimales
          })
        });

        const js = await resp.json();
        if (!js.ok) {
          setMsg('');
          throw new Error(js.error || 'Error al interpretar el sistema.');
        }

        // js.n -> orden, js.A -> matriz de coeficientes, js.b -> vector (lista)
        const n = js.n;
        const A = js.A || [];
        const b = js.b || [];

        // Ajustamos el input de orden
        document.getElementById('inp-orden').value = n;

        // Crear tablas
        crearTabla(n, n, 'tabla-A');
        crearTabla(n, 1, 'tabla-b');

        document.getElementById('zona-matrices').classList.remove('hidden');
        ['zona-detA', 'zona-cramer', 'zona-resultado'].forEach(id => {
          document.getElementById(id).classList.add('hidden');
        });

        // Rellenar A
        const tablaA = document.getElementById('tabla-A');
        const filasA = tablaA.querySelectorAll('tbody tr');
        for (let r = 0; r < n; r++) {
          const inputs = filasA[r].querySelectorAll('td input');
          for (let c = 0; c < n; c++) {
            inputs[c].value = (A[r] && A[r][c]) !== undefined ? A[r][c] : '0';
          }
        }

        // Rellenar b
        const tablaB = document.getElementById('tabla-b');
        const filasB = tablaB.querySelectorAll('tbody tr');
        for (let r = 0; r < n; r++) {
          const inputs = filasB[r].querySelectorAll('td input');
          if (inputs[0]) {
            inputs[0].value = b[r] !== undefined ? b[r] : '0';
          }
        }

        setMsg('Sistema cargado en A y b.');
      } catch (err) {
        console.error(err);
        setMsg('');
        showModal('Error: ' + err.message);
      }
    });
  }

 // Resolver
if (btnResolver) {
  btnResolver.addEventListener('click', async () => {
    const matriz_A = leerTabla('tabla-A');

    // 🔹 vector_b: aplanar n×1 -> 1D
    const vector_b_matriz = leerTabla('tabla-b');
    const vector_b = vector_b_matriz.map(fila => (fila[0] ?? '0'));

    const modo = document.getElementById('sel-modo').value;
    const decimales = parseInt(document.getElementById('inp-decimales').value, 10) || 6;

    setMsg('Calculando...');

    try {
      const resp = await fetch('/matrices/operaciones/cramer/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matriz_A_str: matriz_A,
          vector_b_str: vector_b,
          modo_precision: modo,
          decimales
        })
      });

      // 🔹 Mejora: si el servidor responde HTML o un error, lo mostramos
      const text = await resp.text();
      let js;
      try {
        js = JSON.parse(text);
      } catch (e) {
        throw new Error(`Respuesta no válida del servidor (status ${resp.status}): ${text.slice(0, 200)}`);
      }

      document.getElementById('zona-detA').classList.add('hidden');
      document.getElementById('zona-cramer').classList.add('hidden');
      document.getElementById('zona-resultado').classList.add('hidden');

      if (js.ok) {
        // 1. Determinante A
        const divDetA = document.getElementById('valor-detA');
        divDetA.textContent = `det(A) = ${js.det_A}`;
        const listaDetA = document.getElementById('lista-pasos-detA');
        listaDetA.innerHTML = '';
        if (js.pasos) {
          js.pasos.forEach((p, i) => listaDetA.appendChild(renderPasoDet(p, i + 1)));
        }
        document.getElementById('zona-detA').classList.remove('hidden');

        // 2. Cramer
        const msgCramer = document.getElementById('cramer-message');
        if (msgCramer) msgCramer.textContent = js.mensaje;

        const listaCramer = document.getElementById('lista-pasos-cramer');
        listaCramer.innerHTML = '';

        if (js.pasos_cramer) {
          js.pasos_cramer.forEach((p, i) => listaCramer.appendChild(renderCramerStep(p, i + 1)));
          document.getElementById('zona-cramer').classList.remove('hidden');
        }

        // 3. Solución Final
        if (js.solucion) {
          const ul = document.getElementById('resultado-solucion');
          ul.innerHTML = '';
          Object.entries(js.solucion).forEach(([k, v]) => {
            const li = document.createElement('li');
            li.className = 'panel p-4 border rounded-xl shadow-sm text-center';
            li.style.borderColor = "var(--border)";
            li.innerHTML = `<span class="font-bold mr-2" style="color: var(--text)">${k} =</span> <span class="text-xl font-extrabold" style="color: var(--accent)">${v}</span>`;
            ul.appendChild(li);
          });
          document.getElementById('zona-resultado').classList.remove('hidden');
        } else {
          document.getElementById('zona-cramer').classList.remove('hidden');
        }

        setMsg('Listo.');
      } else {
        setMsg('');
        showModal(js.error || 'Error desconocido');
      }
    } catch (e) {
      console.error(e);
      setMsg('');
      showModal('Error al conectar con el servidor: ' + e.message);
    }
  });
}


  // --- TECLADO VIRTUAL ---
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.kbd, .key');
    if (!btn) return;

    if (!ultimaCeldaActiva) {
      const first = document.querySelector('.celda input');
      if (first) ultimaCeldaActiva = first;
      else return;
    }

    let ins = btn.dataset.ins || btn.dataset.insert || btn.textContent.trim();
    let toInsert = ins;
    if (ins === 'x^' || ins === '^') {
      toInsert = '^';
    } else if (ins.endsWith('()')) {
      toInsert = ins.slice(0, -1);
    }

    const input = ultimaCeldaActiva;
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;

    input.value = val.slice(0, start) + toInsert + val.slice(end);
    input.focus();
    const newPos = start + toInsert.length;
    input.setSelectionRange(newPos, newPos);
  });
});
