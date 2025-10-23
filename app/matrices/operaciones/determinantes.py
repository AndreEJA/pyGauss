# app/matrices/operaciones/determinantes.py
# -*- coding: utf-8 -*-
from __future__ import annotations
from fractions import Fraction
from typing import List, Dict, Any, Tuple
from app.matrices.gauss.algebra import es_casi_cero, a_fraccion_si_aplica, FormateadorNumeros, EvaluadorSeguro
from .operaciones_matrices import evaluar_matriz_str 

def mat_copy(M: List[List[Any]]) -> List[List[Fraction]]:
    """Copia y convierte la matriz a Fracciones."""
    return [[a_fraccion_si_aplica(v) for v in row] for row in M]

def calculate_determinant(A_raw: List[List[Any]]) -> Dict[str, Any]:
    """Calcula el determinante de una matriz cuadrada A usando reducción a forma escalonada (Gauss)."""
    A = mat_copy(A_raw)
    n = len(A)
    if n == 0:
        return {"ok": False, "error": "La matriz está vacía."}
    if any(len(row) != n for row in A):
        return {"ok": False, "error": "La matriz debe ser cuadrada."}

    fmt = FormateadorNumeros('fraccion').fmt
    
    # Caso 2x2: Usar fórmula ad-bc
    if n == 2:
        a, b = A[0][0], A[0][1]
        c, d = A[1][0], A[1][1]
        det = a * d - b * c
        pasos = [{
            "op": "Fórmula 2x2: ad - bc",
            "matriz_izq": [[fmt(a), fmt(b)], [fmt(c), fmt(d)]],
            "matriz_der": [[f"({fmt(a)})({fmt(d)}) - ({fmt(b)})({fmt(c)})"]],
            "det": det,
            "resultado": fmt(det)
        }]
        for p in pasos:
            if 'det' in p:
                del p['det'] 
        return {"ok": True, "det": det, "pasos": pasos, "det_fmt": fmt(det)}

    # n > 2: Reducción por filas
    M = mat_copy(A)
    det_factor = Fraction(1)
    pasos: List[Dict[str, Any]] = []
    
    # Paso 0: Matriz inicial
    pasos.append({"op": "Inicio de reducción por filas.", 
                  "matriz_izq": [[fmt(v) for v in row] for row in M],
                  "matriz_der": [["det(A) = 1"]],
                  "det": det_factor})

    row = 0
    for col in range(n):
        if row >= n: break
        
        # 1. Búsqueda de pivote (Corregido: Solo si M[row][col] es cero)
        pivot = row # Asumimos la fila actual como pivote inicialmente
        
        if es_casi_cero(M[row][col]): # Si el elemento actual es cero, buscamos debajo el primero no-cero
            pivot = -1 
            # Búsqueda simple del primer elemento no-cero debajo para usarlo como pivote.
            for r in range(row + 1, n): 
                if not es_casi_cero(M[r][col]):
                    pivot = r
                    break
            
        if pivot == -1:
            # Columna de ceros (det=0)
            continue
            
        # 2. Intercambio de filas
        # Si pivot != row (solo sucede si M[row][col] era cero y encontramos uno abajo)
        if pivot != row:
            M[row], M[pivot] = M[pivot], M[row]
            det_factor *= -1 
            pasos.append({"op": f"Fila {row+1} ⇄ Fila {pivot+1}. det(A) ≔ -det(A). Factor acumulado: {fmt(det_factor)}",
                          "matriz_izq": [[fmt(v) for v in row_] for row_ in M],
                          "matriz_der": [["Intercambio", f"Factor: {fmt(det_factor)}"]],
                          "det": det_factor})
        
        # 3. Eliminación hacia abajo (sumar múltiplo a otra fila)
        piv_val = M[row][col]
        if es_casi_cero(piv_val): continue 
        
        for r in range(row + 1, n):
            factor = M[r][col] / piv_val 
            
            if not es_casi_cero(factor):
                op_desc = f"Fila {r+1} ← Fila {r+1} - ({fmt(factor)})·Fila {row+1}. det(A) NO cambia."
                for c in range(col, n):
                    M[r][c] -= factor * M[row][c]
                
                pasos.append({"op": op_desc,
                              "matriz_izq": [[fmt(v) for v in row_] for row_ in M],
                              "matriz_der": [["Reemplazo", f"Factor: {fmt(det_factor)}"]],
                              "det": det_factor})
        
        row += 1

    # 4. Cálculo del determinante
    product_diag = Fraction(1)
    for i in range(n):
        product_diag *= M[i][i]
        
    final_det = product_diag * det_factor
    
    # Paso final: Multiplicar diagonal
    diag_str = " * ".join(fmt(M[i][i]) for i in range(n))
    factor_str = fmt(det_factor)
    
    final_paso = {
        "op": f"Matriz en forma escalonada. det(A) = ({factor_str}) · Producto(Diagonal)",
        "matriz_izq": [[fmt(v) for v in row_] for row_ in M],
        "matriz_der": [[f"{factor_str} · ({diag_str}) = {fmt(final_det)}"]],
        "det": final_det,
        "resultado": fmt(final_det)
    }
    pasos.append(final_paso)

    # Limpiar los pasos antes de retornar
    for p in pasos:
        if 'det' in p:
            del p['det'] 
            
    return {"ok": True, "det": final_det, "pasos": pasos, "det_fmt": fmt(final_det)}

def cramer_solve(A_raw: List[List[Any]], b_raw: List[Any], mode: str, decimals: int) -> Dict[str, Any]:
    """Resuelve el sistema Ax=b usando la Regla de Cramer."""
    A = mat_copy(A_raw)
    b = mat_copy([b_raw])[0]
    n = len(A)
    
    # 1. Calcular det(A)
    res_det_A = calculate_determinant(A_raw) 
    if not res_det_A["ok"]:
        return {"ok": False, "error": "Error al calcular det(A).", "det_A_pasos": res_det_A.get("pasos", [])}
    
    det_A: Fraction = res_det_A["det"]
    
    fmt = FormateadorNumeros(mode, decimals).fmt
    
    # 2. Verificar si es invertible (solución única)
    if es_casi_cero(det_A):
        pasos_A_fmt = []
        for paso_A in res_det_A["pasos"]:
            paso_A_copy = paso_A.copy()
            if 'det_fmt' in paso_A_copy: 
                paso_A_copy['det_fmt'] = fmt(a_fraccion_si_aplica(paso_A_copy['det_fmt']))

            if mode == 'decimal':
                for key in ['matriz_izq', 'matriz_der']:
                    if key in paso_A_copy and isinstance(paso_A_copy[key], list):
                        def safe_eval_and_fmt(val_str):
                            try: return fmt(evaluar_matriz_str([[val_str]])[0][0])
                            except: return val_str
                        paso_A_copy[key] = [[safe_eval_and_fmt(v) for v in row] for row in paso_A_copy[key]]
            pasos_A_fmt.append(paso_A_copy)
        
        return {"ok": True, "det_A": fmt(det_A), "solucion": None, "mensaje": "det(A) ≈ 0. El sistema no tiene solución única. La Regla de Cramer no se aplica.", "pasos": pasos_A_fmt}
        
    # 3. Calcular det(Ai(b)) para cada columna i
    solucion = {}
    pasos_cramer: List[Dict[str, Any]] = []

    for i in range(n):
        A_i_b_raw = [row[:] for row in A_raw]
        for r in range(n): A_i_b_raw[r][i] = b_raw[r]
            
        res_det_Ai = calculate_determinant(A_i_b_raw)
        
        if not res_det_Ai["ok"]:
            return {"ok": False, "error": f"Error al calcular det(A{i+1}(b)).", "pasos": res_det_A["pasos"]}

        det_Ai: Fraction = res_det_Ai["det"]
        x_i = det_Ai / det_A
        
        solucion[f"x{i+1}"] = fmt(x_i)
        
        A_i_b_fmt = mat_copy(A_i_b_raw)
        pasos_Ai_fmt = []
        for paso_Ai in res_det_Ai["pasos"]:
            paso_Ai_copy = paso_Ai.copy()
            if 'det_fmt' in paso_Ai_copy: 
                paso_Ai_copy['det_fmt'] = fmt(a_fraccion_si_aplica(paso_Ai_copy['det_fmt']))

            if mode == 'decimal':
                for key in ['matriz_izq', 'matriz_der']:
                    if key in paso_Ai_copy and isinstance(paso_Ai_copy[key], list):
                        def safe_eval_and_fmt(val_str):
                            try: return fmt(evaluar_matriz_str([[val_str]])[0][0])
                            except: return val_str 
                        paso_Ai_copy[key] = [[safe_eval_and_fmt(v) for v in row] for row in paso_Ai_copy[key]]
            pasos_Ai_fmt.append(paso_Ai_copy)
        
        pasos_cramer.append({
            "variable": f"x{i+1}",
            "det_Ai_pasos": pasos_Ai_fmt,
            "formula": f"x{i+1} = det(A{i+1}(b)) / det(A)",
            "calculo": f"x{i+1} = {fmt(det_Ai)} / {fmt(det_A)} = {fmt(x_i)}",
            "A_i_b": [[fmt(v) for v in row] for row in A_i_b_fmt],
            "det_Ai_valor": fmt(det_Ai),
        })

    pasos_A_fmt_final = []
    for paso_A in res_det_A["pasos"]:
        paso_A_copy = paso_A.copy()
        if 'det_fmt' in paso_A_copy: 
            paso_A_copy['det_fmt'] = fmt(a_fraccion_si_aplica(paso_A_copy['det_fmt']))
        pasos_A_fmt_final.append(paso_A_copy)


    return {"ok": True, "det_A": fmt(det_A), "solucion": solucion, "mensaje": "El sistema tiene solución única.", "pasos": pasos_A_fmt_final, "pasos_cramer": pasos_cramer}