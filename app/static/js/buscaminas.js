// app/static/js/buscaminas.js

document.addEventListener('DOMContentLoaded', () => {
    const tableroDiv = document.getElementById('tablero');
    const btnNuevo = document.getElementById('btn-nuevo-juego');
    const estadoJuego = document.getElementById('estado-juego');
    const selectorN = document.getElementById('sel-n');
    const selectorM = document.getElementById('sel-m');
    const selectorMinas = document.getElementById('sel-minas');

    let N, M, NUM_MINAS;
    let matriz = [];
    let juegoActivo = false;
    let celdasReveladas = 0;

    const PISTA_COLORES = ['', 'pista-1', 'pista-2', 'pista-3', 'pista-4', 'pista-5', 'pista-6', 'pista-7', 'pista-8'];

    function inicializarJuego() {
        N = parseInt(selectorN.value); // Filas
        M = parseInt(selectorM.value); // Columnas
        NUM_MINAS = parseInt(selectorMinas.value);
        
        const totalCeldas = N * M;

        if (NUM_MINAS <= 0 || N < 1 || M < 1) {
             showModal("Error de configuración: Las dimensiones y el número de minas deben ser positivos.");
             estadoJuego.textContent = "Error de configuración.";
             juegoActivo = false;
             return;
        }

        if (NUM_MINAS >= totalCeldas) {
            showModal(`Error: El número de minas (${NUM_MINAS}) no puede ser igual o mayor al total de celdas (${totalCeldas}).`);
            estadoJuego.textContent = "Error de configuración.";
            juegoActivo = false;
            return;
        }

        celdasReveladas = 0;
        juegoActivo = true;
        estadoJuego.textContent = "Juego en curso...";
        
        tableroDiv.innerHTML = '';
        tableroDiv.style.gridTemplateColumns = `repeat(${M}, 1fr)`;
        tableroDiv.style.gridTemplateRows = `repeat(${N}, 1fr)`;

        matriz = Array.from({ length: N }, () => Array(M).fill(0));

        // 1. Colocar minas (Matriz Binaria M)
        let minasRestantes = NUM_MINAS;
        while (minasRestantes > 0) {
            const r = Math.floor(Math.random() * N);
            const c = Math.floor(Math.random() * M);
            if (matriz[r][c] !== 'M') {
                matriz[r][c] = 'M';
                minasRestantes--;
            }
        }

        // 2. Calcular números (Operador de Convolución)
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < M; c++) {
                if (matriz[r][c] !== 'M') {
                    matriz[r][c] = contarMinasAdyacentes(r, c);
                }
            }
        }

        // 3. Renderizar tablero (Matriz visible)
        renderizarTablero();
    }

    function contarMinasAdyacentes(r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < N && nc >= 0 && nc < M) {
                    if (matriz[nr][nc] === 'M') {
                        count++;
                    }
                }
            }
        }
        return count;
    }

    function renderizarTablero() {
        tableroDiv.innerHTML = '';
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < M; c++) {
                const celda = document.createElement('div');
                celda.className = 'celda';
                celda.dataset.r = r;
                celda.dataset.c = c;
                celda.addEventListener('click', (e) => revelar(r, c));
                celda.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    marcarBandera(r, c, celda);
                });
                tableroDiv.appendChild(celda);
            }
        }
    }

    function revelar(r, c) {
        if (!juegoActivo || r < 0 || r >= N || c < 0 || c >= M) return;

        const celda = tableroDiv.querySelector(`[data-r="${r}"][data-c="${c}"]`);
        if (celda.classList.contains('revelada') || celda.classList.contains('bandera')) return;
        
        celda.classList.add('revelada');
        celdasReveladas++;

        const valor = matriz[r][c];

        if (valor === 'M') {
            celda.classList.add('mina');
            celda.textContent = '💣';
            terminarJuego(false);
            return;
        }

        if (valor > 0) {
            celda.textContent = valor;
            celda.classList.add(PISTA_COLORES[valor]);
        } else {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    revelar(r + dr, c + dc);
                }
            }
        }

        verificarVictoria();
    }
    
    function marcarBandera(r, c, celda) {
        if (!juegoActivo || celda.classList.contains('revelada')) return;
        
        if (celda.classList.contains('bandera')) {
            celda.classList.remove('bandera');
            celda.textContent = '';
        } else {
            celda.classList.add('bandera');
            celda.textContent = '🚩';
        }
    }

    function verificarVictoria() {
        const totalCeldasSeguras = (N * M) - NUM_MINAS;
        if (celdasReveladas >= totalCeldasSeguras) {
            terminarJuego(true);
        }
    }

    function terminarJuego(victoria) {
        juegoActivo = false;
        if (victoria) {
            estadoJuego.textContent = "¡Victoria! Todos los elementos sin mina fueron identificados.";
        } else {
            estadoJuego.textContent = "¡Derrota! Minas reveladas.";
        }
        
        // Revelar todas las minas
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < M; c++) {
                if (matriz[r][c] === 'M') {
                    const celda = tableroDiv.querySelector(`[data-r="${r}"][data-c="${c}"]`);
                    if (celda) {
                        celda.classList.add('mina');
                        celda.textContent = '💣';
                    }
                }
            }
        }
    }

    btnNuevo.addEventListener('click', inicializarJuego);

    inicializarJuego();
});