// app/static/js/determinante.js

let ultimaCeldaActiva = null;

function crearTablaCuadrada(n, idTabla){
  const tabla = document.getElementById(idTabla);
  tabla.innerHTML = '';
  const tbody = document.createElement('tbody');
  for (let r = 0; r < n; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < n; c++) {
      const td = document.createElement('td'); 
      td.className = 'celda';
      const input = document.createElement('input'); 
      input.type = 'text'; 
      input.placeholder = '0';
      input.addEventListener('focus', () => ultimaCeldaActiva = input);
      td.appendChild(input); 
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
}

function leerTabla(idTabla){
  const tabla = document.getElementById(idTabla);
  const filas = [...tabla.querySelectorAll('tbody tr')];
  return filas.map(tr => [...tr.querySelectorAll('input')].map(inp => (inp.value || '0')));
}

function setMsg(t){ 
  document.getElementById('msg').textContent = t || ''; 
}

function showModal(message){
  const modal = document.getElementById('app-modal'); 
  const txt   = document.getElementById('modal-text');
  txt.textContent = message; 
  modal.classList.remove('hidden'); 
  setTimeout(() => modal.classList.add('show'), 10);
}

function renderPasoDet(p, idx){
  const wrap = document.createElement('div');
  wrap.className = 'rounded-xl border border-slate-200 overflow-auto';
  
  const head = document.createElement('div');
  head.className = 'px-3 py-2 text-slate-700 bg-slate-50 border-b border-slate-200 text-sm font-semibold';
  
  // Muestra la operación y el factor si aplica
  head.textContent = `Paso ${idx}: ${p.op.split('. det(A)')[0].split('. Factor')[0]}`;
  
  const body = document.createElement('div');
  body.className = 'grid sm:grid-cols-2 gap-4 p-3 items-start';

  // Contenedor Matriz Izquierda
  const leftCont = document.createElement('div');
  leftCont.className = 'space-y-2';
  const leftHead = document.createElement('h4'); 
  leftHead.className = 'text-sm font-medium';
  leftHead.textContent = "Matriz";
  const left = document.createElement('table'); 
  left.className = 'matrix-table w-full';
  
  // Contenedor Operación Derecha
  const rightCont = document.createElement('div');
  rightCont.className = 'space-y-2';
  const rightHead = document.createElement('h4'); 
  rightHead.className = 'text-sm font-medium';
  rightHead.textContent = "Operación / Factor";
  const right = document.createElement('table'); 
  right.className = 'matrix-table w-full';
  
  // render matrices
  const render = (M, tbl) => {
    const tbody = document.createElement('tbody');
    M.forEach(fila => {
      const tr = document.createElement('tr');
      fila.forEach(celda => {
        const td = document.createElement('td'); 
        td.className = 'celda'; 
        const div = document.createElement('div'); 
        div.textContent = celda; 
        td.appendChild(div); 
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
  };

  render(p.matriz_izq, left);
  render(p.matriz_der, right);
  
  leftCont.appendChild(leftHead); 
  leftCont.appendChild(left);
  rightCont.appendChild(rightHead); 
  rightCont.appendChild(right);
  
  body.appendChild(leftCont); 
  if (p.matriz_der && p.matriz_der.length > 0 && p.matriz_der[0].length > 0) {
    body.appendChild(rightCont);
  }
  
  wrap.appendChild(head); 
  wrap.appendChild(body);
  return wrap;
}


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-crear').addEventListener('click', () => {
    const n = parseInt(document.getElementById('inp-orden').value, 10);
    if (!Number.isInteger(n) || n < 2){ 
      showModal('n debe ser un entero ≥ 2'); 
      return; 
    }
    crearTablaCuadrada(n, 'tabla-A');
    document.getElementById('zona-matriz').classList.remove('hidden');
    document.getElementById('zona-pasos').classList.add('hidden');
    document.getElementById('zona-resultado').classList.add('hidden');
  });

  document.getElementById('btn-resolver').addEventListener('click', async () => {
    const matriz    = leerTabla('tabla-A');
    const modo      = document.getElementById('sel-modo').value;
    const decimales = parseInt(document.getElementById('inp-decimales').value, 10) || 6;
    setMsg('Calculando...');
    
    try {
      const resp = await fetch('/matrices/operaciones/determinante/resolver', {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ matriz_str: matriz, modo_precision: modo, decimales })
      });
      const js = await resp.json();
      
      if (js.ok) {
        document.getElementById('zona-pasos').classList.add('hidden');
        document.getElementById('zona-resultado').classList.add('hidden');
        
        // 1. Mostrar pasos (solo si hay más de 1 paso)
        if (js.pasos && js.pasos.length > 1) { 
          const lista = document.getElementById('lista-pasos'); 
          lista.innerHTML = '';
          js.pasos.forEach((p, i) => lista.appendChild(renderPasoDet(p, i + 1)));
          document.getElementById('zona-pasos').classList.remove('hidden');
        }
        
        // 2. Mostrar resultado
        document.getElementById('resultado-valor').textContent = js.det;
        document.getElementById('zona-resultado').classList.remove('hidden');
        setMsg('Listo.');
        
      } else {
        setMsg('');
        showModal(js.error || 'Error desconocido');
      }
    } catch (e) { 
      setMsg('');
      showModal('Error al conectar con el servidor: ' + e.message); 
    }
  });

  /* ============================
        TECLADO REPARADO
     ============================ */

  document.addEventListener('click', (e) => {
    // acepta tanto .kbd como .key (como en los otros módulos)
    const btn = e.target.closest('.kbd, .key');
    if (!btn) return;
    if (!ultimaCeldaActiva) return;

    let ins =
      btn.getAttribute('data-ins') ||
      btn.getAttribute('data-insert') ||
      btn.textContent.trim();

    const isXPowerButton = btn.textContent.trim() === 'x^' || ins === 'x^';

    const input = ultimaCeldaActiva;
    const value = input.value || '';

    const start = (typeof input.selectionStart === 'number') ? input.selectionStart : value.length;
    const end   = (typeof input.selectionEnd   === 'number') ? input.selectionEnd   : value.length;

    let toInsert = ins;
    let cursorPos = start + toInsert.length;

    if (isXPowerButton) {
      toInsert = '^';
      cursorPos = start + 1;
    }

    input.value = value.slice(0, start) + toInsert + value.slice(end);

    input.focus();
    input.setSelectionRange(cursorPos, cursorPos);
  });

});
