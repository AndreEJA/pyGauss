document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener referencias
    const btnGenerar = document.getElementById('btn-generar');
    const btnResolver = document.getElementById('btn-resolver');
    const tabla = document.getElementById('tabla-economia');
    const checkDecimales = document.getElementById('check-decimales');
    const zonaTabla = document.getElementById('zona-tabla');
    const zonaResultado = document.getElementById('zona-resultado');

    // Seguridad: si no estamos en la página correcta, salir
    if (!tabla || !btnGenerar) return;

    let vectorBase = []; 
    let nombresSectores = [];
    let numSectores = 3;

    // Generar tabla al cargar
    generarTabla();

    btnGenerar.addEventListener('click', generarTabla);

    function generarTabla() {
        const inp = document.getElementById('inp-sectores');
        const val = inp ? parseInt(inp.value) : 3;
        
        if(!val || val < 2) return;
        numSectores = val;
        
        tabla.innerHTML = '';
        
        // --- THEAD ---
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        
        // Celda esquina
        const thCorner = document.createElement('th');
        thCorner.className = "row-head"; 
        thCorner.textContent = "De \\ Para";
        trHead.appendChild(thCorner);

        for(let i=0; i<numSectores; i++) {
            const th = document.createElement('th');
            
            // Input nombre sector
            const inputName = document.createElement('input');
            inputName.type = "text";
            inputName.value = `Sector ${i+1}`;
            
            // CORRECCIÓN TABLA: Fondo transparente para respetar el estilo de la celda
            inputName.className = "w-full bg-transparent text-center font-bold outline-none border-b border-transparent focus:border-rose-500 placeholder-slate-400";
            inputName.style.color = "var(--text)"; 
            
            inputName.dataset.colIdx = i;
            inputName.addEventListener('input', (e) => actualizarNombres(e.target.value, i));
            
            th.appendChild(inputName);
            trHead.appendChild(th);
        }
        thead.appendChild(trHead);
        tabla.appendChild(thead);

        // --- TBODY ---
        const tbody = document.createElement('tbody');
        for(let r=0; r<numSectores; r++) {
            const tr = document.createElement('tr');
            
            // Header Fila
            const thRow = document.createElement('th');
            thRow.className = "row-head text-left px-3";
            thRow.id = `row-name-${r}`;
            thRow.textContent = `Sector ${r+1}`;
            tr.appendChild(thRow);

            // Celdas
            for(let c=0; c<numSectores; c++) {
                const td = document.createElement('td');
                td.className = "celda"; 
                
                const inp = document.createElement('input');
                inp.type = "text";
                inp.placeholder = "0";

                // CORRECCIÓN TABLA: Fondo transparente para ver bien la celda blanca/oscura
                inp.className = "w-full h-full !bg-transparent text-center outline-none text-slate-900 dark:text-white placeholder-slate-400";
                
                td.appendChild(inp);
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        tabla.appendChild(tbody);

        // Mostrar zona
        zonaTabla.classList.remove('hidden');
        zonaResultado.classList.add('hidden');
    }

    function actualizarNombres(nuevoNombre, idx) {
        const rowHeader = document.getElementById(`row-name-${idx}`);
        if(rowHeader) rowHeader.textContent = nuevoNombre || `Sector ${idx+1}`;
    }

    btnResolver.addEventListener('click', async () => {
        nombresSectores = [];
        tabla.querySelectorAll('thead input').forEach(inp => nombresSectores.push(inp.value));

        const datos = [];
        const filas = tabla.querySelectorAll('tbody tr');
        filas.forEach(tr => {
            const filaVals = [];
            tr.querySelectorAll('td input').forEach(inp => filaVals.push(inp.value.trim() || "0"));
            datos.push(filaVals);
        });

        if(datos.length === 0) return;
        
        // Verificación segura del checkbox
        const usarDecimales = checkDecimales ? checkDecimales.checked : false;

        try {
            const originalText = btnResolver.textContent;
            btnResolver.textContent = "Calculando...";
            btnResolver.disabled = true;
            
            const resp = await fetch('/matrices/aplicaciones/economia/resolver', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    tabla: datos, 
                    nombres: nombresSectores,
                    usar_decimales: usarDecimales 
                })
            });

            const json = await resp.json();
            btnResolver.textContent = originalText;
            btnResolver.disabled = false;

            if(!json.ok) {
                alert("Error: " + (json.error || "Desconocido"));
                return;
            }

            vectorBase = json.vector_base || [];
            mostrarResultados(json);
            inicializarCalculadora();

        } catch (e) {
            console.error(e);
            alert("Error de conexión");
            btnResolver.disabled = false;
        }
    });

    function mostrarResultados(data) {
        zonaResultado.classList.remove('hidden');
        document.getElementById('txt-interpretacion').innerHTML = data.interpretacion;

        const ul = document.getElementById('lista-solucion');
        ul.innerHTML = '';
        data.resultado.lines.forEach(linea => {
            const li = document.createElement('li');
            li.className = "flex items-center gap-2 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0";
            // Resaltar variables P(...)
            let formatted = linea.replace(/(P\(.*?\))/g, '<span class="text-rose-600 dark:text-rose-400 font-bold">$1</span>');
            li.innerHTML = `<span class="text-rose-500 font-bold">›</span> <span>${formatted}</span>`;
            ul.appendChild(li);
        });
        
        zonaResultado.scrollIntoView({ behavior: 'smooth' });
    }

    // --- AQUÍ ESTABA EL PROBLEMA PRINCIPAL DE LA CAPTURA ---
    function inicializarCalculadora() {
        const grid = document.getElementById('grid-calculadora');
        grid.innerHTML = '';

        if (!vectorBase || vectorBase.length === 0 || vectorBase.every(v => v === 0)) {
            grid.innerHTML = '<p class="col-span-3 text-center text-slate-500 italic">No hay soluciones variables para calcular.</p>';
            return;
        }

        nombresSectores.forEach((nombre, idx) => {
            const div = document.createElement('div');
            div.className = "flex flex-col";
            
            const label = document.createElement('label');
            label.className = "text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1";
            label.textContent = nombre;
            
            const input = document.createElement('input');
            input.type = "number";
            
            // CORRECCIÓN CALCULADORA:
            // Usamos la clase 'input' global para que herede los colores de tu styles.css.
            // Eliminamos las clases 'bg-white' o 'dark:bg-slate-800' manuales que causaban el conflicto.
            input.className = "input w-full px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none";
            
            input.placeholder = "0";
            input.dataset.idx = idx;
            
            const valorInicial = vectorBase[idx] * 100; 
            input.value = Number(valorInicial.toFixed(2));

            input.addEventListener('input', (e) => recalcularEscenarios(idx, e.target.value));

            div.appendChild(label);
            div.appendChild(input);
            grid.appendChild(div);
        });
    }

    function recalcularEscenarios(idxOrigen, valorNuevo) {
        // Selector actualizado para que coincida con la nueva estructura (aunque .input lo cubre)
        const inputs = document.querySelectorAll('#grid-calculadora input');
        const val = parseFloat(valorNuevo);
        
        if (isNaN(val) || vectorBase[idxOrigen] === 0) return;

        const factor = val / vectorBase[idxOrigen];

        inputs.forEach(inp => {
            const i = parseInt(inp.dataset.idx);
            if (i !== idxOrigen) {
                const nuevoVal = vectorBase[i] * factor;
                inp.value = Number(nuevoVal.toFixed(2));
            }
        });
    }
});