let ultimaCeldaActiva=null;

function crearTabla(filas, columnas, containerDiv, index){
  const tableId = `tabla-matriz${index}`;
  const h4 = document.createElement('h4');
  h4.className = 'text-lg font-medium text-slate-800 mb-2';
  h4.textContent = `Matriz A${index} (m×n)`;

  const tablaWrap = document.createElement('div');
  tablaWrap.className = 'overflow-auto max-h-[30vh] rounded-xl border border-slate-200';
  
  const tabla=document.createElement('table');
  tabla.id = tableId;
  tabla.className='matrix-table w-full mb-3';
  tablaWrap.appendChild(tabla);
  
  const tbody=document.createElement('tbody');
  for(let r=0;r<filas;r++){
    const tr=document.createElement('tr');
    for(let c=0;c<columnas;c++){
      const td=document.createElement('td'); td.className='celda';
      const input=document.createElement('input'); input.type='text'; input.placeholder='0';
      input.dataset.r = r;
      input.dataset.c = c;
      input.addEventListener('focus',()=> ultimaCeldaActiva=input);
      td.appendChild(input); tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);

  const escalarDiv = document.createElement('div');
  escalarDiv.className = 'flex items-center gap-3 mb-4';
  
  const spanLbl = document.createElement('span');
  spanLbl.className = 'lbl font-semibold text-slate-900'; 
  spanLbl.textContent = `Escalar c${index}:`;
  
  const escalarInput = document.createElement('input');
  escalarInput.id = `inp-escalar${index}`;
  escalarInput.type = 'text';
  escalarInput.value = '1';
  // Clases para destacar el input con un borde rojo más grueso
  escalarInput.className = 'input w-40 border-rose-500 border-2 focus:border-rose-700'; 
  
  escalarInput.addEventListener('focus',()=> ultimaCeldaActiva=escalarInput);
  
  escalarDiv.appendChild(spanLbl);
  escalarDiv.appendChild(escalarInput);

  containerDiv.appendChild(h4);
  containerDiv.appendChild(tablaWrap);
  containerDiv.appendChild(escalarDiv);
  
  return tableId;
}

function leerMatricesYEscalares(numMatrices){
  const matrices = [];
  const escalares = [];
  for(let i=1; i<=numMatrices; i++){
      const tableId = `tabla-matriz${i}`;
      const escalarId = `inp-escalar${i}`;
      
      const tabla=document.getElementById(tableId);
      const datos=[];
      tabla.querySelectorAll('tbody tr').forEach(tr=>{
        const vals=[]; tr.querySelectorAll('td input').forEach(inp=> vals.push(inp.value.trim())); datos.push(vals);
      });
      matrices.push(datos);
      
      const escalar = document.getElementById(escalarId).value.trim();
      escalares.push(escalar);
  }
  return {matrices, escalares};
}

function mostrarResultado(resultado){
  const z=document.getElementById('zona-resultado'); 
  const tabla=document.getElementById('tabla-resultado');
  tabla.innerHTML='';
  const tbody=document.createElement('tbody');
  resultado.forEach(fila=>{
    const tr=document.createElement('tr');
    fila.forEach(val=>{
      const td=document.createElement('td'); td.textContent=val; tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tabla.appendChild(tbody);
  z.classList.remove('hidden');
}

function setMsg(t){ document.getElementById('msg').textContent = t||''; }

function showModal(message){
  const modal=document.getElementById('app-modal'); const txt=document.getElementById('modal-text');
  txt.textContent=message; modal.classList.remove('hidden'); setTimeout(()=> modal.classList.add('show'), 10);
}


document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-crear').addEventListener('click',()=>{
    const filas=parseInt(document.getElementById('inp-filas').value,10);
    const columnas=parseInt(document.getElementById('inp-columnas').value,10);
    const numMatrices=parseInt(document.getElementById('inp-cantidad-matrices').value,10);
    
    if(!filas||!columnas||filas<=0||columnas<=0 || !numMatrices || numMatrices < 2){
      showModal('Ingresa números válidos para las dimensiones y la cantidad de matrices (mínimo 2).'); 
      return; 
    }
    
    const contenedor = document.getElementById('contenedor-matrices-y-escalares');
    contenedor.innerHTML = '';
    
    for(let i=1; i<=numMatrices; i++){
        crearTabla(filas, columnas, contenedor, i);
    }
    
    document.getElementById('zona-matrices').classList.remove('hidden');
    document.getElementById('zona-resultado').classList.add('hidden');
  });

  
  document.getElementById('btn-resolver').addEventListener('click', async ()=>{
      const numMatrices=parseInt(document.getElementById('inp-cantidad-matrices').value,10);
      const {matrices, escalares} = leerMatricesYEscalares(numMatrices);
      
      // Validation check (basic)
      if (matrices.length !== numMatrices || escalares.length !== numMatrices) {
          showModal('Error: Faltan datos de matrices o escalares. Asegúrate de crear la matriz primero.');
          return;
      }

      setMsg('Calculando...');
      const modo_precision=document.getElementById('sel-precision').value;
      const decimales=parseInt(document.getElementById('inp-decimales').value,10)||6;
      
      try{
        const resp=await fetch('/matrices/operaciones/operar',{method:'POST',headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
              matrices_str: matrices, 
              escalares_str: escalares, 
              operacion: 'suma_escalar_multiple', // Nuevo tipo de operación
              modo_precision, 
              decimales
          })});
        const js=await resp.json();
        if(!js.ok) throw new Error(js.error||'Error');
        mostrarResultado(js.resultado);
        setMsg('Listo.');
      }catch(err){
        setMsg('');
        showModal('Error: '+err.message);
      }
  });

  document.addEventListener('click', (e) => {
    if (e.target.matches('.key')) {
      const ins = e.target.getAttribute('data-ins');
      if (ultimaCeldaActiva) {
        const start = ultimaCeldaActiva.selectionStart || ultimaCeldaActiva.value.length;
        const end = ultimaCeldaActiva.selectionEnd || start;
        const v = ultimaCeldaActiva.value;
        let toInsert = ins;
        let cursorPos = start + toInsert.length;

        if (ins === 'x^') {
            toInsert = '^';
            cursorPos = start + 1;
        } else if (ins.endsWith('()')) {
            // Manejar funciones como sqrt()
            toInsert = ins.slice(0, -2) + '(';
            cursorPos = start + toInsert.length; 
        }

        ultimaCeldaActiva.value = v.slice(0, start) + toInsert + v.slice(end);
        ultimaCeldaActiva.focus();
        ultimaCeldaActiva.setSelectionRange(cursorPos, cursorPos);
      }
    }
  });
});