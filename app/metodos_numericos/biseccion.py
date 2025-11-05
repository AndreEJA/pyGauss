import math

def evaluar_funcion(expr, x):
    """
    Evalúa f(x) a partir de una cadena como:
    'x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10'
    """
    # nombres permitidos
    permitidos = {
        "x": x,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "exp": math.exp,
        "log": math.log,
        "sqrt": math.sqrt,
        "pi": math.pi,
        "e": math.e,
    }
    return eval(expr, {"__builtins__": {}}, permitidos)


def metodo_biseccion(expr, xi, xu, es=0.0001, max_iter=50):
    """
    Implementa el método de la bisección siguiendo el esquema del docente.

    - expr: string con la función f(x)
    - xi: límite inferior
    - xu: límite superior
    - es: error de convergencia (tolerancia) para Ea
    - max_iter: máximo de iteraciones

    Devuelve:
        resultados: lista de dicts por iteración
        raiz: último xr
        n_iter: número de iteraciones realizadas
    """
    resultados = []
    xr_anterior = None
    raiz = None

    for i in range(1, max_iter + 1):
        yi = evaluar_funcion(expr, xi)
        yu = evaluar_funcion(expr, xu)

        xr = (xi + xu) / 2.0
        yr = evaluar_funcion(expr, xr)

        # Error relativo aproximado Ea (sin multiplicar por 100, como en tu tabla)
        if xr_anterior is None:
            ea = 0.0
        else:
            ea = abs((xr - xr_anterior) / xr)

        resultados.append({
            "iter": i,
            "xi": xi,
            "xu": xu,
            "xr": xr,
            "ea": ea,
            "yi": yi,
            "yu": yu,
            "yr": yr,
        })

        # Si encontramos raíz exacta
        if yr == 0.0:
            raiz = xr
            break

        # Verificar en qué subintervalo está la raíz
        if yi * yr < 0:
            xu = xr
        else:
            xi = xr

        # Criterio de paro: Ea < es  (como en el ejemplo de tu docente)
        if i > 1 and ea < es:
            raiz = xr
            break

        xr_anterior = xr
        raiz = xr  # por si salimos por max_iter

    n_iter = len(resultados)
    return resultados, raiz, n_iter
