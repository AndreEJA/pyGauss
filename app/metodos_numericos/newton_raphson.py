# app/metodos_numericos/newton_raphson.py
from sympy import symbols, sympify, diff, lambdify


def metodo_newton_raphson(expr_python, x0, es=1e-4, max_iter=50):
    """
    Aplica el método de Newton-Raphson para encontrar una raíz de f(x) = 0.

    expr_python: cadena con la función en sintaxis Python (x**2, sin(x), etc.)
    x0: valor inicial (float)
    es: error de convergencia (por ejemplo 0.0001)
    max_iter: número máximo de iteraciones
    """
    x = symbols('x')

    # Expresión simbólica de la función
    f_sym = sympify(expr_python)

    # Derivada simbólica
    fprime_sym = diff(f_sym, x)

    # Funciones numéricas para evaluar f(x) y f'(x)
    f = lambdify(x, f_sym, 'math')
    fprime = lambdify(x, fprime_sym, 'math')

    xi = float(x0)
    tabla = []
    ea = None  # error aproximado

    for i in range(1, max_iter + 1):
        fx = f(xi)
        fpx = fprime(xi)

        if fpx == 0:
            # Se detiene si la derivada es 0 para evitar división por 0
            raise ValueError("La derivada f'(x) se hizo cero; el método no puede continuar.")

        xi1 = xi - fx / fpx

        # Error aproximado relativo
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

        # Criterio de parada
        if ea is not None and ea < es:
            xi = xi1
            break

        xi = xi1

    resultado = {
        "tabla": tabla,
        "raiz": xi,
        "n_iter": len(tabla),
        "converge": (ea is not None and ea < es),
    }
    return resultado
