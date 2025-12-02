document.addEventListener('DOMContentLoaded', () => {
    const tableroDiv = document.getElementById('tablero-sudoku');
    const btnNuevo = document.getElementById('btn-nuevo');
    const btnValidar = document.getElementById('btn-validar');
    const btnResolver = document.getElementById('btn-resolver'); // Opcional
    const estadoMsg = document.getElementById('estado-msg');
    const dificultadSel = document.getElementById('sel-dificultad');

    let solucion = [];
    let tableroActual = [];

    // --- Lógica del Sudoku ---

    function esValido(tablero, fila, col, num) {
        // Chequear fila
        for (let x = 0; x < 9; x++) if (tablero[fila][x] === num) return false;
        // Chequear columna
        for (let x = 0; x < 9; x++) if (tablero[x][col] === num) return false;
        // Chequear caja 3x3
        let startRow = fila - fila % 3, startCol = col - col % 3;
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                if (tablero[i + startRow][j + startCol] === num) return false;
        return true;
    }

    function resolverSudoku(tablero) {
        for (let fila = 0; fila < 9; fila++) {
            for (let col = 0; col < 9; col++) {
                if (tablero[fila][col] === 0) {
                    // Intentar números 1-9 aleatorizados para generar tableros distintos
                    let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                    for (let num of nums) {
                        if (esValido(tablero, fila, col, num)) {
                            tablero[fila][col] = num;
                            if (resolverSudoku(tablero)) return true;
                            tablero[fila][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    function generarTablero() {
        // 1. Crear tablero vacío
        let tablero = Array.from({ length: 9 }, () => Array(9).fill(0));
        
        // 2. Llenar diagonalmente (las 3 cajas independientes) para asegurar aleatoriedad valida
        for (let i = 0; i < 9; i = i + 3) {
            llenarCaja(tablero, i, i);
        }

        // 3. Resolver el resto
        resolverSudoku(tablero);
        
        // Copiar solución
        solucion = JSON.parse(JSON.stringify(tablero));

        // 4. Quitar números según dificultad
        let pistas = parseInt(dificultadSel.value) || 40;
        let intentos = 81 - pistas;
        while (intentos > 0) {
            let r = Math.floor(Math.random() * 9);
            let c = Math.floor(Math.random() * 9);
            if (tablero[r][c] !== 0) {
                tablero[r][c] = 0;
                intentos--;
            }
        }
        tableroActual = tablero;
    }

    function llenarCaja(tablero, filaInicio, colInicio) {
        let num;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                do {
                    num = Math.floor(Math.random() * 9) + 1;
                } while (!esSeguroEnCaja(tablero, filaInicio, colInicio, num));
                tablero[filaInicio + i][colInicio + j] = num;
            }
        }
    }

    function esSeguroEnCaja(tablero, filaInicio, colInicio, num) {
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                if (tablero[filaInicio + i][colInicio + j] === num) return false;
        return true;
    }

    // --- Renderizado ---

    function renderizar() {
        tableroDiv.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const celda = document.createElement('div');
                celda.className = 'sudoku-celda';
                
                // Bordes inferiores para separar bloques (filas 2 y 5, base 0)
                if (r === 2 || r === 5) {
                    celda.classList.add('borde-abajo');
                }

                const input = document.createElement('input');
                input.type = 'text'; // Usamos text para mejor control que number
                input.inputMode = 'numeric';
                input.maxLength = 1;
                input.className = 'sudoku-input';
                input.dataset.r = r;
                input.dataset.c = c;

                const val = tableroActual[r][c];
                if (val !== 0) {
                    input.value = val;
                    input.readOnly = true;
                    input.classList.add('fija');
                } else {
                    // Eventos para inputs vacíos
                    input.addEventListener('input', (e) => {
                        // Solo permitir números 1-9
                        const v = e.target.value;
                        if (!/^[1-9]$/.test(v)) {
                            e.target.value = '';
                        }
                        limpiarValidacion();
                    });
                    
                    // Navegación con flechas
                    input.addEventListener('keydown', (e) => moverFoco(e, r, c));
                }

                celda.appendChild(input);
                tableroDiv.appendChild(celda);
            }
        }
    }

    function moverFoco(e, r, c) {
        let nr = r, nc = c;
        if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
        else if (e.key === 'ArrowDown') nr = Math.min(8, r + 1);
        else if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1);
        else if (e.key === 'ArrowRight') nc = Math.min(8, c + 1);
        else return;

        e.preventDefault();
        const nextInput = document.querySelector(`input[data-r="${nr}"][data-c="${nc}"]`);
        if (nextInput) nextInput.focus();
    }

    function limpiarValidacion() {
        estadoMsg.textContent = '';
        document.querySelectorAll('.sudoku-input').forEach(i => {
            i.classList.remove('error', 'exito');
        });
    }

    function validarJuego() {
        let errores = 0;
        let vacios = 0;
        const inputs = document.querySelectorAll('.sudoku-input');

        inputs.forEach(inp => {
            const r = parseInt(inp.dataset.r);
            const c = parseInt(inp.dataset.c);
            const val = parseInt(inp.value) || 0;

            if (val === 0) {
                vacios++;
            } else if (val !== solucion[r][c]) {
                inp.classList.add('error');
                errores++;
            } else {
                inp.classList.add('exito');
            }
        });

        if (errores > 0) {
            estadoMsg.textContent = `Hay ${errores} errores. Sigue intentando.`;
            estadoMsg.className = "text-red-600 font-bold mt-2";
        } else if (vacios > 0) {
            estadoMsg.textContent = "Vas bien, pero aún faltan casillas.";
            estadoMsg.className = "text-blue-600 font-bold mt-2";
        } else {
            estadoMsg.textContent = "¡Felicidades! ¡Sudoku completado correctamente!";
            estadoMsg.className = "text-green-600 font-bold mt-2 text-lg";
            // Efecto confetti o modal si quisieras
        }
    }

    function nuevoJuego() {
        limpiarValidacion();
        estadoMsg.textContent = 'Generando...';
        setTimeout(() => {
            generarTablero();
            renderizar();
            estadoMsg.textContent = '';
        }, 50);
    }

    btnNuevo.addEventListener('click', nuevoJuego);
    btnValidar.addEventListener('click', validarJuego);
    
    if (btnResolver) {
        btnResolver.addEventListener('click', () => {
            if(!confirm("¿Rendirse? Se mostrará la solución.")) return;
            tableroActual = JSON.parse(JSON.stringify(solucion));
            renderizar();
            estadoMsg.textContent = "Solución mostrada.";
        });
    }

    // Iniciar
    nuevoJuego();
});