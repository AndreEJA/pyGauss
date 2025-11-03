let ultimaCeldaActiva=null;

function crearTabla(filas, columnas, containerDiv, index){
  const tableId = `tabla-matriz${index}`;
  const h4 = document.createElement('h4');
  h4.className = 'text-base font-semibold text-slate-900 mb-2';
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

function setMsg(t) {
  const el = document.getElementById('msg');
  if (el) {
    el.textContent = t || '';
  } else {
    // Para que no se rompa si no existe en el HTML
    console.log('[suma-escalar]', t || '');
  }
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

  
  document.getElementById('btn-resolver').addEventListener('click', async () => {
    const numMatrices = parseInt(document.getElementById('inp-cantidad-matrices').value, 10);
    const { matrices, escalares } = leerMatricesYEscalares(numMatrices);

    if (matrices.length !== numMatrices || escalares.length !== numMatrices) {
      showModal('Error: Faltan datos de matrices o escalares. Asegúrate de crear la matriz primero.');
      return;
    }

    setMsg('Calculando...');
    const modo_precision = document.getElementById('sel-precision').value;
    const decimales = parseInt(document.getElementById('inp-decimales').value, 10) || 6;

    try {
      const resp = await fetch('/matrices/operaciones/operar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrices_str: matrices,
          escalares_str: escalares,
          operacion: 'suma_escalar_multiple', // <- TAL CUAL
          modo_precision,
          decimales
        })
      });

      const js = await resp.json();
      console.log('[suma-escalar] respuesta del backend:', js);  // útil para revisar en consola

      if (!js.ok) throw new Error(js.error || 'Error');

       // Mostrar matriz resultado
       mostrarResultado(js.resultado);

       // Mostrar u ocultar la sección de pasos
       const pasosDiv = document.getElementById('pasos');
 
       if (js.pasos && Array.isArray(js.pasos) && js.pasos.length > 0) {
         pasosDiv.style.display = 'block';
         pasosDiv.innerHTML = ''; // limpiamos
 
         js.pasos.forEach((paso, idx) => {
           const stepWrapper = document.createElement('div');
           stepWrapper.className = 'mb-6';
 
           // Título del paso
           const h4 = document.createElement('h4');
           h4.className = 'font-semibold mb-2 text-slate-800';
           h4.textContent = paso.titulo || `Paso ${idx + 1}`;
           stepWrapper.appendChild(h4);
 
           // Tabla de la matriz
           // Tabla de la matriz (estilo estándar pyGauss)
          if (paso.matriz && Array.isArray(paso.matriz)) {
            const tablaWrap = document.createElement('div');
            tablaWrap.className = 'overflow-auto max-h-[50vh] rounded-xl border border-slate-200 mb-2';

            const table = document.createElement('table');
            table.className = 'matrix-table w-full text-center text-slate-800';

            const tbody = document.createElement('tbody');
            paso.matriz.forEach(fila => {
              const tr = document.createElement('tr');
              fila.forEach(val => {
                const td = document.createElement('td');
                td.className = 'px-4 py-2 border border-slate-200';
                td.textContent = val;
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tablaWrap.appendChild(table);
            stepWrapper.appendChild(tablaWrap);
          }

 
           pasosDiv.appendChild(stepWrapper);
         });
       } else {
         pasosDiv.innerHTML = '';
         pasosDiv.style.display = 'none';
       }

      setMsg('Listo.');
    } catch (err) {
      console.error('[suma-escalar] error:', err);
      setMsg('');
      showModal('Error: ' + err.message);
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