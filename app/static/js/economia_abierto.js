document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btn-generar');
    const btnResolver = document.getElementById('btn-resolver');
    const tabla = document.getElementById('tabla-abierto');
    const checkDecimales = document.getElementById('check-decimales');
    
    let numSectores = 3;

    generarTabla();

    btnGenerar.addEventListener('click', generarTabla);

    function generarTabla() {
        const val = parseInt(document.getElementById('inp-sectores').value);
        if(!val || val < 2) return;
        numSectores = val;
        
        tabla.innerHTML = '';
        
        // --- ENCABEZADO (THEAD) ---
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        
        // Celda esquina vacía
        const thCorner = document.createElement('th');
        thCorner.className = "row-head"; 
        thCorner.textContent = "De \\ Para";
        trHead.appendChild(thCorner);

        // Columnas de Sectores
        for(let i=0; i<numSectores; i++) {
            const th = document.createElement('th');
            
            const inputName = document.createElement('input');
            inputName.type = "text";
            inputName.value = `Dpto ${String.fromCharCode(65+i)}`; 
            
            inputName.className = "w-full bg-transparent text-center font-bold outline-none border-b border-transparent focus:border-blue-500 placeholder-slate-400";
            inputName.style.color = "var(--text)"; 
            
            inputName.addEventListener('input', (e) => actualizarNombres(e.target.value, i));
            
            th.appendChild(inputName);
            trHead.appendChild(th);
        }

        // Columna de Demanda Externa
        const thDemanda = document.createElement('th');
        thDemanda.textContent = "Demanda (d)";
        thDemanda.className = "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-l-2 border-slate-300 dark:border-slate-600";
        trHead.appendChild(thDemanda);

        thead.appendChild(trHead);
        tabla.appendChild(thead);

        // --- CUERPO (TBODY) ---
        const tbody = document.createElement('tbody');
        for(let r=0; r<numSectores; r++) {
            const tr = document.createElement('tr');
            
            // Encabezado de fila
            const thRow = document.createElement('th');
            thRow.className = "row-head text-left px-3";
            thRow.id = `row-name-${r}`;
            thRow.textContent = `Dpto ${String.fromCharCode(65+r)}`;
            tr.appendChild(thRow);

            // Celdas de la Matriz A
            for(let c=0; c<numSectores; c++) {
                const td = document.createElement('td');
                td.className = "celda"; 
                
                const inp = document.createElement('input');
                inp.type = "text";
                inp.placeholder = "0";
                inp.dataset.type = "A";
                
                // Input transparente
                inp.className = "w-full h-full !bg-transparent text-center outline-none text-slate-900 dark:text-white placeholder-slate-400";
                
                td.appendChild(inp);
                tr.appendChild(td);
            }

            // Celda de Demanda (d)
            const tdDemanda = document.createElement('td');
            tdDemanda.className = "celda bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-slate-300 dark:border-slate-600";
            
            const inpD = document.createElement('input');
            inpD.type = "text";
            inpD.placeholder = "0";
            inpD.dataset.type = "d";
            
            // Input transparente sobre fondo azul
            inpD.className = "w-full h-full !bg-transparent text-center font-bold outline-none text-blue-700 dark:text-blue-300 placeholder-blue-300";
            
            tdDemanda.appendChild(inpD);
            tr.appendChild(tdDemanda);

            tbody.appendChild(tr);
        }
        tabla.appendChild(tbody);

        document.getElementById('zona-tabla').classList.remove('hidden');
        document.getElementById('zona-resultado').classList.add('hidden');
    }

    function actualizarNombres(nuevoNombre, idx) {
        const rowHeader = document.getElementById(`row-name-${idx}`);
        if(rowHeader) rowHeader.textContent = nuevoNombre || `Dpto ${String.fromCharCode(65+idx)}`;
    }

    btnResolver.addEventListener('click', async () => {
        const nombres = [];
        tabla.querySelectorAll('thead input').forEach(inp => nombres.push(inp.value));

        const matrizA = [];
        const vectorD = [];
        
        const filas = tabla.querySelectorAll('tbody tr');
        filas.forEach(tr => {
            const filaA = [];
            tr.querySelectorAll('input[data-type="A"]').forEach(inp => filaA.push(inp.value.trim() || "0"));
            matrizA.push(filaA);
            const valD = tr.querySelector('input[data-type="d"]').value.trim() || "0";
            vectorD.push(valD);
        });

        const usarDecimales = checkDecimales.checked;

        try {
            const originalText = btnResolver.textContent;
            btnResolver.textContent = "Calculando...";
            btnResolver.disabled = true;

            const resp = await fetch('/matrices/aplicaciones/economia-abierto/resolver', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    matriz_A: matrizA, 
                    vector_d: vectorD,
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
            btnResolver.disabled = false;
        }
    });

    function mostrarResultados(data) {
        document.getElementById('zona-resultado').classList.remove('hidden');
        const tbody = document.getElementById('tabla-resultados-body');
        tbody.innerHTML = '';

        if (data.status !== 'unique') {
            tbody.innerHTML = `<tr><td colspan="2" class="p-4 text-center text-red-500 font-bold">El sistema no tiene solución única (Matriz singular).</td></tr>`;
            return;
        }

        data.solucion.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition-colors";
            
                tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-900">${item.sector}</td>
                <td class="px-4 py-3 text-right font-bold text-blue-600 font-mono text-lg">${item.valor}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('zona-resultado').scrollIntoView({ behavior: 'smooth' });
    }
});