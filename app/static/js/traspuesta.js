let ultimaCeldaActiva = null;

function crearTabla(filas, columnas, idTabla){
  const tabla = document.getElementById(idTabla);
  tabla.innerHTML = '';
  const tbody = document.createElement('tbody');

  for(let r = 0; r < filas; r++){
    const tr = document.createElement('tr');

    for(let c = 0; c < columnas; c++){
      const td = document.createElement('td');
      td.className = 'celda';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '0';

      // Guardar celda activa
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

function renderMatrix(M, tableId){
  const tabla = document.getElementById(tableId);
  tabla.innerHTML = '';
  const tbody = document.createElement('tbody');

  for(const fila of M){
    const tr = document.createElement('tr');
    for(const celda of fila){
      const td = document.createElement('td');
      td.className = 'celda';
      const div = document.createElement('div');
      div.textContent = celda;
      td.appendChild(div);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  tabla.appendChild(tbody);
}

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btn-crear').addEventListener('click', () => {
    const m = parseInt(document.getElementById('inp-filas').value, 10);
    const n = parseInt(document.getElementById('inp-columnas').value, 10);

    if(!Number.isInteger(m) || !Number.isInteger(n) || m < 1 || n < 1){
      alert('Dimensiones inválidas.');
      return;
    }

    crearTabla(m, n, 'tabla-A');
    document.getElementById('zona-matriz').classList.remove('hidden');
  });

  document.getElementById('btn-resolver').addEventListener('click', async () => {
    const matriz = leerTabla('tabla-A');
    const msg = document.getElementById('msg');
    msg.textContent = 'Calculando...';

    try{
      const resp = await fetch('/matrices/operaciones/traspuesta/resolver', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ matriz_str: matriz })
      });

      const js = await resp.json();

      if(js.ok){
        renderMatrix(js.resultado, 'tabla-resultado');
        document.getElementById('zona-resultado').classList.remove('hidden');
      } else {
        alert(js.error || 'Error');
      }

    } catch(e){
      alert(e.message);
    }

    msg.textContent = '';
  });


  /* ============================
        TECLADO REPARADO  
     ============================ */

  document.addEventListener("click", function (e) {
    // Detectar click en .kbd o .key
    const btn = e.target.closest(".kbd, .key");
    if (!btn) return;
    if (!ultimaCeldaActiva) return;

    // Obtener lo que se va a insertar
    const ins =
      btn.dataset.ins ||
      btn.dataset.insert ||
      btn.textContent.trim();

    if (!ins) return;

    const input = ultimaCeldaActiva;
    const start = input.selectionStart ?? input.value.length;
    const end   = input.selectionEnd   ?? input.value.length;
    const value = input.value;

    // Insertar en posición de cursor
    input.value = value.slice(0, start) + ins + value.slice(end);

    // Restaurar foco + mover cursor
    input.focus();
    const cursor = start + ins.length;
    input.setSelectionRange(cursor, cursor);
  });

});
