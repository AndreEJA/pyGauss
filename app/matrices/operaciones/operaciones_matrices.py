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

class EvaluadorSeguro:
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

def evaluar_matriz_str(matriz_str):
    """Evalúa los valores de una matriz desde strings a números o fracciones."""
    evaluador = EvaluadorSeguro()
    try:
        matriz_evaluada = []
        for fila in matriz_str:
            fila_evaluada = []
            for val_str in fila:
                if val_str.strip() == "":
                    raise ValueError("Hay celdas vacías en la matriz.")
                val = evaluador.evaluar(val_str)
                fila_evaluada.append(val)
            matriz_evaluada.append(fila_evaluada)
        return matriz_evaluada
    except Exception as e:
        raise ValueError(f"Error al evaluar expresiones: {e}")

def sumar_matrices(matriz1, matriz2):
    """Suma dos matrices. Valida si las dimensiones son correctas."""
    filas1 = len(matriz1)
    cols1 = len(matriz1[0])
    filas2 = len(matriz2)
    cols2 = len(matriz2[0])
    
    if filas1 != filas2 or cols1 != cols2:
        raise ValueError("Las matrices deben tener las mismas dimensiones para poder sumarse.")
    
    matriz_suma = [[0 for _ in range(cols1)] for _ in range(filas1)]
    for i in range(filas1):
        for j in range(cols1):
            matriz_suma[i][j] = matriz1[i][j] + matriz2[i][j]
            if isinstance(matriz_suma[i][j], float):
                matriz_suma[i][j] = round(matriz_suma[i][j], 6)
            else:
                matriz_suma[i][j] = float(matriz_suma[i][j])
    return matriz_suma

def multiplicar_matrices(matriz1, matriz2):
    """Multiplica dos matrices. Valida si las dimensiones son correctas."""
    filas1 = len(matriz1)
    cols1 = len(matriz1[0])
    filas2 = len(matriz2)
    cols2 = len(matriz2[0])
    
    if cols1 != filas2:
        raise ValueError("El número de columnas de la primera matriz debe ser igual al número de filas de la segunda.")
    
    matriz_producto = [[0 for _ in range(cols2)] for _ in range(filas1)]
    for i in range(filas1):
        for j in range(cols2):
            for k in range(cols1):
                matriz_producto[i][j] += matriz1[i][k] * matriz2[k][j]
            if isinstance(matriz_producto[i][j], float):
                matriz_producto[i][j] = round(matriz_producto[i][j], 6)
            else:
                matriz_producto[i][j] = float(matriz_producto[i][j])
    return matriz_producto

def sumar_matrices_con_escalares(matrices_list, escalares_list):
    """
    Suma un conjunto de matrices después de multiplicarlas por sus respectivos escalares:
    R = c1*A1 + c2*A2 + ...
    """
    if not matrices_list or len(matrices_list) != len(escalares_list):
        raise ValueError("El número de matrices debe coincidir con el número de escalares, y la lista no debe estar vacía.")
    
    # Tomar las dimensiones de la primera matriz para inicializar el resultado
    filas = len(matrices_list[0])
    cols = len(matrices_list[0][0])
    
    # Inicializar la matriz resultado con ceros
    matriz_resultado = [[0 for _ in range(cols)] for _ in range(filas)]
    
    # Iterar sobre cada matriz y su escalar
    for i in range(len(matrices_list)):
        matriz = matrices_list[i]
        escalar = escalares_list[i]
        
        # Validación de dimensiones
        if len(matriz) != filas or len(matriz[0]) != cols:
            raise ValueError("Todas las matrices deben tener las mismas dimensiones.")
        
        # Sumar la matriz escalada al resultado
        for r in range(filas):
            for c in range(cols):
                val_parcial = escalar * matriz[r][c]
                matriz_resultado[r][c] += val_parcial
    
    # Formatear el resultado final para evitar problemas de tipos de datos complejos (Fraction)
    for r in range(filas):
        for c in range(cols):
            val = matriz_resultado[r][c]
            if isinstance(val, float):
                matriz_resultado[r][c] = round(val, 6) # Mantener consistencia si es float
            else:
                # Si es Fraction, convertir a float para simplificar el manejo en Python
                try: matriz_resultado[r][c] = float(val)
                except: pass # Si no se puede convertir, se deja como está (Fraction)
                
    return matriz_resultado

def multiplicar_matriz_por_vectores(matriz, vectores):
    """Multiplica una matriz por una matriz de vectores columna."""
    filas_matriz = len(matriz)
    cols_matriz = len(matriz[0])
    filas_vectores = len(vectores)
    cols_vectores = len(vectores[0])

    if cols_matriz != filas_vectores:
        raise ValueError("El número de columnas de la matriz debe ser igual al número de filas de los vectores.")

    resultado = [[0 for _ in range(cols_vectores)] for _ in range(filas_matriz)]
    for i in range(filas_matriz):
        for j in range(cols_vectores):
            for k in range(cols_matriz):
                resultado[i][j] += matriz[i][k] * vectores[k][j]
            if isinstance(resultado[i][j], float):
                resultado[i][j] = round(resultado[i][j], 6)
            else:
                resultado[i][j] = float(resultado[i][j])
    return resultado