document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btn-generar');
    const btnResolver = document.getElementById('btn-resolver');
    const tabla = document.getElementById('tabla-economia');
    const checkDecimales = document.getElementById('check-decimales');
    
    let numSectores = 3;

    // Inicializar tabla al cargar
    generarTabla();

    btnGenerar.addEventListener('click', generarTabla);

    function generarTabla() {
        const val = parseInt(document.getElementById('inp-sectores').value);
        if(!val || val < 2) return;
        numSectores = val;
        
        tabla.innerHTML = '';
        
        // --- THEAD ---
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        trHead.className = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-600";
        
        const thCorner = document.createElement('th');
        thCorner.className = "p-3 text-left border-r border-slate-200 dark:border-slate-600";
        thCorner.textContent = "De \\ Para:";
        trHead.appendChild(thCorner);

        for(let i=0; i<numSectores; i++) {
            const th = document.createElement('th');
            th.className = "p-2 min-w-[120px] border-r border-slate-200 dark:border-slate-600 last:border-0";
            
            const inputName = document.createElement('input');
            inputName.type = "text";
            inputName.value = `Sector ${i+1}`;
            inputName.className = "w-full bg-transparent text-center font-bold text-slate-800 dark:text-slate-200 border-b border-transparent focus:border-rose-500 outline-none placeholder-slate-400 transition-colors";
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
            tr.className = "border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";
            
            const thRow = document.createElement('th');
            thRow.className = "p-3 text-left font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-600";
            thRow.id = `row-name-${r}`;
            thRow.textContent = `Sector ${r+1}`;
            tr.appendChild(thRow);

            for(let c=0; c<numSectores; c++) {
                const td = document.createElement('td');
                td.className = "p-2 border-r border-slate-100 dark:border-slate-700 last:border-0";
                const inp = document.createElement('input');
                inp.type = "text";
                inp.className = "w-full bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 rounded-md py-2 px-2 text-center shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all";
                inp.placeholder = "0";
                td.appendChild(inp);
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        tabla.appendChild(tbody);

        document.getElementById('zona-tabla').classList.remove('hidden');
        document.getElementById('zona-resultado').classList.add('hidden');
    }

    function actualizarNombres(nuevoNombre, idx) {
        const rowHeader = document.getElementById(`row-name-${idx}`);
        if(rowHeader) rowHeader.textContent = nuevoNombre || `Sector ${idx+1}`;
    }

    btnResolver.addEventListener('click', async () => {
        const nombres = [];
        tabla.querySelectorAll('thead input').forEach(inp => nombres.push(inp.value));

        const datos = [];
        const filas = tabla.querySelectorAll('tbody tr');
        filas.forEach(tr => {
            const filaVals = [];
            tr.querySelectorAll('td input').forEach(inp => filaVals.push(inp.value.trim() || "0"));
            datos.push(filaVals);
        });

        if(datos.length === 0) return;

        // Leer opción de decimales
        const usarDecimales = checkDecimales.checked;

        try {
            const originalText = btnResolver.textContent;
            btnResolver.textContent = "Calculando...";
            btnResolver.disabled = true;
            
            const resp = await fetch('/matrices/aplicaciones/economia/resolver', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    tabla: datos, 
                    nombres: nombres,
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

            mostrarResultados(json);

        } catch (e) {
            console.error(e);
            alert("Error de conexión");
            btnResolver.textContent = "Calcular Precios de Equilibrio";
            btnResolver.disabled = false;
        }
    });

    function mostrarResultados(data) {
        document.getElementById('zona-resultado').classList.remove('hidden');
        
        // Interpretación HTML (permite negritas)
        document.getElementById('txt-interpretacion').innerHTML = data.interpretacion;

        const ul = document.getElementById('lista-solucion');
        ul.innerHTML = '';
        data.resultado.lines.forEach(linea => {
            const li = document.createElement('li');
            li.className = "flex items-center gap-2 py-1";
            
            // Un pequeño punto o icono para cada ecuación
            const icon = `<span class="text-rose-500 font-bold">›</span>`;
            
            // Resaltar las variables P(...)
            let formatted = linea.replace(/(P\(.*?\))/g, '<span class="text-rose-600 dark:text-rose-400 font-bold">$1</span>');
            
            li.innerHTML = `${icon} <span>${formatted}</span>`;
            ul.appendChild(li);
        });
        
        // Scroll suave hacia resultados
        document.getElementById('zona-resultado').scrollIntoView({ behavior: 'smooth' });
    }
});