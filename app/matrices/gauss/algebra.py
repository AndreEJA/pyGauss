from fractions import Fraction
import math, ast, re


def es_casi_cero(x, tol=1e-12):
    try:
        return abs(float(x)) < tol
    except Exception:
        return False


def identity(n):
    """Crea una matriz identidad de tamaño n x n con Fracciones."""
    I = [[Fraction(0) for _ in range(n)] for _ in range(n)]
    for i in range(n):
        I[i][i] = Fraction(1)
    return I


def a_fraccion_si_aplica(x):
    if isinstance(x, Fraction):
        return x
    if isinstance(x, int):
        return Fraction(x, 1)
    if isinstance(x, float):
        return Fraction(x).limit_denominator(10_000)
    if isinstance(x, str):
        try:
            return Fraction(x)
        except Exception:
            return float(x)
    return x


class FormateadorNumeros:
    def __init__(self, modo="fraccion", decimales=6):
        self.modo = modo
        self.decimales = max(0, int(decimales))

    def fmt(self, x):
        return self._fmt_frac(x) if self.modo == "fraccion" else self._fmt_dec(x)

    def _fmt_frac(self, x):
        if isinstance(x, Fraction):
            return (
                f"{x.numerator}"
                if x.denominator == 1
                else f"{x.numerator}/{x.denominator}"
            )
        try:
            f = float(x)
            if es_casi_cero(f):
                return "0"
            return ("{0:.10f}".format(f)).rstrip("0").rstrip(".")
        except Exception:
            return str(x)

    def _fmt_dec(self, x):
        try:
            f = float(x)
            if es_casi_cero(f):
                return "0"
            # construir string de formato dinámicamente
            s = ("{0:." + str(self.decimales) + "f}").format(f)
            if self.decimales > 0:
                s = s.rstrip("0").rstrip(".")
            return s
        except Exception:
            return str(x)


# ========= Normalizador de expresiones "bonitas" =========


def normalizar_expresion(expr: str) -> str:
    """
    Convierte una expresión "bonita" (sen, tg, raiz, pi, ln, log10, log_n(x),
    valor absoluto, multiplicación implícita, potencias con ^, etc.)
    a una expresión de sintaxis Python compatible con el evaluador.
    """
    if not isinstance(expr, str):
        expr = str(expr)
    s = expr.strip()

    # trigonométricas en español -> nombres de Python
    s = re.sub(r"asen", "asin", s, flags=re.IGNORECASE)
    s = re.sub(r"acos", "acos", s, flags=re.IGNORECASE)
    s = re.sub(r"atan", "atan", s, flags=re.IGNORECASE)
    s = re.sub(r"sen", "sin", s, flags=re.IGNORECASE)
    s = re.sub(r"\btg", "tan", s, flags=re.IGNORECASE)
    s = re.sub(r"cos", "cos", s, flags=re.IGNORECASE)

    # logs
    s = re.sub(r"\bln\(", "log(", s, flags=re.IGNORECASE)
    s = re.sub(r"log10\(", "log10(", s, flags=re.IGNORECASE)
    # log con subíndice 10 escrito como carácter especial
    s = s.replace("log₁₀(", "log10(")
    # log_n(x) -> log(x, n)
    s = re.sub(
        r"log_([0-9A-Za-z]+)\s*\(\s*([^)]+)\s*\)",
        r"log(\2, \1)",
        s,
        flags=re.IGNORECASE,
    )

    # raíz: símbolo de raíz -> sqrt()
    s = s.replace("√(", "sqrt(")
    s = re.sub(r"√([A-Za-z0-9.]+)", r"sqrt(\1)", s)

    # pi
    s = s.replace("π", "pi")

    # operaciones unicode
    s = s.replace("×", "*").replace("·", "*").replace("÷", "/")

    # potencias ^ -> **
    s = s.replace("^", "**")

    # valor absoluto |x|
    s = re.sub(r"\|([^|]+)\|", r"abs(\1)", s)

    # multiplicación implícita: 2x, 3(x+1)
    s = re.sub(
        r"(^|[^0-9A-Za-z_.])(\d+(?:\.\d+)?)\s*([A-Za-z(])",
        r"\1\2*\3",
        s,
    )
    # a(x) -> a*(x) si 'a' es letra
    s = re.sub(
        r"(^|[^A-Za-z0-9_])([A-Za-z])\s*\(",
        r"\1\2*(",
        s,
    )
    # )( -> )*(
    s = re.sub(r"\)\s*\(", ")*(", s)
    # )x -> )*x
    s = re.sub(r"\)\s*([A-Za-z])", r")*\1", s)

    return s


# ========= Evaluador seguro =========


class EvaluadorSeguro:
    nombres = {
        "pi": math.pi,
        "e": math.e,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "sqrt": math.sqrt,
        "raiz": math.sqrt,
    }
    ops_bin = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)
    ops_uni = (ast.UAdd, ast.USub)

    def evaluar(self, expr: str):
        # nombres permitidos en expresiones
        allowed_names = {
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "asin": math.asin,
            "acos": math.acos,
            "atan": math.atan,
            "sqrt": math.sqrt,
            "raiz": math.sqrt,
            "pi": math.pi,
            "e": math.e,
            "log": math.log,  # log(x) o log(x, base)
            "log10": math.log10,
            "abs": abs,
            "frac": lambda a, b: Fraction(a, b),
        }

        expr = normalizar_expresion(str(expr))

        try:
            node = ast.parse(expr, mode="eval")
            return self._evaluate_node(node.body, allowed_names)
        except Exception:
            # Fallback simple para números directos
            try:
                return a_fraccion_si_aplica(float(expr))
            except Exception:
                raise ValueError(f"Expresión no válida: {expr}")

    def _evaluate_node(self, node, allowed_names):
        # Número literal
        if isinstance(node, ast.Num):  # Python < 3.8
            return a_fraccion_si_aplica(node.n)
        if isinstance(node, ast.Constant):  # Python 3.8+
            return a_fraccion_si_aplica(node.value)

        # Operaciones binarias: +, -, *, /, **
        if isinstance(node, ast.BinOp):
            left = self._evaluate_node(node.left, allowed_names)
            right = self._evaluate_node(node.right, allowed_names)

            if isinstance(node.op, ast.Add):
                return left + right
            elif isinstance(node.op, ast.Sub):
                return left - right
            elif isinstance(node.op, ast.Mult):
                return left * right
            elif isinstance(node.op, ast.Div):
                if right == 0:
                    raise ValueError("División por cero")
                return left / right
            elif isinstance(node.op, ast.Pow):
                return left ** right

        # Operaciones unarias: +x, -x
        if isinstance(node, ast.UnaryOp):
            operand = self._evaluate_node(node.operand, allowed_names)
            if isinstance(node.op, ast.USub):
                return -operand
            elif isinstance(node.op, ast.UAdd):
                return operand

        # Llamadas a funciones: sin(...), sqrt(...), log(...), frac(...)
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in allowed_names:
                func = allowed_names[node.func.id]
                args = [self._evaluate_node(arg, allowed_names) for arg in node.args]
                return func(*args)
            else:
                raise ValueError(f"Función no permitida: {getattr(node.func, 'id', '?')}")

        # Nombres sueltos: pi, e, etc.
        if isinstance(node, ast.Name):
            if node.id in allowed_names:
                return allowed_names[node.id]
            raise ValueError(f"Nombre no permitido: {node.id}")

        # Cualquier otra cosa: no lo soportamos
        raise ValueError("Nodo no soportado en la expresión")


# ========= Clases de pasos y matriz =========


class PasoOperacion:
    def __init__(self, desc, matriz, fmt, col_pivote=None):
        self.descripcion = desc
        self.matriz = [[fmt(v) for v in f] for f in matriz]
        self.col_pivote = col_pivote


class MatrizAumentada:
    def __init__(self, datos):
        if not datos or any(len(f) != len(datos[0]) for f in datos):
            raise ValueError("La matriz debe ser rectangular y no vacía.")
        self.m = len(datos)
        self.np1 = len(datos[0])
        self.n = self.np1 - 1
        self.a = [[a_fraccion_si_aplica(v) for v in fila] for fila in datos]

    def copiar(self):
        return [f[:] for f in self.a]


# ========= Gauss-Jordan =========


class ResolverGaussJordan:
    def __init__(self, formateador: FormateadorNumeros):
        self.pasos = []
        self.formateador = formateador

    def _reg(self, d, A, col_pivote=None):
        self.pasos.append(PasoOperacion(d, A, self.formateador.fmt, col_pivote))

    def _es_incompatible(self, A, m, n):
        for r in range(m):
            if all(es_casi_cero(A[r][c]) for c in range(n)) and not es_casi_cero(
                A[r][n]
            ):
                return True
        return False

    def resolver(self, matriz: MatrizAumentada):
        A = matriz.copiar()
        m, np1, n = matriz.m, matriz.np1, matriz.n

        if self._es_incompatible(A, m, n):
            return {
                "pasos": [],
                "final": {
                    "tipo": "inconsistente",
                    "descripcion": "El sistema es inconsistente.",
                    "solucion": None,
                    "pivotes": [],
                    "variables_libres": [],
                },
            }

        fila = 0
        piv_cols = []
        for col in range(n):
            piv = None
            maxabs = 0
            for r in range(fila, m):
                try:
                    val = abs(float(A[r][col]))
                except Exception:
                    val = 0
                if val > maxabs and not es_casi_cero(A[r][col]):
                    maxabs = val
                    piv = r
            if piv is None:
                continue
            if piv != fila:
                A[fila], A[piv] = A[piv], A[fila]
                self._reg(f"F{fila+1} ⇄ F{piv+1}", A, col_pivote=col)
            piv_cols.append(col)
            pv = A[fila][col]
            for j in range(np1):
                A[fila][j] = A[fila][j] / pv
            self._reg(
                f"F{fila+1} ← F{fila+1} / {self.formateador.fmt(pv)}",
                A,
                col_pivote=col,
            )
            for r in range(m):
                if r == fila:
                    continue
                factor = A[r][col]
                if es_casi_cero(factor):
                    continue
                for j in range(np1):
                    A[r][j] -= factor * A[fila][j]
                self._reg(
                    f"F{r+1} ← F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}",
                    A,
                    col_pivote=col,
                )
            fila += 1
            if fila == m:
                break

        tipo, sol, desc, pivotes = self._analizar(A, m, n)
        sol_dict = (
            {f"x{i+1}": self.formateador.fmt(sol[i]) for i in range(len(sol))}
            if sol
            else None
        )

        return {
            "pasos": [
                {
                    "descripcion": p.descripcion,
                    "matriz": p.matriz,
                    "col_pivote": p.col_pivote,
                }
                for p in self.pasos
            ],
            "final": {
                "tipo": tipo,
                "descripcion": desc,
                "solucion": sol_dict,
                "pivotes": [c + 1 for c in pivotes],
                "variables_libres": [],
            },
        }

    def _analizar(self, A, m, n):
        # Filas del tipo 0 0 ... 0 | b != 0
        for r in range(m):
            if all(es_casi_cero(A[r][c]) for c in range(n)) and not es_casi_cero(
                A[r][n]
            ):
                return "inconsistente", None, "Sistema inconsistente.", []

        # columnas pivote
        piv_cols = []
        for r in range(m):
            for c in range(n):
                if not es_casi_cero(A[r][c]):
                    piv_cols.append(c)
                    break

        if len(piv_cols) == n:
            x = [0] * n
            for r in range(n):
                x[r] = A[r][n]
            return "unica", x, "Solución única.", piv_cols

        return "infinita", None, "Infinitas soluciones.", piv_cols


# ========= Gauss (triangular superior) =========


class ResolverGauss:
    def __init__(self, formateador: FormateadorNumeros):
        self.pasos = []
        self.formateador = formateador

    def _reg(self, d, A, col_pivote=None):
        self.pasos.append(PasoOperacion(d, A, self.formateador.fmt, col_pivote))

    def resolver(self, matriz: MatrizAumentada):
        A = matriz.copiar()
        m, np1, n = matriz.m, matriz.np1, matriz.n
        fila = 0
        for col in range(n):
            piv = None
            maxabs = 0
            for r in range(fila, m):
                try:
                    val = abs(float(A[r][col]))
                except Exception:
                    val = 0
                if val > maxabs and not es_casi_cero(A[r][col]):
                    maxabs = val
                    piv = r
            if piv is None:
                continue
            if piv != fila:
                A[fila], A[piv] = A[piv], A[fila]
                self._reg(f"F{fila+1} ⇄ F{piv+1}", A, col_pivote=col)
            pv = A[fila][col]
            if es_casi_cero(pv):
                continue
            for j in range(col, np1):
                A[fila][j] = A[fila][j] / pv
            self._reg(
                f"F{fila+1} / {self.formateador.fmt(pv)}", A, col_pivote=col
            )
            for r in range(fila + 1, m):
                factor = A[r][col]
                if es_casi_cero(factor):
                    continue
                for j in range(col, np1):
                    A[r][j] -= factor * A[fila][j]
                self._reg(
                    f"F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}",
                    A,
                    col_pivote=col,
                )
            fila += 1
            if fila == m:
                break

        pasos = [
            {
                "descripcion": p.descripcion,
                "matriz": p.matriz,
                "col_pivote": p.col_pivote,
            }
            for p in self.pasos
        ]
        return {
            "pasos": pasos,
            "final": {"descripcion": "Matriz triangular superior."},
        }


# =========================
# Sistema → Matriz
# =========================


def sistema_a_matriz(sistema_str, variables_str=None):
    """
    Convierte un sistema de ecuaciones lineales (en texto) en:
      - A_list: matriz de coeficientes
      - b_list: términos independientes
      - vars_order: lista de nombres de variables
    """
    from sympy import symbols, Eq, linear_eq_to_matrix
    from sympy.parsing.sympy_parser import (
        parse_expr,
        standard_transformations,
        implicit_multiplication_application,
        convert_xor,
    )

    transformations = standard_transformations + (
        implicit_multiplication_application,
        convert_xor,
    )

    lineas = [l.strip() for l in str(sistema_str).splitlines() if l.strip()]
    if not lineas:
        raise ValueError("No se encontraron ecuaciones en el sistema.")

    ecuaciones = []
    simbolos_encontrados = set()

    for linea in lineas:
        if "=" not in linea:
            raise ValueError(f"La ecuación '{linea}' no contiene signo '='.")
        izquierda, derecha = linea.split("=", 1)
        izquierda = izquierda.strip()
        derecha = derecha.strip()

        expr_izq = parse_expr(izquierda, transformations=transformations)
        expr_der = parse_expr(derecha, transformations=transformations)

        eq = Eq(expr_izq, expr_der)
        ecuaciones.append(eq)
        simbolos_encontrados |= eq.free_symbols

    if not simbolos_encontrados:
        raise ValueError(
            "No se detectaron variables en el sistema. "
            "Asegúrate de usar letras para las incógnitas (x, y, z, ...)."
        )

    if variables_str:
        nombres = [
            v.strip()
            for v in str(variables_str).replace(";", ",").split(",")
            if v.strip()
        ]
        if not nombres:
            raise ValueError("No se pudo interpretar el orden de variables.")
        vars_order = symbols(nombres)
    else:
        vars_order = sorted(list(simbolos_encontrados), key=lambda s: s.name)

    A_sym, b_sym = linear_eq_to_matrix(ecuaciones, vars_order)

    A_list = [
        [a_fraccion_si_aplica(str(val)) for val in fila] for fila in A_sym.tolist()
    ]
    b_list = [a_fraccion_si_aplica(str(val)) for val in list(b_sym)]

    vars_nombres = [str(v) for v in vars_order]

    return A_list, b_list, vars_nombres


def sistema_a_matriz_aumentada(sistema_str, variables_str=None):
    """
    Devuelve directamente la matriz aumentada [A | b]
    y el orden de variables.
    """
    A, b, vars_nombres = sistema_a_matriz(sistema_str, variables_str)
    matriz_aug = [fila + [b_i] for fila, b_i in zip(A, b)]
    return matriz_aug, vars_nombres
