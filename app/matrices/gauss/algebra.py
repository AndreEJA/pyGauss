from fractions import Fraction
import math, ast

def es_casi_cero(x, tol=1e-12):
    try: return abs(float(x)) < tol
    except Exception: return False

def identity(n):
    """Crea una matriz identidad de tamaño n x n con Fracciones."""
    I = [[Fraction(0) for _ in range(n)] for _ in range(n)]
    for i in range(n):
        I[i][i] = Fraction(1)
    return I

def a_fraccion_si_aplica(x):
    if isinstance(x, Fraction): return x
    if isinstance(x, int): return Fraction(x,1)
    if isinstance(x, float): return Fraction(x).limit_denominator(10_000)
    if isinstance(x, str):
        try: return Fraction(x)
        except: return float(x)
    return x

class FormateadorNumeros:
    def __init__(self, modo='fraccion', decimales=6):
        self.modo = modo; self.decimales = max(0,int(decimales))
    def fmt(self, x):
        return self._fmt_frac(x) if self.modo=='fraccion' else self._fmt_dec(x)
    def _fmt_frac(self, x):
        if isinstance(x, Fraction):
            return f"{x.numerator}" if x.denominator==1 else f"{x.numerator}/{x.denominator}"
        try:
            f=float(x); 
            if es_casi_cero(f): return "0"
            return ("{0:.10f}".format(f)).rstrip('0').rstrip('.')
        except: return str(x)
    def _fmt_dec(self, x):
        try:
            f=float(x); 
            if es_casi_cero(f): return "0"
            s=(f"{{0:.{self.decimales}f}}" ).format(f)
            if self.decimales>0: s=s.rstrip('0').rstrip('.')
            return s
        except: return str(x)

class EvaluadorSeguro:
    nombres={'pi':math.pi,'e':math.e,'sin':math.sin,'cos':math.cos,'tan':math.tan,'sqrt':math.sqrt,'raiz':math.sqrt}
    ops_bin=(ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow); ops_uni=(ast.UAdd,ast.USub)
    
    def evaluar(self, expr: str):
        # Permitir fracciones explícitas como "3/4" o funciones
        allowed_names = {
            'sin': math.sin, 'cos': math.cos, 'tan': math.tan, 
            'sqrt': math.sqrt, 'pi': math.pi, 'e': math.e,
            'frac': lambda a, b: Fraction(a, b)
        }
        expr = str(expr).replace('^', '**')
        try:
            node = ast.parse(expr, mode='eval')
            return self._evaluate_node(node.body, allowed_names)
        except Exception as e:
            # Fallback simple para números directos
            try: return a_fraccion_si_aplica(float(expr))
            except: raise ValueError(f"Expresión no válida: {expr}")

    def _evaluate_node(self, node, allowed_names):
        if isinstance(node, (ast.Expression, ast.Module)):
            return self._evaluate_node(node.body, allowed_names)
        elif isinstance(node, ast.Num):
            return a_fraccion_si_aplica(node.n)
        elif isinstance(node, ast.Constant):
            return a_fraccion_si_aplica(node.value)
        elif isinstance(node, ast.BinOp):
            left = self._evaluate_node(node.left, allowed_names)
            right = self._evaluate_node(node.right, allowed_names)
            if isinstance(node.op, ast.Add): return left + right
            elif isinstance(node.op, ast.Sub): return left - right
            elif isinstance(node.op, ast.Mult): return left * right
            elif isinstance(node.op, ast.Div):
                if right == 0: raise ValueError("División por cero")
                return left / right
            elif isinstance(node.op, ast.Pow): return left ** right
        elif isinstance(node, ast.UnaryOp):
            operand = self._evaluate_node(node.operand, allowed_names)
            if isinstance(node.op, ast.USub): return -operand
            elif isinstance(node.op, ast.UAdd): return operand
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in allowed_names:
                func = allowed_names[node.func.id]
                args = [self._evaluate_node(arg, allowed_names) for arg in node.args]
                return func(*args)
        elif isinstance(node, ast.Name):
            if node.id in allowed_names: return allowed_names[node.id]
        raise ValueError("Nodo no soportado")

class PasoOperacion:
    def __init__(self, desc, matriz, fmt, col_pivote=None):
        self.descripcion=desc
        self.matriz=[[fmt(v) for v in f] for f in matriz]
        self.col_pivote = col_pivote

class MatrizAumentada:
    def __init__(self, datos):
        if not datos or any(len(f)!=len(datos[0]) for f in datos): raise ValueError("La matriz debe ser rectangular y no vacía.")
        self.m=len(datos); self.np1=len(datos[0]); self.n=self.np1-1
        self.a=[[a_fraccion_si_aplica(v) for v in fila] for fila in datos]
    def copiar(self): 
        return [f[:] for f in self.a]

class ResolverGaussJordan:
    def __init__(self, formateador:FormateadorNumeros):
        self.pasos=[]; self.formateador=formateador
    def _reg(self, d, A, col_pivote=None): 
        self.pasos.append(PasoOperacion(d,A,self.formateador.fmt, col_pivote))
    def _es_incompatible(self, A, m, n):
        for r in range(m):
            if all(es_casi_cero(A[r][c]) for c in range(n)) and not es_casi_cero(A[r][n]):
                return True
        return False
    def resolver(self, matriz:MatrizAumentada):
        A=matriz.copiar(); m, np1, n = matriz.m, matriz.np1, matriz.n
        if self._es_incompatible(A, m, n):
            return {"pasos": [], "final": {"tipo": "inconsistente", "descripcion": "El sistema es inconsistente.", "solucion": None, "pivotes": [], "variables_libres": []}}
        
        fila=0; piv_cols=[]
        for col in range(n):
            piv=None; maxabs=0
            for r in range(fila,m):
                try: val=abs(float(A[r][col]))
                except: val=0
                if val>maxabs and not es_casi_cero(A[r][col]): maxabs=val; piv=r
            if piv is None: continue
            if piv!=fila:
                A[fila],A[piv]=A[piv],A[fila]
                self._reg(f"F{fila+1} ⇄ F{piv+1}", A, col_pivote=col)
            piv_cols.append(col)
            pv=A[fila][col]
            for j in range(np1): A[fila][j]=A[fila][j]/pv
            self._reg(f"F{fila+1} ← F{fila+1} / {self.formateador.fmt(pv)}", A, col_pivote=col)
            for r in range(m):
                if r==fila: continue
                factor=A[r][col]
                if es_casi_cero(factor): continue
                for j in range(np1): A[r][j] -= factor * A[fila][j]
                self._reg(f"F{r+1} ← F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}", A, col_pivote=col)
            fila+=1
            if fila==m: break
            
        tipo, sol, desc, pivotes = self._analizar(A,m,n)
        sol_dict = {f"x{i+1}": self.formateador.fmt(sol[i]) for i in range(len(sol))} if sol else None
        
        return {
            "pasos": [{"descripcion":p.descripcion,"matriz":p.matriz,"col_pivote":p.col_pivote} for p in self.pasos],
            "final": {"tipo": tipo, "descripcion": desc, "solucion": sol_dict, "pivotes": [c+1 for c in pivotes], "variables_libres": []}
        }

    def _analizar(self,A,m,n):
        for r in range(m):
            if all(es_casi_cero(A[r][c]) for c in range(n)) and not es_casi_cero(A[r][n]):
                return "inconsistente", None, "Sistema inconsistente.", []
        piv_cols=[]
        for r in range(m):
            for c in range(n):
                if not es_casi_cero(A[r][c]): piv_cols.append(c); break
        if len(piv_cols)==n:
            x=[0]*n
            for r in range(n): x[r]=A[r][n]
            return "unica", x, "Solución única.", piv_cols
        return "infinita", None, "Infinitas soluciones.", piv_cols

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
            piv = None; maxabs = 0
            for r in range(fila, m):
                try: val = abs(float(A[r][col]))
                except: val = 0
                if val > maxabs and not es_casi_cero(A[r][col]):
                    maxabs = val; piv = r
            if piv is None: continue
            if piv != fila:
                A[fila], A[piv] = A[piv], A[fila]
                self._reg(f"F{fila+1} ⇄ F{piv+1}", A, col_pivote=col)
            pv = A[fila][col]
            if es_casi_cero(pv): continue
            for j in range(col, np1): A[fila][j] = A[fila][j] / pv
            self._reg(f"F{fila+1} / {self.formateador.fmt(pv)}", A, col_pivote=col)
            for r in range(fila + 1, m):
                factor = A[r][col]
                if es_casi_cero(factor): continue
                for j in range(col, np1): A[r][j] -= factor * A[fila][j]
                self._reg(f"F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}", A, col_pivote=col)
            fila += 1
            if fila == m: break
        
        pasos = [{"descripcion": p.descripcion, "matriz": p.matriz, "col_pivote": p.col_pivote} for p in self.pasos]
        return {"pasos": pasos, "final": {"descripcion": "Matriz triangular superior."}}


# =========================
# NUEVO: Sistema → Matriz
# =========================

def sistema_a_matriz(sistema_str, variables_str=None):
    """
    Convierte un sistema de ecuaciones lineales (en texto) en:
      - A_list: matriz de coeficientes (lista de listas de Fraction/float)
      - b_list: términos independientes
      - vars_order: lista de nombres de variables en el orden usado

    Ejemplo de sistema_str:
        \"\"\"2x + 3y - 5z = 10
        x - y + 4z = 7
        -x + 2y + z = 1\"\"\"

    variables_str (opcional): cadena tipo "x, y, z".
    Si se deja vacío, se detectan las variables y se ordenan alfabéticamente.
    """
    from sympy import symbols, Eq, linear_eq_to_matrix
    from sympy.parsing.sympy_parser import (
        parse_expr,
        standard_transformations,
        implicit_multiplication_application,
        convert_xor,
    )

    # Habilitar:
    #  - 2x  →  2*x
    #  - 3(x+1) → 3*(x+1)
    #  - x^2 → x**2
    transformations = standard_transformations + (
        implicit_multiplication_application,
        convert_xor,
    )

    # 1. Limpiar líneas
    lineas = [l.strip() for l in str(sistema_str).splitlines() if l.strip()]
    if not lineas:
        raise ValueError("No se encontraron ecuaciones en el sistema.")

    ecuaciones = []
    simbolos_encontrados = set()

    # 2. Parsear cada línea como ecuación con '='
    for linea in lineas:
        if "=" not in linea:
            raise ValueError(f"La ecuación '{linea}' no contiene signo '='.")
        izquierda, derecha = linea.split("=", 1)
        izquierda = izquierda.strip()
        derecha = derecha.strip()

        # 👇 aquí está el cambio importante
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

    # 3. Determinar el orden de variables
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
        # Orden alfabético por nombre
        vars_order = sorted(list(simbolos_encontrados), key=lambda s: s.name)

    # 4. Obtener matriz A y vector b (objetos SymPy)
    A_sym, b_sym = linear_eq_to_matrix(ecuaciones, vars_order)

    # 5. Convertir a listas Python compatibles con el resto del módulo
    A_list = [
        [a_fraccion_si_aplica(str(val)) for val in fila]
        for fila in A_sym.tolist()
    ]
    b_list = [a_fraccion_si_aplica(str(val)) for val in list(b_sym)]

    vars_nombres = [str(v) for v in vars_order]

    return A_list, b_list, vars_nombres



def sistema_a_matriz_aumentada(sistema_str, variables_str=None):
    """
    Azúcar sintáctico: devuelve directamente la matriz aumentada [A | b]
    y el orden de variables.
    """
    A, b, vars_nombres = sistema_a_matriz(sistema_str, variables_str)
    matriz_aug = [fila + [b_i] for fila, b_i in zip(A, b)]
    return matriz_aug, vars_nombres
