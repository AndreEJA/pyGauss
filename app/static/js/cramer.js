// app/static/js/cramer.js

let ultimaCeldaActiva=null;

function crearTabla(filas, columnas, idTabla){
  const tabla=document.getElementById(idTabla);
  tabla.innerHTML='';
  const tbody=document.createElement('tbody');
  for(let r=0;r<filas;r++){
    const tr=document.createElement('tr');
    for(let c=0;c<columnas;c++){
      const td=document.createElement('td'); td.className='celda';
      const input=document.createElement('input'); input.type='text'; input.placeholder='0';
      input.addEventListener('focus',()=> ultimaCeldaActiva=input);
      td.appendChild(input); tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
}

function leerTabla(idTabla){
  const tabla=document.getElementById(idTabla);
  const filas=[...tabla.querySelectorAll('tbody tr')];
  return filas.map(tr=>[...tr.querySelectorAll('input')].map(inp=> (inp.value||'0')));
}

function setMsg(t){ document.getElementById('msg').textContent = t||''; }

function showModal(message){
  const modal=document.getElementById('app-modal'); const txt=document.getElementById('modal-text');
  txt.textContent=message; modal.classList.remove('hidden'); setTimeout(()=> modal.classList.add('show'), 10);
}

// Reutiliza la lógica de renderizado de pasos del determinante (det.js)
function renderPasoDet(p, idx){
  const wrap = document.createElement('div');
  wrap.className = 'rounded-xl border border-slate-200 overflow-auto';
  
  const head = document.createElement('div');
  head.className = 'px-3 py-2 text-slate-700 bg-slate-50 border-b border-slate-200 text-sm font-semibold';
  
  head.textContent = `Paso ${idx}: ${p.op.split('. det(A)')[0].split('. Factor')[0]}`;
  
  const body = document.createElement('div');
  body.className = 'grid sm:grid-cols-2 gap-4 p-3 items-start';

  const leftCont = document.createElement('div');
  leftCont.className = 'space-y-2';
  const leftHead = document.createElement('h4'); leftHead.className = 'text-sm font-medium';
  leftHead.textContent = "Matriz";
  const left = document.createElement('table'); left.className='matrix-table w-full';
  
  const rightCont = document.createElement('div');
  rightCont.className = 'space-y-2';
  const rightHead = document.createElement('h4'); rightHead.className = 'text-sm font-medium';
  rightHead.textContent = "Operación / Factor";
  const right = document.createElement('table'); right.className='matrix-table w-full';
  
  const render = (M, tbl)=>{
    const tbody = document.createElement('tbody');
    M.forEach(fila => {
      const tr = document.createElement('tr');
      fila.forEach(celda => {
        const td=document.createElement('td'); td.className='celda'; const div=document.createElement('div'); div.textContent=celda; td.appendChild(div); tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
  };

  render(p.matriz_izq, left);
  render(p.matriz_der, right);
  
  leftCont.appendChild(leftHead); leftCont.appendChild(left);
  rightCont.appendChild(rightHead); rightCont.appendChild(right);
  
  body.appendChild(leftCont); 
  if (p.matriz_der && p.matriz_der.length > 0 && p.matriz_der[0].length > 0) {
     body.appendChild(rightCont);
  }
  
  wrap.appendChild(head); wrap.appendChild(body);
  return wrap;
}

function renderCramerStep(p, idx) {
    const card = document.createElement('div');
    card.className = 'card-paso';

    const title = document.createElement('div');
    title.className = 'text-lg font-semibold text-slate-900 mb-3';
    title.textContent = `Cálculo para ${p.variable}`;
    card.appendChild(title);

    // 1. Matriz A_i(b)
    const h4_mat = document.createElement('h4');
    h4_mat.className = 'text-base font-medium text-slate-700 mb-2';
    h4_mat.textContent = `Matriz ${p.variable.replace('x', 'A')}(b): Columna ${idx} reemplazada.`;
    card.appendChild(h4_mat);

    const wrapMat = document.createElement('div');
    wrapMat.className = 'overflow-auto mb-4 rounded-lg border border-slate-200';
    const tablaMat = document.createElement('table'); tablaMat.className = 'matrix-table w-full';
    p.A_i_b.forEach(fila => {
        const tr = document.createElement('tr');
        fila.forEach(celda => {
            const td = document.createElement('td'); td.textContent = celda; tr.appendChild(td);
        });
        tablaMat.appendChild(tr);
    });
    wrapMat.appendChild(tablaMat);
    card.appendChild(wrapMat);

    // 2. Pasos del determinante de A_i(b)
    const h4_det = document.createElement('h4');
    h4_det.className = 'text-base font-medium text-slate-700 mt-4 mb-2';
    h4_det.textContent = `Pasos para det(${p.variable.replace('x', 'A')}(b)) = ${p.det_Ai_valor}`;
    card.appendChild(h4_det);

    const detStepsContainer = document.createElement('div');
    detStepsContainer.className = 'space-y-3';
    p.det_Ai_pasos.forEach((detPaso, i) => {
        detStepsContainer.appendChild(renderPasoDet(detPaso, i+1));
    });
    card.appendChild(detStepsContainer);
    
    // 3. Cálculo final de la variable
    const finalCalc = document.createElement('div');
    finalCalc.className = 'mt-4 pt-3 border-t border-slate-200';
    finalCalc.innerHTML = `
        <div class="text-base font-medium mb-1">${p.formula}</div>
        <div class="text-xl font-bold">${p.calculo}</div>
    `;
    card.appendChild(finalCalc);

    return card;
}


document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-crear').addEventListener('click',()=>{
    const n=parseInt(document.getElementById('inp-orden').value,10);
    if(!Number.isInteger(n) || n<2){ showModal('n debe ser un entero ≥ 2'); return; }
    
    // Matriz A (n x n)
    crearTabla(n, n, 'tabla-A');
    // Vector b (n x 1)
    crearTabla(n, 1, 'tabla-b');
    
    document.getElementById('zona-matrices').classList.remove('hidden');
    document.getElementById('zona-detA').classList.add('hidden');
    document.getElementById('zona-cramer').classList.add('hidden');
    document.getElementById('zona-resultado').classList.add('hidden');
  });

  document.getElementById('btn-resolver').addEventListener('click', async ()=>{
    const matriz_A = leerTabla('tabla-A');
    const vector_b = leerTabla('tabla-b'); 
    const modo = document.getElementById('sel-modo').value;
    const decimales = parseInt(document.getElementById('inp-decimales').value,10) || 6;
    const msg = document.getElementById('msg'); setMsg('Calculando...');
    
    try{
      const resp = await fetch('/matrices/operaciones/cramer/resolver', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ matriz_A_str: matriz_A, vector_b_str: vector_b, modo_precision: modo, decimales })
      });
      const js = await resp.json();
      
      document.getElementById('zona-detA').classList.add('hidden');
      document.getElementById('zona-cramer').classList.add('hidden');
      document.getElementById('zona-resultado').classList.add('hidden');

      if(js.ok){
        
        // 1. Mostrar det(A) y sus pasos
        document.getElementById('valor-detA').textContent = `det(A) = ${js.det_A}`;
        if(js.pasos && js.pasos.length){
            const listaDetA = document.getElementById('lista-pasos-detA'); listaDetA.innerHTML = '';
            js.pasos.forEach((p, i) => listaDetA.appendChild(renderPasoDet(p, i+1)));
        }
        document.getElementById('zona-detA').classList.remove('hidden');

        // 2. Mostrar mensaje y pasos de Cramer
        const mensaje = document.getElementById('cramer-message');
        const listaCramer = document.getElementById('lista-pasos-cramer'); listaCramer.innerHTML = '';

        if(js.solucion){
            mensaje.textContent = js.mensaje;
            js.pasos_cramer.forEach((p, i) => listaCramer.appendChild(renderCramerStep(p, i+1)));
            document.getElementById('zona-cramer').classList.remove('hidden');
            
            // 3. Mostrar solución final
            const ulSolucion = document.getElementById('resultado-solucion'); ulSolucion.innerHTML = '';
            Object.entries(js.solucion).forEach(([k, v]) => {
                const li = document.createElement('li');
                li.className = 'sol-item text-slate-800 font-semibold';
                li.textContent = `${k} = ${v}`;
                ulSolucion.appendChild(li);
            });
            document.getElementById('zona-resultado').classList.remove('hidden');
        } else {
            // Caso no invertible
            mensaje.textContent = js.mensaje;
            document.getElementById('zona-cramer').classList.remove('hidden');
        }

        setMsg('Listo.');
        
      }else{
        setMsg('');
        showModal(js.error || 'Error desconocido');
      }
    }catch(e){ 
      setMsg('');
      showModal('Error al conectar con el servidor: ' + e.message); 
    }
  });

  document.querySelectorAll('.kbd-row .kbd').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!ultimaCeldaActiva) return;
      const ins = btn.getAttribute('data-ins');
      const start = ultimaCeldaActiva.selectionStart || 0;
      const end = ultimaCeldaActiva.selectionEnd || 0;
      const v = ultimaCeldaActiva.value || '';
      let toInsert = ins;
      let cursorPos = start + toInsert.length;
      if (ins === 'x^') { toInsert = '^'; cursorPos = start + 1; }
      
      ultimaCeldaActiva.value = v.slice(0,start) + toInsert + v.slice(end);
      ultimaCeldaActiva.focus(); ultimaCeldaActiva.setSelectionRange(cursorPos,cursorPos);
    });
  });
});