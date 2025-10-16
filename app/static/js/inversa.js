
let ultimaCeldaActiva=null;

function crearTablaCuadrada(n, idTabla){
  const tabla=document.getElementById(idTabla);
  tabla.innerHTML='';
  const tbody=document.createElement('tbody');
  for(let r=0;r<n;r++){
    const tr=document.createElement('tr');
    for(let c=0;c<n;c++){
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

function renderPaso(p, idx){
  const wrap = document.createElement('div');
  wrap.className = 'rounded-xl border border-slate-200 overflow-auto';
  const head = document.createElement('div');
  head.className = 'px-3 py-2 text-slate-700 bg-slate-50 border-b border-slate-200 text-sm';
  head.textContent = `Paso ${idx}: ${p.op}`;
  const body = document.createElement('div');
  body.className = 'grid sm:grid-cols-2 gap-4 p-3';
  const left = document.createElement('table'); left.className='matrix-table w-full';
  const right = document.createElement('table'); right.className='matrix-table w-full';
  // render matrices
  const render = (M, tbl)=>{
    const tbody = document.createElement('tbody');
    for(const fila of M){
      const tr = document.createElement('tr');
      for(const celda of fila){
        const td=document.createElement('td'); td.className='celda'; const div=document.createElement('div'); div.textContent=celda; td.appendChild(div); tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
  };
  render(p.matriz_izq, left); render(p.matriz_der, right);
  body.appendChild(left); body.appendChild(right);
  wrap.appendChild(head); wrap.appendChild(body);
  return wrap;
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-crear').addEventListener('click',()=>{
    const n=parseInt(document.getElementById('inp-orden').value,10);
    if(!Number.isInteger(n) || n<2){ alert('n debe ser un entero ≥ 2'); return; }
    crearTablaCuadrada(n,'tabla-A');
    document.getElementById('zona-matriz').classList.remove('hidden');
  });

  document.getElementById('btn-resolver').addEventListener('click', async ()=>{
    const n = parseInt(document.getElementById('inp-orden').value,10);
    const matriz = leerTabla('tabla-A');
    const modo = document.getElementById('sel-modo').value;
    const decimales = parseInt(document.getElementById('inp-decimales').value,10) || 6;
    const msg = document.getElementById('msg'); msg.textContent='Calculando...';
    try{
      const resp = await fetch('/matrices/operaciones/inversa/resolver', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ n, matriz_str: matriz, modo_precision: modo, decimales })
      });
      const js = await resp.json();
      if(js.ok){
        document.getElementById('zona-resultado').classList.add('hidden');
        document.getElementById('zona-pasos').classList.add('hidden');
        if(js.pasos && js.pasos.length){
          const lista = document.getElementById('lista-pasos'); lista.innerHTML='';
          js.pasos.forEach((p, i)=> lista.appendChild(renderPaso(p, i)));
          document.getElementById('zona-pasos').classList.remove('hidden');
        }
        if(js.inversa){
          renderMatrix(js.inversa, 'tabla-resultado');
          document.getElementById('zona-resultado').classList.remove('hidden');
        }
        if(js.mensaje){
          alert(js.mensaje);
        }
      }else{
        alert(js.error || 'Error');
      }
    }catch(e){ alert(e.message); }
    msg.textContent='';
  });

  // teclado especial
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
