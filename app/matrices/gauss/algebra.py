# -*- coding: utf-8 -*-
# LÓGICA OOP DEL MÉTODO (nombres en español y comentarios cortos)
from fractions import Fraction
import math, ast

def es_casi_cero(x, tol=1e-12):
    """True si |x| < tol."""
    try: return abs(float(x)) < tol
    except Exception: return False

class FormateadorNumeros:
    """Formatea resultados como fracciones o decimales."""
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
    """Normaliza ints/floats/strings a Fraction cuando conviene."""
    if isinstance(x, Fraction): return x
    if isinstance(x, int): return Fraction(x,1)
    if isinstance(x, float): return Fraction(x).limit_denominator(10_000)
    if isinstance(x, str):
        try: return Fraction(x)
        except: return float(x)
    return x

class EvaluadorSeguro:
    """Evalúa expresiones con AST (solo operadores/funciones permitidas)."""
    nombres={'pi':math.pi,'e':math.e,'sin':math.sin,'cos':math.cos,'tan':math.tan,'sqrt':math.sqrt,'raiz':math.sqrt,'frac':lambda a,b:Fraction(a,b)}
    ops_bin=(ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow); ops_uni=(ast.UAdd,ast.USub)
    def evaluar(self,expr:str):
        tree=ast.parse(expr,mode='eval'); return self._eval(tree.body)
    def _eval(self,node):
        if isinstance(node,ast.Num): return a_fraccion_si_aplica(node.n)
        if isinstance(node,ast.Constant):
            v=node.value
            if isinstance(v,(int,float)): return a_fraccion_si_aplica(v)
            raise ValueError("Constante no permitida")
        if isinstance(node,ast.BinOp) and isinstance(node.op,self.ops_bin):
            a=self._eval(node.left); b=self._eval(node.right); return self._binop(a,b,node.op)
        if isinstance(node,ast.UnaryOp) and isinstance(node.op,self.ops_uni):
            v=self._eval(node.operand); return v if isinstance(node.op,ast.UAdd) else -v
        if isinstance(node,ast.Name):
            if node.id in self.nombres: return self.nombres[node.id]
            raise ValueError(f"Nombre no permitido: {node.id}")
        if isinstance(node,ast.Call):
            if isinstance(node.func,ast.Name) and node.func.id in self.nombres:
                fn=self.nombres[node.func.id]; args=[self._eval(a) for a in node.args]; return fn(*args)
            raise ValueError("Función no permitida")
        raise ValueError("Expresión no permitida")
    def _binop(self,a,b,op):
        # Opera con fracciones si ambos lo son; si no, cae a float.
        if isinstance(a,Fraction) and isinstance(b,Fraction):
            if isinstance(op,ast.Add): return a+b
            if isinstance(op,ast.Sub): return a-b
            if isinstance(op,ast.Mult): return a*b
            if isinstance(op,ast.Div):
                if b==0: raise ZeroDivisionError("División por cero")
                return a/b
            if isinstance(op,ast.Pow):
                if b.denominator==1 and b.numerator>=0: return a**b.numerator
                return float(a)**float(b)
        else:
            af=float(a) if isinstance(a,Fraction) else a; bf=float(b) if isinstance(b,Fraction) else b
            if isinstance(op,ast.Add): return af+bf
            if isinstance(op,ast.Sub): return af-bf
            if isinstance(op,ast.Mult): return af*bf
            if isinstance(op,ast.Div):
                if bf==0: raise ZeroDivisionError("División por cero")
                return af/bf
            if isinstance(op,ast.Pow): return af**bf
        raise ValueError("Operación no soportada")

class PasoOperacion:
    """DTO de un paso: descripción + matriz formateada."""
    def __init__(self, desc, matriz, fmt): self.descripcion=desc; self.matriz=[[fmt(v) for v in f] for f in matriz]

class MatrizAumentada:
    """Mantiene dimensiones y datos de la matriz aumentada."""
    def __init__(self, datos):
        if not datos or any(len(f)!=len(datos[0]) for f in datos): raise ValueError("La matriz debe ser rectangular y no vacía.")
        self.m=len(datos); self.np1=len(datos[0]); self.n=self.np1-1
        self.a=[[a_fraccion_si_aplica(v) for v in fila] for fila in datos]
    def copiar(self): 
        """Copia profunda de los datos para operar sin mutar el original."""
        return [f[:] for f in self.a]

class ResolverGaussJordan:
    """Aplica Gauss-Jordan con registro de pasos y diagnóstico final."""
    def __init__(self, formateador:FormateadorNumeros):
        self.pasos=[]; self.formateador=formateador
    def _reg(self, d, A): 
        """Registra un paso con la matriz actual formateada."""
        self.pasos.append(PasoOperacion(d,A,self.formateador.fmt))
    def resolver(self, matriz:MatrizAumentada):
        A=matriz.copiar(); m, np1, n = matriz.m, matriz.np1, matriz.n
        fila=0
        for col in range(n):
            # 1) Buscar pivote por mayor valor absoluto (parcial)
            piv=None; maxabs=0
            for r in range(fila,m):
                try: val=abs(float(A[r][col]))
                except: val=0
                if val>maxabs and not es_casi_cero(A[r][col]): maxabs=val; piv=r
            if piv is None: 
                continue  # columna sin pivote
            # 2) Intercambiar filas si el pivote no está en la fila actual
            if piv!=fila: 
                A[fila],A[piv]=A[piv],A[fila]
                self._reg(f"F{fila+1} ⇄ F{piv+1}", A)
            # 3) Normalizar fila del pivote a 1
            pv=A[fila][col]
            if es_casi_cero(pv): 
                continue
            for j in range(np1): A[fila][j]=self._div(A[fila][j],pv)
            self._reg(f"F{fila+1} ← (1/{self.formateador.fmt(pv)})·F{fila+1}", A)
            # 4) Hacer ceros arriba/abajo del pivote
            for r in range(m):
                if r==fila: continue
                factor=A[r][col]
                if es_casi_cero(factor): continue
                for j in range(np1): A[r][j]=self._sub(A[r][j], self._mul(factor, A[fila][j]))
                self._reg(f"F{r+1} ← F{r+1} - ({self.formateador.fmt(factor)})·F{fila+1}", A)
            fila+=1
            if fila==m: break

        tipo, sol, desc = self._analizar(A,m,n)
        pasos=[{"descripcion":p.descripcion,"matriz":p.matriz} for p in self.pasos]
        sol_dict=None
        if sol is not None: sol_dict={f"x{i+1}": self.formateador.fmt(sol[i]) for i in range(len(sol))}
        return {"pasos": pasos, "final": {"tipo": tipo, "descripcion": desc, "solucion": sol_dict}}
    def _analizar(self,A,m,n):
        # Fila 0..0 | b!=0  -> inconsistente
        for r in range(m):
            if all(es_casi_cero(A[r][c]) for c in range(n)) and not es_casi_cero(A[r][n]):
                return "inconsistente", None, "El sistema es incompatible (sin solución)."
        # Columnas con pivote
        piv_cols=set()
        for r in range(m):
            for c in range(n):
                if not es_casi_cero(A[r][c]): piv_cols.add(c); break
        if len(piv_cols)==n:
            # única: leer b en posición de pivote
            x=[0]*n
            for r in range(m):
                piv=None
                for c in range(n):
                    if not es_casi_cero(A[r][c]): piv=c; break
                if piv is not None: x[piv]=A[r][n]
            return "unica", x, "El sistema tiene solución única."
        else:
            return "infinita", None, "El sistema tiene infinitas soluciones (variables libres)."
    # Operaciones aritméticas respetando fracciones cuando sea posible
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
        if bf==0: raise ZeroDivisionError("División por cero")
        return float(a)/bf
