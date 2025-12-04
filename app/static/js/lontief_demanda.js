// app/static/js/leontief_demanda.js

document.addEventListener('DOMContentLoaded', () => {
    const btnGenerar = document.getElementById('btn-generar');
    const btnResolver = document.getElementById('btn-resolver');
    const tablaC = document.getElementById('tabla-C');
    const tablaX = document.getElementById('tabla-X');
    const checkDecimales = document.getElementById('check-decimales');
    
    let numSectores = 2;

    // Inicializar
    generarTablas();

    btnGenerar.addEventListener('click', generarTablas);

    function generarTablas() {
        const val = parseInt(document.getElementById('inp-sectores').value);
        if(!val || val < 2) return;
        numSectores = val;
        
        // --- 1. MATRIZ C (Insumo-Producto) ---
        tablaC.innerHTML = '';
        const theadC = document.createElement('thead');
        const trHeadC = document.createElement('tr');
        
        // Esquina vacía
        const thCorner = document.createElement('th');
        thCorner.className = "row-head";
        trHeadC.appendChild(thCorner);

        // Columnas (Inputs para nombres)
        for(let i=0; i<numSectores; i++) {
            const th = document.createElement('th');
            const inputName = document.createElement('input');
            inputName.type = "text";
            inputName.value = i === 0 ? "Química" : (i === 1 ? "Textil" : `Ind. ${String.fromCharCode(65+i)}`); 
            inputName.className = "w-full bg-transparent text-center font-bold outline-none border-b border-transparent focus:border-purple-500 placeholder-slate-400 text-slate-700";
            inputName.dataset.idx = i;
            
            // Sincronizar nombres filas/columnas
            inputName.addEventListener('input', (e) => actualizarNombres(e.target.value, i));
            
            th.appendChild(inputName);
            trHeadC.appendChild(th);
        }
        theadC.appendChild(trHeadC);
        tablaC.appendChild(theadC);

        const tbodyC = document.createElement('tbody');
        for(let r=0; r<numSectores; r++) {
            const tr = document.createElement('tr');
            // Header Fila
            const thRow = document.createElement('th');
            thRow.className = "row-head text-left px-3";
            thRow.id = `row-name-${r}`;
            thRow.textContent = r === 0 ? "Química" : (r === 1 ? "Textil" : `Ind. ${String.fromCharCode(65+r)}`);
            tr.appendChild(thRow);

            for(let c=0; c<numSectores; c++) {
                const td = document.createElement('td');
                td.className = "celda";
                const inp = document.createElement('input');
                inp.type = "text";
                inp.placeholder = "0";
                inp.className = "w-full h-full !bg-transparent text-center outline-none";
                td.appendChild(inp);
                tr.appendChild(td);
            }
            tbodyC.appendChild(tr);
        }
        tablaC.appendChild(tbodyC);

        // --- 2. VECTOR X (Producción Total) ---
        tablaX.innerHTML = '';
        const tbodyX = document.createElement('tbody');
        // Espaciador para alinear visualmente con el header de la matriz
        const trSpacer = document.createElement('tr');
        trSpacer.innerHTML = '<td class="p-2 bg-transparent border-none"></td>'; 
        tablaX.appendChild(document.createElement('thead')).appendChild(trSpacer);

        for(let r=0; r<numSectores; r++) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.className = "celda border-2 border-slate-300"; // Resaltar que es un vector
            const inp = document.createElement('input');
            inp.type = "text";
            inp.placeholder = "Total";
            inp.className = "w-full h-full !bg-transparent text-center outline-none font-semibold text-blue-600";
            td.appendChild(inp);
            tr.appendChild(td);
            tbodyX.appendChild(tr);
        }
        tablaX.appendChild(tbodyX);

        document.getElementById('zona-tabla').classList.remove('hidden');
        document.getElementById('zona-resultado').classList.add('hidden');
    }

    function actualizarNombres(nuevoNombre, idx) {
        // Actualiza el header de la fila correspondiente en Matriz C
        const rowHeader = document.getElementById(`row-name-${idx}`);
        if(rowHeader) rowHeader.textContent = nuevoNombre;
    }

    btnResolver.addEventListener('click', async () => {
        // Recolectar Nombres
        const nombres = [];
        tablaC.querySelectorAll('thead input').forEach(inp => nombres.push(inp.value));

        // Recolectar Matriz C
        const matrizC = [];
        tablaC.querySelectorAll('tbody tr').forEach(tr => {
            const fila = [];
            tr.querySelectorAll('td input').forEach(inp => fila.push(inp.value.trim() || "0"));
            matrizC.push(fila);
        });

        // Recolectar Vector X
        const vectorX = [];
        tablaX.querySelectorAll('tbody input').forEach(inp => vectorX.push(inp.value.trim() || "0"));

        const usarDecimales = checkDecimales.checked;

        try {
            const originalText = btnResolver.textContent;
            btnResolver.textContent = "Calculando...";
            btnResolver.disabled = true;

            const resp = await fetch('/matrices/aplicaciones/leontief-demanda/resolver', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    matriz_C: matrizC, 
                    vector_X: vectorX,
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

            renderizarResultados(json.resultados);

        } catch (e) {
            console.error(e);
            alert("Error de conexión");
            btnResolver.disabled = false;
        }
    });

    function renderizarResultados(resultados) {
        const contenedor = document.getElementById('contenedor-tarjetas');
        contenedor.innerHTML = '';
        
        resultados.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 items-center";
            
            // Sección Izquierda: Valor Numérico Grande
            const left = document.createElement('div');
            left.className = "text-center md:text-left min-w-[120px]";
            left.innerHTML = `
                <div class="text-xs text-slate-500 uppercase tracking-wide mb-1">Demanda Interna</div>
                <div class="text-3xl font-extrabold text-purple-600">${item.valor}</div>
                <div class="text-xs text-slate-400 mt-1">de ${item.produccion_total} Total</div>
            `;

            // Sección Derecha: Texto Interpretativo
            const right = document.createElement('div');
            right.className = "flex-1 text-sm text-slate-700 leading-relaxed";
            // Icono simple + texto
            right.innerHTML = `
                <div class="flex gap-2">
                    <span class="text-xl">🏭</span>
                    <p>${item.texto}</p>
                </div>
            `;

            card.appendChild(left);
            card.appendChild(right);
            contenedor.appendChild(card);
        });

        document.getElementById('zona-resultado').classList.remove('hidden');
        document.getElementById('zona-resultado').scrollIntoView({ behavior: 'smooth' });
    }
});