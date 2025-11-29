import math

def evaluar_funcion(expr, x):
    """
    Evalúa f(x) a partir de una cadena como:
    'x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10'
    """
    permitidos = {
        "x": x,
        "y": x,              
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "exp": math.exp,
        "log": math.log,     
        "log10": math.log10,
        "sqrt": math.sqrt,
        "pi": math.pi,
        "e": math.e,
        "abs": abs,
        "asin": math.asin,
        "acos": math.acos,
        "atan": math.atan,
    }
    return eval(expr, {"__builtins__": {}}, permitidos)


def metodo_biseccion(expr, a_inicial, b_inicial, es=0.0001, max_iter=50):
    """
    Método de la bisección.

    Devuelve:
        resultados: lista de dicts con a,b,c,fa,fb,fc,ea,iter
        raiz: último c calculado
        n_iter: número de iteraciones realizadas
    """
    resultados = []
    raiz = None

    a = a_inicial
    b = b_inicial

    for i in range(1, max_iter + 1):
        fa = evaluar_funcion(expr, a)
        fb = evaluar_funcion(expr, b)

        c = (a + b) / 2.0
        fc = evaluar_funcion(expr, c)

        ea = abs(fc)

        resultados.append({
            "iter": i,
            "a": a,
            "b": b,
            "c": c,
            "ea": ea,   #sirve para guardar el abs(fc)
            "fa": fa,
            "fb": fb,
            "fc": fc,
        })

        # Si encontramos raíz exacta (fc == 0) o el error es menor a la tolerancia
        if ea < es:
            raiz = c
            break

        # Elegir nuevo intervalo 
        if fa * fc < 0:
            b = c
        else:
            a = c

        raiz = c  # por si salimos por max_iter

    n_iter = len(resultados)
    return resultados, raiz, n_iter