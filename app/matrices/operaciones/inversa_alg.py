# -*- coding: utf-8 -*-
from __future__ import annotations
from fractions import Fraction
from typing import List, Dict, Any, Tuple

def to_fraction(x) -> Fraction:
    if isinstance(x, Fraction):
        return x
    try:
        return Fraction(x).limit_denominator()
    except Exception:
        return Fraction(float(x)).limit_denominator()

def identity(n: int) -> List[List[Fraction]]:
    I = [[Fraction(0) for _ in range(n)] for _ in range(n)]
    for i in range(n):
        I[i][i] = Fraction(1)
    return I

def mat_copy(M):
    return [row[:] for row in M]

def fraction_fmt(f: Fraction) -> str:
    return f"{f.numerator}" if f.denominator == 1 else f"{f.numerator}/{f.denominator}"

def format_matrix(M: List[List[Fraction]]) -> List[List[str]]:
    return [[fraction_fmt(x) for x in row] for row in M]

def transpose(M: List[List[Any]]) -> List[List[Fraction]]:
    if not M: return []
    R, C = len(M), len(M[0])
    out = [[Fraction(0) for _ in range(R)] for _ in range(C)]
    for i in range(R):
        for j in range(C):
            out[j][i] = to_fraction(M[i][j])
    return out


def inverse_2x2(A: List[List[Any]]) -> Dict[str, Any]:
    a, b = to_fraction(A[0][0]), to_fraction(A[0][1])
    c, d = to_fraction(A[1][0]), to_fraction(A[1][1])
    det = a*d - b*c
    pasos = []
    # Paso 1: Mostrar A
    pasos.append({
        "op": "Matriz A y fórmula del determinante det(A) = ad − bc",
        "matriz_izq": format_matrix([[a,b],[c,d]]),
        "matriz_der": [["ad − bc"], [f"{fraction_fmt(a)}·{fraction_fmt(d)} − {fraction_fmt(b)}·{fraction_fmt(c)}"]]
    })
    if det == 0:
        return {
            "ok": False,
            "motivo": "ad − bc = 0 → A no es invertible",
            "det": fraction_fmt(det),
            "pasos": pasos
        }
    # Paso 2: Determinante numérico
    pasos.append({
        "op": f"det(A) = {fraction_fmt(det)} (≠ 0)",
        "matriz_izq": [["det(A)"]],
        "matriz_der": [[fraction_fmt(det)]]
    })
    # Paso 3: Matriz adjunta para 2×2: [ d  -b ; -c  a ]
    adj = [[d, -b], [-c, a]]
    pasos.append({
        "op": "Adj(A) en 2×2 es [ d  −b ; −c  a ]",
        "matriz_izq": format_matrix([[a,b],[c,d]]),
        "matriz_der": format_matrix(adj)
    })
    # Paso 4: A^{-1} = (1/det) · Adj(A)  → dividir cada entrada por det
    inv_raw = [[adj[0][0]/det, adj[0][1]/det], [adj[1][0]/det, adj[1][1]/det]]
    pasos.append({
        "op": "Multiplicar Adj(A) por 1/det(A) (equivale a dividir cada entrada por det(A))",
        "matriz_izq": [[f"x / {fraction_fmt(det)}" for x in row] for row in format_matrix(adj)],
        "matriz_der": format_matrix(inv_raw)
    })
    inv_fmt = format_matrix(inv_raw)
    return {
        "ok": True,
        "metodo": "formula_2x2",
        "det": fraction_fmt(det),
        "inversa": inv_fmt,
        "pasos": pasos
    }
def gauss_jordan_inverse(A: List[List[Any]]) -> Dict[str, Any]:
    """Gauss-Jordan sobre [A | I] con pasos y snapshots."""
    n = len(A)
    Ab = [[to_fraction(A[i][j]) for j in range(n)] + [Fraction(1 if i==j else 0) for j in range(n)] for i in range(n)]
    steps = [{"op":"Inicio","matriz_izq": format_matrix([row[:n] for row in Ab]), "matriz_der": format_matrix([row[n:] for row in Ab])}]
    row = 0
    for col in range(n):
        # buscar pivote
        pivot = None
        for r in range(row, n):
            if Ab[r][col] != 0:
                pivot = r; break
        if pivot is None:
            return {"ok": False, "motivo": f"No hay pivote en columna {col+1} → matriz no invertible.", "pasos": steps}
        if pivot != row:
            Ab[row], Ab[pivot] = Ab[pivot], Ab[row]
            steps.append({"op": f"R{row+1} ↔ R{pivot+1}",
                          "matriz_izq": format_matrix([r[:n] for r in Ab]),
                          "matriz_der": format_matrix([r[n:] for r in Ab])})
        piv = Ab[row][col]
        # escalar fila para que pivote sea 1
        if piv != 1:
            for c in range(2*n):
                Ab[row][c] /= piv
            steps.append({"op": f"R{row+1} := R{row+1} / {fraction_fmt(piv)}",
                          "matriz_izq": format_matrix([r[:n] for r in Ab]),
                          "matriz_der": format_matrix([r[n:] for r in Ab])})
        # eliminar en otras filas
        for r in range(n):
            if r == row: continue
            if Ab[r][col] != 0:
                factor = Ab[r][col]
                for c in range(2*n):
                    Ab[r][c] -= factor * Ab[row][c]
                steps.append({"op": f"R{r+1} := R{r+1} - ({fraction_fmt(factor)})·R{row+1}",
                              "matriz_izq": format_matrix([rr[:n] for rr in Ab]),
                              "matriz_der": format_matrix([rr[n:] for rr in Ab])})
        row += 1

    # Comprobar que izquierda es identidad
    izq = [row[:n] for row in Ab]
    der = [row[n:] for row in Ab]
    # si no es identidad exacta (por fracciones lo será), fallamos
    for i in range(n):
        for j in range(n):
            val = izq[i][j]
            if val != (Fraction(1) if i==j else Fraction(0)):
                return {"ok": False, "motivo":"No se pudo reducir A a I_n → no invertible.", "pasos": steps}
    return {"ok": True, "metodo":"gauss_jordan", "inversa": format_matrix(der), "pasos": steps}
