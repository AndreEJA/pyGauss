let ultimaCeldaActiva=null, ultimoResultado=null;

function crearTabla(filas, columnas){
  const tabla=document.getElementById('tabla-matriz');
  tabla.innerHTML='';
  const thead=document.createElement('thead');
  const trh=document.createElement('tr');
  const headV=document.createElement('th'); headV.className='row-head'; headV.textContent=''; trh.appendChild(headV);
  for(let c=0;c<columnas;c++){ const th=document.createElement('th'); th.textContent='x'+(c+1); trh.appendChild(th); }
  const thb=document.createElement('th'); thb.textContent='b'; trh.appendChild(thb);
  thead.appendChild(trh); tabla.appendChild(thead);

  const tbody=document.createElement('tbody');
  for(let r=0;r<filas;r++){
    const tr=document.createElement('tr');
    const rh=document.createElement('th'); rh.className='row-head'; rh.textContent=String(r+1); tr.appendChild(rh);
    for(let c=0;c<columnas+1;c++){
      const td=document.createElement('td'); td.className='celda';
      const input=document.createElement('input'); input.type='text'; input.placeholder='0';
      input.addEventListener('focus',()=> ultimaCeldaActiva=input);
      input.addEventListener('keydown',(e)=>{
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
          e.preventDefault(); moverFoco({r,c}, e.key, filas, columnas+1);
        }
      });
      td.appendChild(input); tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
  document.getElementById('zona-tabla').classList.remove('hidden');
}

function moverFoco(pos,key,filas,columnas){
  let {r,c}=pos;
  if(key==='ArrowUp') r=Math.max(0,r-1);
  if(key==='ArrowDown') r=Math.min(filas-1,r+1);
  if(key==='ArrowLeft') c=Math.max(0,c-1);
  if(key==='ArrowRight') c=Math.min(columnas-1,c+1);
  const tabla=document.getElementById('tabla-matriz');
  const inp=tabla.querySelectorAll('tbody tr')[r].querySelectorAll('td input')[c];
  inp?.focus();
}

function leerTabla(){
  const tabla=document.getElementById('tabla-matriz');
  const filas=tabla.querySelectorAll('tbody tr').length;
  const columnas=tabla.querySelectorAll('thead tr th').length - 2;  // -2: quita cabecera de filas y 'b'
  const datos=[];
  tabla.querySelectorAll('tbody tr').forEach(tr=>{
    const vals=[]; tr.querySelectorAll('td input').forEach(inp=> vals.push(inp.value.trim())); datos.push(vals);
  });
  return {filas, columnas, datos};
}

function crearTH(txt){ const th=document.createElement('th'); th.textContent=txt; return th; }

function mostrarPasos(pasos){
  const cont=document.getElementById('contenedor-pasos'); cont.innerHTML='';
  pasos.forEach((p,i)=>{
    const card=document.createElement('div'); card.className='card-paso';
    const titulo=document.createElement('div');
    titulo.innerHTML=`<span class="badge">Paso ${i+1}</span> <span class="ml-2 font-medium">${p.descripcion}</span>`;
    card.appendChild(titulo);

    const wrap=document.createElement('div'); wrap.className='overflow-auto mt-3 rounded-lg'; wrap.style.border='1px solid var(--border)';
    const tabla=document.createElement('table'); tabla.className='matrix-table w-full';
    const filas=p.matriz.length, cols=p.matriz[0].length;
    const thead=document.createElement('thead'); const thr=document.createElement('tr');
    thr.appendChild(crearTH('')); for(let c=0;c<cols-1;c++){ thr.appendChild(crearTH('x'+(c+1))); } thr.appendChild(crearTH('b'));
    thead.appendChild(thr); tabla.appendChild(thead);
    const tbody=document.createElement('tbody');
    for(let r=0;r<filas;r++){
      const tr=document.createElement('tr'); const rh=document.createElement('th'); rh.className='row-head'; rh.textContent=String(r+1); tr.appendChild(rh);
      for(let c=0;c<cols;c++){ const td=document.createElement('td'); td.textContent=p.matriz[r][c]; tr.appendChild(td); }
      tbody.appendChild(tr);
    }
    tabla.appendChild(tbody);

    if(p.col_pivote){
      const pivotHeaderIdx = 1 + (p.col_pivote - 1);
      if(thr.children[pivotHeaderIdx]) thr.children[pivotHeaderIdx].classList.add('pivot');
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        const idxBody = (p.col_pivote - 1);
        if(tds[idxBody]) tds[idxBody].classList.add('pivot');
      });
    }

    wrap.appendChild(tabla); card.appendChild(wrap);
    cont.appendChild(card);
  });
  document.getElementById('zona-pasos').classList.remove('hidden');
}

function mostrarFinal(final){
  const z=document.getElementById('zona-final'); const desc=document.getElementById('final-desc'); const ul=document.getElementById('final-sol');
  desc.textContent=final.descripcion||''; ul.innerHTML='';
  if(final.pivotes && final.pivotes.length){ const li=document.createElement('li'); li.className='sol-item'; li.textContent=`Columnas pivote: `+ final.pivotes.map(p=>'x'+p).join(', '); ul.appendChild(li); }
  if(final.variables_libres && final.variables_libres.length){ const li=document.createElement('li'); li.className='sol-item'; li.textContent=`Variables libres: `+ final.variables_libres.join(', '); ul.appendChild(li); }
  if(final.solucion){ Object.entries(final.solucion).forEach(([k,v])=>{ const li=document.createElement('li'); li.className='sol-item'; li.textContent=`${k}: ${v}`; ul.appendChild(li); }); }
  z.classList.remove('hidden');
}

function setMsg(t){ document.getElementById('msg').textContent = t||''; }

function rellenar(tipo){
  const tabla=document.getElementById('tabla-matriz');
  if(!tabla || tabla.querySelectorAll('tbody tr').length===0) return;
  const filas=tabla.querySelectorAll('tbody tr').length;
  const cols=tabla.querySelectorAll('thead tr th').length - 1;
  const n=cols-1; const cuadrada=(filas===n);
  function setCell(r,c,val){ tabla.querySelectorAll('tbody tr')[r].querySelectorAll('td input')[c].value=val; }
  if(tipo==='nula'){ for(let r=0;r<filas;r++){ for(let c=0;c<n+1;c++){ setCell(r,c,'0'); } } return; }
  if(!cuadrada){ showModal('Esta opción requiere que la parte de coeficientes sea cuadrada.'); return; }
  if(tipo==='identidad'){ for(let r=0;r<filas;r++){ for(let c=0;c<n;c++){ setCell(r,c, r===c?'1':'0'); } setCell(r,n,'0'); } }
  else if(tipo==='tsup'){ for(let r=0;r<filas;r++){ for(let c=0;c<n;c++){ setCell(r,c, c>=r?'1':'0'); } setCell(r,n,'0'); } }
  else if(tipo==='tinf'){ for(let r=0;r<filas;r++){ for(let c=0;c<n;c++){ setCell(r,c, c<=r?'1':'0'); } setCell(r,n,'0'); } }
}

document.addEventListener('click',(e)=>{
  if(e.target.matches('.key')){
    const ins=e.target.getAttribute('data-ins');
    if(ultimaCeldaActiva){
      const start=ultimaCeldaActiva.selectionStart||ultimaCeldaActiva.value.length;
      const end=ultimaCeldaActiva.selectionEnd||start;
      const v=ultimaCeldaActiva.value;
      let toInsert = ins;
      let cursorPos = start + toInsert.length;
      if(ins.endsWith('()')){ toInsert=ins.slice(0,-2); cursorPos=start+toInsert.length+1; }
      
      // Lógica para el botón 'x²' (potenciación)
      if (ins === 'x^') {
          toInsert = '^';
          cursorPos = start + 1;
      }

      ultimaCeldaActiva.value=v.slice(0,start)+toInsert+v.slice(end);
      ultimaCeldaActiva.focus();
      ultimaCeldaActiva.setSelectionRange(cursorPos, cursorPos);
    }
  }
  if(e.target.matches('.fill-btn')) rellenar(e.target.getAttribute('data-fill'));
});

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-crear').addEventListener('click',()=>{
    const filas=parseInt(document.getElementById('inp-filas').value,10);
    const cols=parseInt(document.getElementById('inp-columnas').value,10);
    if(!filas||!cols||filas<=0||cols<=0){ showModal('Ingresa números válidos para filas e incógnitas.'); return; }
    crearTabla(filas, cols);
    document.getElementById('zona-pasos').classList.add('hidden');
    document.getElementById('zona-final').classList.add('hidden');
    ultimoResultado=null;
  });

  document.getElementById('btn-resolver').addEventListener('click', async ()=>{
    setMsg('Calculando...');
    const {filas,columnas,datos}=leerTabla();
    const modo_precision=document.getElementById('sel-precision').value;
    const decimales=parseInt(document.getElementById('inp-decimales').value,10)||6;
    try{
      const resp=await fetch('/matrices/gauss/resolver',{method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({filas, columnas, tabla: datos, modo_precision, decimales})});
      const js=await resp.json();
      if(!js.ok) throw new Error(js.error||'Error');
      mostrarPasos(js.pasos);
      mostrarFinal(js.final);
      setMsg('Listo.');
      ultimoResultado=js;
    }catch(err){
      setMsg('');
      showModal('Error: '+err.message);
    }
  });

  document.getElementById('btn-pdf').addEventListener('click', async ()=>{
    if(!ultimoResultado){ showModal('Primero resuelve la matriz.'); return; }
    try{
      const resp=await fetch('/matrices/gauss/pdf',{method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({titulo:'Método de Gauss-Jordan', pasos: ultimoResultado.pasos, final: ultimoResultado.final})});
      const blob=await resp.blob(); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='gauss_pasos.pdf'; a.click(); URL.revokeObjectURL(url);
    }catch(err){ showModal('No se pudo generar el PDF: '+err.message); }
  });
});