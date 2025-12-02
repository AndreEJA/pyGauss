from sympy import symbols, sympify, diff, lambdify, E
import math

def metodo_newton_raphson(expr_python, x0, es=1e-4, max_iter=50):
    """
    Aplica el método de Newton-Raphson.
    """
    x = symbols('x')

    # 1. Interpretar la función
    try:
        # Usamos locals para asegurar que 'e' se interprete como la constante matemática
        f_sym = sympify(expr_python, locals={"e": E})
    except Exception as e:
        return {"error": f"Error de sintaxis en la función: {e}"}

    # 2. Calcular derivada
    fprime_sym = diff(f_sym, x)

    # 3. Crear funciones numéricas (AQUÍ ESTABA EL ERROR ANTERIOR)
    # Usamos modules=['math'] para forzar el uso de Python math standard
    try:
        f = lambdify(x, f_sym, modules=['math'])
        fprime = lambdify(x, fprime_sym, modules=['math'])
    except Exception as e:
        return {"error": f"No se pudo compilar la función: {e}"}

    xi = float(x0)
    tabla = []
    ea = None

    for i in range(1, max_iter + 1):
        try:
            fx = f(xi)
            fpx = fprime(xi)
        except Exception as e:
            # Capturamos errores como división por cero matemática o dominio
            return {"error": f"Error matemático al evaluar en {xi:.4f}: {e}"}

        # Evitar división por cero en el método
        if fpx == 0:
            return {
                "tabla": tabla, 
                "raiz": None, 
                "n_iter": i,
                "error_metodo": "La derivada se hizo cero (división por cero). No se puede continuar."
            }

        xi1 = xi - fx / fpx

        if xi1 != 0:
            ea = abs((xi1 - xi) / xi1)
        else:
            ea = abs(xi1 - xi)

        tabla.append({
            "iter": i,
            "xi": xi,
            "fx": fx,
            "fpx": fpx,
            "xi1": xi1,
            "ea": ea,
        })

        if ea < es:
            xi = xi1
            break

        xi = xi1

    # Retornamos un diccionario limpio
    return {
        "tabla": tabla,
        "raiz": xi,
        "n_iter": len(tabla),
        "converge": (ea is not None and ea < es),
        "derivada_latex": str(diff(f_sym, x)) # Simplificado para evitar errores de importación
    }