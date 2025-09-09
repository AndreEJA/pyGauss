# sistema_ecuaciones.py
# Método: Gauss-Jordan (RREF) con registro de pasos
# Sin NumPy/SciPy. Usa fracciones exactas (fractions.Fraction).
from fractions import Fraction

def frac_str(x: Fraction) -> str:
    """Imprime 0, enteros o fracciones a/b sin flotantes."""
    if x == 0:
        return "0"
    if x.denominator == 1:
        return f"{x.numerator}"
    return f"{x.numerator}/{x.denominator}"

class StepRecorder:
    """Registra una lista (descripcion, snapshot_de_matriz)."""
    def __init__(self):
        self.pasos = []

    def add(self, descripcion: str, matriz):
        # Guardar una copia de la matriz en este instante
        snap = [fila.copy() for fila in matriz]
        self.pasos.append((descripcion, snap))

    def imprimir(self):
        for i, (desc, mat) in enumerate(self.pasos, 1):
            print(f"Paso {i}: {desc}")
            for fila in mat:
                # Imprimir sin corchetes ni comillas
                print("   ".join(frac_str(x) for x in fila[:-1]) + "  |  " + frac_str(fila[-1]))
            print()

class SistemaEcuaciones:
    """
    Resuelve sistemas lineales por Gauss-Jordan (forma reducida por filas - RREF).
    - Detecta solución única, infinitas o ninguna.
    - Opcionalmente registra y muestra cada operación fila.
    - Funciona con matrices cuadradas y no cuadradas.
    """
    def __init__(self, matriz_aumentada, registrar_pasos=True):
        # Convierte todo a Fraction por seguridad, por si vienen floats.
        self.matriz = [[Fraction(x) for x in fila] for fila in matriz_aumentada]
        self.filas = len(self.matriz)
        self.columnas = len(self.matriz[0]) if self.filas > 0 else 0  # incluye término independiente
        self.variables = self.columnas - 1
        self.registrar_pasos = registrar_pasos
        self.recorder = StepRecorder() if registrar_pasos else None
        self.pivot_cols = []  # columnas donde hay pivote (para soluciones)

    # ------------ Utilidades de impresión ------------
    def _mostrar(self, titulo=None):
        if titulo:
            print(titulo)
        for fila in self.matriz:
            # Imprimir sin corchetes ni comillas
            print("   ".join(frac_str(x) for x in fila[:-1]) + "  |  " + frac_str(fila[-1]))
        print()

    # ------------ Gauss-Jordan (RREF) ------------
    def gauss_jordan(self):
        fila_pivote = 0
        if self.registrar_pasos:
            self.recorder.add("Matriz inicial", self.matriz)

        for col in range(self.variables):
            # 1) Buscar fila con coeficiente no nulo en esta columna
            fila_con_pivote = None
            for f in range(fila_pivote, self.filas):
                if self.matriz[f][col] != 0:
                    fila_con_pivote = f
                    break
            if fila_con_pivote is None:
                continue

            # 2) Intercambiar si el pivote no está ya en la fila_pivote
            if fila_con_pivote != fila_pivote:
                self.matriz[fila_pivote], self.matriz[fila_con_pivote] = self.matriz[fila_con_pivote], self.matriz[fila_pivote]
                if self.registrar_pasos:
                    self.recorder.add(f"R{fila_pivote+1} ↔ R{fila_con_pivote+1}", self.matriz)

            # 3) Normalizar la fila del pivote a 1
            pivote = self.matriz[fila_pivote][col]
            if pivote != 1:
                for j in range(col, self.columnas):
                    self.matriz[fila_pivote][j] /= pivote
                if self.registrar_pasos:
                    self.recorder.add(f"R{fila_pivote+1} ← (1/{frac_str(pivote)})·R{fila_pivote+1}", self.matriz)

            # 4) Eliminar el resto de filas en esa columna
            for f in range(self.filas):
                if f == fila_pivote:
                    continue
                factor = self.matriz[f][col]
                if factor != 0:
                    for j in range(col, self.columnas):
                        self.matriz[f][j] -= factor * self.matriz[fila_pivote][j]
                    if self.registrar_pasos:
                        self.recorder.add(
                            f"R{f+1} ← R{f+1} − ({frac_str(factor)})·R{fila_pivote+1}",
                            self.matriz
                        )

            self.pivot_cols.append(col)
            fila_pivote += 1
            if fila_pivote == self.filas:
                break

        if self.registrar_pasos:
            self.recorder.add("Matriz en RREF (final)", self.matriz)

    # ------------ Análisis de soluciones ------------
    def _hay_inconsistencia(self) -> bool:
        for fila in self.matriz:
            if all(x == 0 for x in fila[:-1]) and fila[-1] != 0:
                return True
        return False

    def _rank(self) -> int:
        no_nulas = 0
        for fila in self.matriz:
            if any(x != 0 for x in fila[:-1]):
                no_nulas += 1
        return no_nulas

    def _solucion_unica(self) -> bool:
        return (not self._hay_inconsistencia()) and (self._rank() == self.variables)

    # ------------ Construcción de soluciones ------------
    def _extraer_solucion_unica(self):
        sol = [Fraction(0) for _ in range(self.variables)]
        for i, col in enumerate(self.pivot_cols):
            if col < self.variables and i < self.filas:
                sol[col] = self.matriz[i][-1]
        return sol

    def _solucion_parametrica(self):
        n = self.variables
        pivot_set = set(self.pivot_cols)
        libres = [j for j in range(n) if j not in pivot_set]
        tnames = [f"t{k+1}" for k in range(len(libres))]

        nombres = [f"x{i+1}" for i in range(n)]
        expr = {}

        for idx, j in enumerate(libres):
            expr[nombres[j]] = tnames[idx]

        for i, c in enumerate(self.pivot_cols):
            if c >= n or i >= self.filas:
                continue
            rhs = frac_str(self.matriz[i][-1])
            for idx, j in enumerate(libres):
                a = self.matriz[i][j]
                if a != 0:
                    if a > 0:
                        rhs += f" - {frac_str(a)}*{tnames[idx]}"
                    else:
                        rhs += f" + {frac_str(-a)}*{tnames[idx]}"
            expr[nombres[c]] = rhs

        return nombres, expr

    # ------------ API principal ------------
    def resolver(self, mostrar_pasos=True):
        self.gauss_jordan()

        if self._hay_inconsistencia():
            print("❌ El sistema es inconsistente: no tiene solución.\n")
        else:
            r = self._rank()
            if r < self.variables:
                print("♾️ El sistema tiene infinitas soluciones (indeterminado).")
                nombres, expr = self._solucion_parametrica()
                print("Parámetros libres: ", ", ".join(sorted(set(expr[v] for v in expr if expr[v].startswith('t')))))
                print("Expresiones:")
                for v in nombres:
                    if v in expr:
                        print(f"  {v} = {expr[v]}")
                    else:
                        print(f"  {v} = 0")
                print()
            else:
                sol = self._extraer_solucion_unica()
                print("✅ Solución única:")
                for i, val in enumerate(sol):
                    print(f"  x{i+1} = {frac_str(val)}")
                print()

        if mostrar_pasos and self.registrar_pasos:
            print("=== Operaciones fila realizadas ===\n")
            self.recorder.imprimir()
