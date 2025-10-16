
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

function renderMatrix(M, tableId){
  const tabla=document.getElementById(tableId);
  tabla.innerHTML='';
  const tbody=document.createElement('tbody');
  for(const fila of M){
    const tr=document.createElement('tr');
    for(const celda of fila){
      const td=document.createElement('td'); td.className='celda';
      const div=document.createElement('div'); div.textContent=celda;
      td.appendChild(div); tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-crear').addEventListener('click',()=>{
    const m=parseInt(document.getElementById('inp-filas').value,10);
    const n=parseInt(document.getElementById('inp-columnas').value,10);
    if(!Number.isInteger(m)||!Number.isInteger(n)||m<1||n<1){ alert('Dimensiones inválidas.'); return; }
    crearTabla(m,n,'tabla-A');
    document.getElementById('zona-matriz').classList.remove('hidden');
  });

  document.getElementById('btn-resolver').addEventListener('click', async ()=>{
    const matriz = leerTabla('tabla-A');
    const msg = document.getElementById('msg'); msg.textContent='Calculando...';
    try{
      const resp = await fetch('/matrices/operaciones/traspuesta/resolver', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ matriz_str: matriz })
      });
      const js = await resp.json();
      if(js.ok){
        renderMatrix(js.resultado, 'tabla-resultado');
        document.getElementById('zona-resultado').classList.remove('hidden');
      }else{
        alert(js.error || 'Error');
      }
    }catch(e){ alert(e.message); }
    msg.textContent='';
  });

  // Teclado rápido
  document.querySelectorAll('.kbd-row .kbd').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!ultimaCeldaActiva) return;
      const ins = btn.getAttribute('data-ins');
      const start = ultimaCeldaActiva.selectionStart || 0;
      const end = ultimaCeldaActiva.selectionEnd || 0;
      const v = ultimaCeldaActiva.value || '';
      ultimaCeldaActiva.value = v.slice(0,start) + ins + v.slice(end);
      const pos = start + ins.length;
      ultimaCeldaActiva.focus(); ultimaCeldaActiva.setSelectionRange(pos,pos);
    });
  });
});
