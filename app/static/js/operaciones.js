let ultimaCeldaActiva=null;

function crearTabla(filas, columnas, tablaId){
  const tabla=document.getElementById(tablaId);
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

function leerTabla(tablaId){
  const tabla=document.getElementById(tablaId);
  const datos=[];
  tabla.querySelectorAll('tbody tr').forEach(tr=>{
    const vals=[]; tr.querySelectorAll('td input').forEach(inp=> vals.push(inp.value.trim())); datos.push(vals);
  });
  return datos;
}

function mostrarResultado(resultado){
  const z=document.getElementById('zona-resultado'); const tabla=document.getElementById('tabla-resultado');
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


async function enviarOperacion(operacion){
  setMsg('Calculando...');
  const matriz1_str=leerTabla('tabla-matriz1');
  const matriz2_str=leerTabla('tabla-matriz2');
  const modo_precision=document.getElementById('sel-precision').value;
  const decimales=parseInt(document.getElementById('inp-decimales').value,10)||6;

  try{
    const resp=await fetch('/matrices/operaciones/operar',{method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify({matriz1: matriz1_str, matriz2: matriz2_str, operacion, modo_precision, decimales})});
    const js=await resp.json();
    if(!js.ok) throw new Error(js.error||'Error');
    mostrarResultado(js.resultado);
    setMsg('Listo.');
  }catch(err){
    setMsg('');
    showModal('Error: '+err.message);
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('btn-crear').addEventListener('click',()=>{
    const filas1=parseInt(document.getElementById('inp-filas1').value,10);
    const cols1=parseInt(document.getElementById('inp-columnas1').value,10);
    const cols2 = parseInt(document.getElementById('inp-columnas2').value,10);
    
    const operacion = document.getElementById('btn-crear').getAttribute('data-operacion');
    
    if (operacion === 'sumar') {
        const filas2 = parseInt(document.getElementById('inp-filas2').value,10);
        const cols2_sum = parseInt(document.getElementById('inp-columnas2').value,10);
        if (filas1 !== filas2 || cols1 !== cols2_sum) {
            showModal('Error: Las matrices deben tener las mismas dimensiones para poder sumarse.');
            return;
        }
    }
    
    if (operacion === 'multiplicar') {
        const filas2 = parseInt(document.getElementById('inp-filas2').value,10);
        const cols2_mult = parseInt(document.getElementById('inp-columnas2').value,10);
        if (cols1 !== filas2) {
            showModal('Error: El número de columnas de la primera matriz debe ser igual al número de filas de la segunda para la multiplicación.');
            return;
        }
    }

    if(!filas1||!cols1||filas1<=0||cols1<=0||!cols2||cols2<=0){
      showModal('Ingresa números válidos para las dimensiones.'); return; 
    }
    
    // Nueva lógica para Matriz x Vector(es)
    if (operacion === 'matriz_por_vector') {
        const entradasPorVector = cols1;
        crearTabla(filas1, cols1, 'tabla-matriz1');
        crearTabla(entradasPorVector, cols2, 'tabla-matriz2');
    } else {
        const filas2_generic = parseInt(document.getElementById('inp-filas2').value,10);
        crearTabla(filas1, cols1, 'tabla-matriz1');
        crearTabla(filas2_generic, cols2, 'tabla-matriz2');
    }

    document.getElementById('zona-matrices').classList.remove('hidden');
    document.getElementById('zona-resultado').classList.add('hidden');
  });

  const inpColumnas1 = document.getElementById('inp-columnas1');
  const valorFilas2 = document.getElementById('valor-filas2');

  if (inpColumnas1 && valorFilas2) {
      inpColumnas1.addEventListener('input', () => {
          valorFilas2.textContent = inpColumnas1.value;
      });
      // Inicializar el valor al cargar la página
      valorFilas2.textContent = inpColumnas1.value;
  }
  
  document.getElementById('btn-resolver').addEventListener('click', async ()=>{
      const operacion = document.getElementById('btn-crear').getAttribute('data-operacion');
      setMsg('Calculando...');
      const matriz1_str=leerTabla('tabla-matriz1');
      const matriz2_str=leerTabla('tabla-matriz2');
      const modo_precision=document.getElementById('sel-precision').value;
      const decimales=parseInt(document.getElementById('inp-decimales').value,10)||6;

      try{
          const resp=await fetch('/matrices/operaciones/operar',{method:'POST',headers:{'Content-Type':'application/json'},
              body: JSON.stringify({matriz1: matriz1_str, matriz2: matriz2_str, operacion, modo_precision, decimales})});
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
        }

        ultimaCeldaActiva.value = v.slice(0, start) + toInsert + v.slice(end);
        ultimaCeldaActiva.focus();
        ultimaCeldaActiva.setSelectionRange(cursorPos, cursorPos);
      }
    }
  });
});