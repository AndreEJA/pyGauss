# pygauss_ext.py
# Extended Gaussian & Gauss-Jordan solvers with detailed, human-readable solutions
# and an optional local AI explainer (no auth), e.g., via Ollama (http://localhost:11434).
#
# Author: ChatGPT (PyGauss extension)
# License: MIT

from __future__ import annotations
from dataclasses import dataclass
from fractions import Fraction
from typing import List, Tuple, Dict, Optional, Any
import json
import urllib.request
import urllib.error

# ---------- Utilities ----------

def to_fraction(x: Any) -> Fraction:
    """Convert a number to a Fraction, approximating floats with limited denominator."""
    if isinstance(x, Fraction):
        return x
    try:
        return Fraction(x).limit_denominator()
    except Exception:
        # for strings like "3/4"
        if isinstance(x, str) and "/" in x:
            num, den = x.split("/", 1)
            return Fraction(int(num.strip()), int(den.strip()))
        return Fraction(float(x)).limit_denominator()

def fraction_fmt(f: Fraction) -> str:
    """Pretty print a Fraction: integer if denom=1 else 'num/den' with sign cleaned."""
    if f.denominator == 1:
        return str(f.numerator)
    # ensure "-a/b" rather than "+ -a/b"
    return f"{f.numerator}/{f.denominator}"

def mat_copy(M: List[List[Fraction]]) -> List[List[Fraction]]:
    return [row[:] for row in M]

def augment(A: List[List[Any]], b: List[Any]) -> List[List[Fraction]]:
    """Create augmented matrix [A|b] with Fractions."""
    m = len(A)
    n = len(A[0]) if m else 0
    if len(b) != m:
        raise ValueError("b length must match number of rows in A")
    out = []
    for i in range(m):
        row = [to_fraction(A[i][j]) for j in range(n)]
        row.append(to_fraction(b[i]))
        out.append(row)
    return out

# Linear expressions of the form: const + sum(coeff[var] * var)
# We'll represent variables by their 0-based index using keys like ('x', j).
Expr = Dict[Any, Fraction]  # keys: 'const' or ('x', j)

def expr_const(c: Fraction = Fraction(0)) -> Expr:
    return {'const': Fraction(c)}

def expr_var(j: int) -> Expr:
    return {'const': Fraction(0), ('x', j): Fraction(1)}

def expr_add(a: Expr, b: Expr) -> Expr:
    out: Expr = {}
    keys = set(a.keys()).union(b.keys())
    for k in keys:
        out[k] = a.get(k, Fraction(0)) + b.get(k, Fraction(0))
    if 'const' not in out:
        out['const'] = Fraction(0)
    # prune zeros
    for k in list(out.keys()):
        if out[k] == 0:
            if k != 'const':
                out.pop(k, None)
    return out

def expr_sub(a: Expr, b: Expr) -> Expr:
    out: Expr = {}
    keys = set(a.keys()).union(b.keys())
    for k in keys:
        out[k] = a.get(k, Fraction(0)) - b.get(k, Fraction(0))
    if 'const' not in out:
        out['const'] = Fraction(0)
    for k in list(out.keys()):
        if out[k] == 0:
            if k != 'const':
                out.pop(k, None)
    return out

def expr_scale(a: Expr, k: Fraction) -> Expr:
    out: Expr = {}
    for key, val in a.items():
        out[key] = val * k
    return out

def expr_to_str(e: Expr) -> str:
    parts = []
    const = e.get('const', Fraction(0))
    if const != 0:
        parts.append(fraction_fmt(const))
    # sort variables by index
    vars_sorted = sorted([k for k in e.keys() if isinstance(k, tuple) and k[0]=='x'], key=lambda t: t[1])
    for key in vars_sorted:
        coeff = e[key]
        name = f"x{key[1]+1}"
        if coeff == 1:
            parts.append(name)
        elif coeff == -1:
            parts.append(f"-{name}")
        else:
            parts.append(f"{fraction_fmt(coeff)}*{name}")
    if not parts:
        return "0"
    # join with +/-, fix "+ -" occurrences
    s = " + ".join(parts)
    s = s.replace("+ -", "- ")
    return s

# ---------- Row Echelon and RREF ----------

@dataclass
class EchelonResult:
    matrix: List[List[Fraction]]  # augmented matrix after ops
    pivots: List[int]             # pivot column indices (in A columns)
    steps: List[str]              # textual steps (optional)

def ref(Ab: List[List[Fraction]], keep_steps: bool = False) -> EchelonResult:
    """Row Echelon Form (Gaussian elimination). Returns pivots and steps."""
    M = mat_copy(Ab)
    m = len(M)
    n = len(M[0]) - 1  # number of variables
    pivots = []
    steps = []

    row = 0
    for col in range(n):
        # find pivot
        pivot = None
        for r in range(row, m):
            if M[r][col] != 0:
                pivot = r
                break
        if pivot is None:
            continue
        if pivot != row:
            M[row], M[pivot] = M[pivot], M[row]
            if keep_steps:
                steps.append(f"R{row+1} ↔ R{pivot+1}")
        # eliminate below
        piv = M[row][col]
        for r in range(row+1, m):
            if M[r][col] != 0:
                factor = M[r][col] / piv
                for c in range(col, n+1):
                    M[r][c] -= factor * M[row][c]
                if keep_steps:
                    steps.append(f"R{r+1} := R{r+1} - ({fraction_fmt(factor)})*R{row+1}")
        pivots.append(col)
        row += 1
        if row == m:
            break

    return EchelonResult(M, pivots, steps)

def rref(Ab: List[List[Fraction]], keep_steps: bool = False) -> EchelonResult:
    """Reduced Row Echelon Form (Gauss-Jordan)."""
    res = ref(Ab, keep_steps=keep_steps)
    M = res.matrix
    pivots = res.pivots
    steps = res.steps
    m = len(M)
    n = len(M[0]) - 1

    # Make pivot entries 1 and clear above
    for i, col in enumerate(pivots):
        # scale row i
        piv = M[i][col]
        if piv != 0 and piv != 1:
            for c in range(col, n+1):
                M[i][c] /= piv
            if keep_steps:
                steps.append(f"R{i+1} := R{i+1} / {fraction_fmt(piv)}")
        # eliminate above
        for r in range(0, i):
            if M[r][col] != 0:
                factor = M[r][col]
                for c in range(col, n+1):
                    M[r][c] -= factor * M[i][c]
                if keep_steps:
                    steps.append(f"R{r+1} := R{r+1} - ({fraction_fmt(factor)})*R{i+1}")

    return EchelonResult(M, pivots, steps)

# ---------- Solution formatting ----------

@dataclass
class Solution:
    status: str  # "unique", "infinite", or "inconsistent"
    variable_expressions: Dict[int, Expr]  # mapping var index -> Expr
    free_vars: List[int]
    steps: List[str]

def detect_inconsistent(M: List[List[Fraction]]) -> bool:
    n = len(M[0]) - 1
    for row in M:
        if all(row[c] == 0 for c in range(n)) and row[n] != 0:
            return True
    return False

def solve_from_ref(M: List[List[Fraction]], pivots: List[int]) -> Solution:
    """Back-substitute on REF to get expressions in terms of free variables."""
    m = len(M)
    n = len(M[0]) - 1
    if detect_inconsistent(M):
        return Solution(status="inconsistent", variable_expressions={}, free_vars=[], steps=[])

    pivot_set = set(pivots)
    free = [j for j in range(n) if j not in pivot_set]

    # initialize expressions: free vars map to themselves
    exprs: Dict[int, Expr] = {j: expr_var(j) for j in free}

    # back substitution
    # rows corresponding to pivots are the first len(pivots) rows after ref()
    for i in range(len(pivots)-1, -1, -1):
        col = pivots[i]
        # find first nonzero in row i at or after col (should be M[i][col] by REF)
        piv = M[i][col]
        if piv == 0:
            # degenerate but shouldn't happen
            exprs[col] = expr_const(0)
            continue
        # compute rhs = b_i - sum_{j>col} a_ij * x_j
        rhs: Expr = expr_const(M[i][-1])
        for j in range(col+1, n):
            aij = M[i][j]
            if aij != 0:
                ej = exprs.get(j, expr_const(0))
                rhs = expr_sub(rhs, expr_scale(ej, aij))
        # divide by pivot
        exprs[col] = expr_scale(rhs, Fraction(1,1)/piv)

    status = "unique" if len(free) == 0 else "infinite"
    return Solution(status=status, variable_expressions=exprs, free_vars=free, steps=[])

def solve_from_rref(M: List[List[Fraction]], pivots: List[int]) -> Solution:
    n = len(M[0]) - 1
    if detect_inconsistent(M):
        return Solution(status="inconsistent", variable_expressions={}, free_vars=[], steps=[])

    pivot_set = set(pivots)
    free = [j for j in range(n) if j not in pivot_set]

    exprs: Dict[int, Expr] = {}

    for i, col in enumerate(pivots):
        rhs = expr_const(M[i][-1])  # in RREF, pivot = 1 and entries to right are the coefficients
        # subtract contributions of free variables present in row i
        for j in free:
            aij = M[i][j]
            if aij != 0:
                rhs = expr_sub(rhs, expr_scale(expr_var(j), aij))
        exprs[col] = rhs

    # free vars equal themselves
    for j in free:
        exprs[j] = expr_var(j)

    status = "unique" if len(free) == 0 else "infinite"
    return Solution(status=status, variable_expressions=exprs, free_vars=free, steps=[])

def solution_to_strings(sol: Solution) -> List[str]:
    """Format solution as requested: x1 = ..., and for free variables 'Variable libre: xk'."""
    lines: List[str] = []
    if sol.status == "inconsistent":
        return ["Sistema inconsistente: no tiene solución."]

    nvars = max(sol.variable_expressions.keys()) + 1 if sol.variable_expressions else 0
    for j in range(nvars):
        if j in sol.free_vars:
            lines.append(f"Variable libre: x{j+1}")
        if j in sol.variable_expressions:
            expr = sol.variable_expressions[j]
            lines.append(f"x{j+1} = {expr_to_str(expr)}")
    return lines

# ---------- Public API ----------

def gauss_solve(A: List[List[Any]], b: List[Any], keep_steps: bool = False) -> Dict[str, Any]:
    """Gaussian elimination to REF + back substitution into parametric form.

    Returns dict with:
        - status: "unique" | "infinite" | "inconsistent"
        - lines: List[str] human-readable equations (x1=..., Variable libre: ...)
        - free_vars: List[int] (0-based)
        - pivots: List[int]
        - ref_matrix: List[List[str]] pretty fractions
        - steps: List[str] elimination steps (if keep_steps)
    """
    Ab = augment(A, b)
    res = ref(Ab, keep_steps=keep_steps)
    sol = solve_from_ref(res.matrix, res.pivots)

    out = {
        "status": sol.status,
        "lines": solution_to_strings(sol),
        "free_vars": sol.free_vars,
        "pivots": res.pivots,
        "ref_matrix": [[fraction_fmt(x) for x in row] for row in res.matrix],
        "steps": res.steps if keep_steps else []
    }
    return out

def gauss_jordan_solve(A: List[List[Any]], b: List[Any], keep_steps: bool = False) -> Dict[str, Any]:
    """Gauss-Jordan to RREF and direct read-off of parametric solution."""
    Ab = augment(A, b)
    res = rref(Ab, keep_steps=keep_steps)
    sol = solve_from_rref(res.matrix, res.pivots)

    out = {
        "status": sol.status,
        "lines": solution_to_strings(sol),
        "free_vars": sol.free_vars,
        "pivots": res.pivots,
        "rref_matrix": [[fraction_fmt(x) for x in row] for row in res.matrix],
        "steps": res.steps if keep_steps else []
    }
    return out

# ---------- Optional: Local AI Explainer (no-auth) ----------

def ai_explainer(context: str,
                 user_question: str,
                 variable_summary: str,
                 provider: str = "ollama",
                 model: str = "llama3.1",
                 endpoint: Optional[str] = None,
                 timeout: int = 25) -> Dict[str, Any]:
    """Send a short prompt to a local, no-auth LLM endpoint (e.g., Ollama).

    Args:
        context: brief description of the exercise context.
        user_question: free-text question from a textbox after solving.
        variable_summary: short summary like the 'lines' joined by newlines.
        provider: currently supports "ollama" (localhost).
        model: LLM model to use (must be available in provider).
        endpoint: override endpoint. For ollama default is http://localhost:11434/api/generate
        timeout: seconds.

    Returns:
        dict with { 'ok': bool, 'provider': str, 'model': str, 'response': str, 'error': Optional[str] }
    """
    prompt = (
        "Eres un asistente que explica soluciones de sistemas lineales en 2-4 líneas, "
        "usando un lenguaje claro. Si hay variables libres, explica el criterio para escoger valores.\n\n"
        f"Contexto del ejercicio:\n{context}\n\n"
        f"Resumen de variables y libres:\n{variable_summary}\n\n"
        f"Pregunta del usuario:\n{user_question}\n\n"
        "Responde corto y concreto."
    )

    if provider.lower() == "ollama":
        url = endpoint or "http://127.0.0.1:11434/api/generate"
        payload = {"model": model, "prompt": prompt, "stream": False}
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read().decode("utf-8")
                parsed = json.loads(raw)
                text = parsed.get("response", "").strip()
                return {"ok": True, "provider": "ollama", "model": model, "response": text, "error": None}
        except urllib.error.URLError as e:
            return {"ok": False, "provider": "ollama", "model": model, "response": "", "error": str(e)}
        except Exception as e:
            return {"ok": False, "provider": "ollama", "model": model, "response": "", "error": str(e)}
    else:
        return {"ok": False, "provider": provider, "model": model, "response": "", "error": "Unsupported provider"}

# ---------- Demo ----------

if __name__ == "__main__":
    # Example 1: Unique solution
    A1 = [[2, -1, 0],
          [1,  2, 1],
          [0,  1, 3]]
    b1 = [1, 4, 7]
    print("GAUSS (REF) Example 1:")
    res1 = gauss_solve(A1, b1, keep_steps=True)
    print("\n".join(res1["lines"]))

    # Example 2: Infinite solutions
    A2 = [[1, 2, -1, 1],
          [2, 4, -2, 2],
          [0, 0,  1, -3]]
    b2 = [3, 6, 5]
    print("\nGAUSS-JORDAN (RREF) Example 2:")
    res2 = gauss_jordan_solve(A2, b2, keep_steps=True)
    print("\n".join(res2["lines"]))
