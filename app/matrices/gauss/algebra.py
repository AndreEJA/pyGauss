# -*- coding: utf-8 -*-
from fractions import Fraction
import math, ast

def es_casi_cero(x, tol=1e-12):
    try: return abs(float(x)) < tol
    except Exception: return False

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

def a_fraccion_si_aplica(x):
    if isinstance(x, Fraction): return x
    if isinstance(x, int): return Fraction(x,1)
    if isinstance(x, float): return Fraction(x).limit_denominator(10_000)
    if isinstance(x, str):
        try: return Fraction(x)
        except: return float(x)
    return x

# Esta clase ha sido re-escrita para ser más robusta
class EvaluadorSeguro:
    def evaluar(self, expr: str):
        allowed_names = {
            'sin': math.sin, 'cos': math.cos, 'tan': math.tan, 
            'sqrt': math.sqrt, 'pi': math.pi, 'e': math.e,
            'frac': lambda a, b: Fraction(a, b)
        }
        
        # Reemplaza ^ por ** antes de evaluar
        expr = expr.replace('^', '**')
        
        try:
            node = ast.parse(expr, mode='eval')
            return self._evaluate_node(node.body, allowed_names)
        except Exception as e:
            raise ValueError(f"Expresión no permitida: {e}")

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
            else:
                raise ValueError("Operador binario no soportado")
        elif isinstance(node, ast.UnaryOp):
            operand = self._evaluate_node(node.operand, allowed_names)
            if isinstance(node.op, ast.USub):
                return -operand
            else:
                raise ValueError("Operador unario no soportado")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in allowed_names:
                func = allowed_names[node.func.id]
                args = [self._evaluate_node(arg, allowed_names) for arg in node.args]
                return func(*args)
            else:
                raise ValueError("Llamada a función no permitida")
        elif isinstance(node, ast.Name):
            if node.id in allowed_names:
                return allowed_names[node.id]
            else:
                raise ValueError(f"Nombre de variable no permitido: {node.id}")
        else:
            raise ValueError("Nodo de expresión no soportado")


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
            return {"pasos": [],
                    "final": {"tipo": "inconsistente", "descripcion": "El sistema es inconsistente (fila 0…0|b con b≠0).", "solucion": None,
                               "pivotes": [], "variables_libres": [f"x{i+1}" for i in range(n)]}}
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
            if es_casi_cero(pv): continue
            for j in range(np1): A[fila][j]=self._div(A[fila][j],pv)
            self._reg(f"Pivote en columna x{col+1}. F{fila+1} ← (1/{self.formateador.fmt(pv)})·F{fila+1}", A, col_pivote=col)
            for r in range(m):
                if r==fila: continue
                factor=A[r][col]
                if es_casi_cero(factor): continue
                for j in range(np1): A[r][j]=self._sub(A[r][j], self._mul(factor, A[fila][j]))
                self._reg(f"F{r+1} ← F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}", A, col_pivote=col)
                if self._es_incompatible(A, m, n):
                    pasos=[{"descripcion":p.descripcion,"matriz":p.matriz,"col_pivote": (p.col_pivote+1 if p.col_pivote is not None else None)} for p in self.pasos]
                    libres=[f"x{i+1}" for i in range(n) if i not in piv_cols]
                    return {"pasos": pasos, "final": {"tipo": "inconsistente", "descripcion": "El sistema es inconsistente (fila 0…0|b con b≠0).", "solucion": None,"pivotes": [c+1 for c in piv_cols], "variables_libres": libres}}
            fila+=1
            if fila==m: break
        tipo, sol, desc, pivotes_detectados = self._analizar(A,m,n)
        libres=[f"x{i+1}" for i in range(n) if i not in pivotes_detectados]
        pasos=[{"descripcion":p.descripcion,"matriz":p.matriz,"col_pivote": (p.col_pivote+1 if p.col_pivote is not None else None)} for p in self.pasos]
        sol_dict=None
        if sol is not None: sol_dict={f"x{i+1}": self.formateador.fmt(sol[i]) for i in range(len(sol))}
        return {"pasos": pasos, "final": {"tipo": tipo, "descripcion": desc, "solucion": sol_dict,"pivotes": [c+1 for c in pivotes_detectados], "variables_libres": libres}}
    def _analizar(self,A,m,n):
        for r in range(m):
            if all(es_casi_cero(A[r][c]) for c in range(n)) and not es_casi_cero(A[r][n]):
                return "inconsistente", None, "El sistema es inconsistente (sin solución).", set()
        piv_cols=set()
        for r in range(m):
            for c in range(n):
                if not es_casi_cero(A[r][c]): piv_cols.add(c); break
        if len(piv_cols)==n:
            x=[0]*n
            for r in range(m):
                piv=None
                for c in range(n):
                    if not es_casi_cero(A[r][c]): piv=c; break
                if piv is not None: x[piv]=A[r][n]
            return "unica", x, "El sistema tiene solución única.", piv_cols
        else:
            return "infinita", None, "El sistema tiene infinitas soluciones (variables libres).", piv_cols
    def _mul(self,a,b):
        if isinstance(a,Fraction) and isinstance(b,Fraction): return a*b
        return float(a)*float(b)
    def _sub(self,a,b):
        if isinstance(a,Fraction) and isinstance(b,Fraction): return a-b
        return float(a)-float(b)
    def _div(self,a,b):
        if isinstance(a,Fraction) and isinstance(b,Fraction):
            if b==0: raise ZeroDivisionError("División por cero")
            return a/b
        bf=float(b)
        if bf==0: raise ZeroDivisionError( "División por cero")
        return float(a)/bf
    
class ResolverGauss:
    """
    Método de Gauss (eliminación hacia adelante).
    Triangulariza la matriz aumentada sin reducir completamente.
    """
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
            # Buscar pivote
            piv = None
            maxabs = 0
            for r in range(fila, m):
                try:
                    val = abs(float(A[r][col]))
                except:
                    val = 0
                if val > maxabs and not es_casi_cero(A[r][col]):
                    maxabs = val
                    piv = r
            if piv is None:
                continue

            # Intercambio si hace falta
            if piv != fila:
                A[fila], A[piv] = A[piv], A[fila]
                self._reg(f"F{fila+1} ⇄ F{piv+1}", A, col_pivote=col)

            # Normalizar pivote
            pv = A[fila][col]
            if es_casi_cero(pv):
                continue
            for j in range(col, np1):
                A[fila][j] = A[fila][j] / pv
            self._reg(f"Pivote en x{col+1}. F{fila+1} ← (1/{self.formateador.fmt(pv)})·F{fila+1}", A, col_pivote=col)

            # Eliminar hacia abajo (no hacia arriba)
            for r in range(fila + 1, m):
                factor = A[r][col]
                if es_casi_cero(factor):
                    continue
                for j in range(col, np1):
                    A[r][j] = A[r][j] - factor * A[fila][j]
                self._reg(f"F{r+1} ← F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}", A, col_pivote=col)

            fila += 1
            if fila == m:
                break

        # Resultado: matriz triangular superior lista para sustitución
        pasos = [
            {"descripcion": p.descripcion, "matriz": p.matriz, "col_pivote": (p.col_pivote + 1 if p.col_pivote is not None else None)}
            for p in self.pasos
        ]
        return {"pasos": pasos, "final": {"descripcion": "Matriz triangular superior obtenida (lista para sustitución regresiva)."}}
