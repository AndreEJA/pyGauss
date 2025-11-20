from sympy import symbols, sympify, lambdify, E
import math

def metodo_secante(expr_str, x0, x1, es=0.0001, max_iter=50):
    """
    Método de la Secante:

        x_{i+1} = x_i - [ f(x_i)*(x_{i-1} - x_i) ] / [ f(x_{i-1}) - f(x_i) ]
    """

    x = symbols('x')

    # Aseguramos que vengan como floats
    x0 = float(x0)
    x1 = float(x1)
    es = float(es)

    # x0 y x1 no pueden ser iguales
    if x0 == x1:
        return [], None, 0, (
            "x₀ y x₁ no pueden ser iguales. "
            "El método de la secante necesita dos puntos distintos."
        )

    # 1) Interpretar la función f(x)
    try:
        f_sym = sympify(expr_str, locals={"e": E})
    except Exception as e:
        return None, None, 0, f"Error al interpretar la función: {e}"

    # 2) Crear función numérica f(x)
    try:
        f = lambdify(x, f_sym, "math")  # usará math.e para la E
    except Exception as e:
        return None, None, 0, f"Error al crear la función numérica: {e}"

    iteraciones = []
    raiz = None

    for i in range(1, max_iter + 1):
        # Evaluar f(x0) y f(x1)
        try:
            f_x0 = float(f(x0))
            f_x1 = float(f(x1))
        except Exception as e:
            return iteraciones, raiz, i - 1, f"Error al evaluar la función: {e}"

        # Comprobar que los valores sean finitos
        if (not math.isfinite(f_x0)) or (not math.isfinite(f_x1)):
            return iteraciones, raiz, i - 1, (
                "La función tomó un valor no finito (∞ o NaN). "
                "Revisa el dominio de la función y los valores iniciales."
            )

        # Denominador de la fórmula de la secante
        denom = f_x0 - f_x1

        # Evitar división entre 0 o un número muy pequeño
        if abs(denom) < 1e-14:
            return iteraciones, raiz, i - 1, (
                "Denominador casi cero en la fórmula de la secante: "
                "f(x_{i-1}) - f(x_i) ≈ 0. "
                "Prueba con otros valores iniciales."
            )

        x2 = x1 - (f_x1 * (x0 - x1)) / denom
        x2 = float(x2)

        if x2 != 0:
            ea = abs((x2 - x1) / x2) * 100.0
        else:
            ea = None

        iteraciones.append({
            "iter": i,
            "x_im1": x0,
            "x_i": x1,
            "f_x_im1": f_x0,
            "f_x_i": f_x1,
            "x_ip1": x2,
            "ea": ea,
        })

        raiz = x2

        # Criterio de paro
        if ea is not None and float(ea) < es * 100.0:
            return iteraciones, raiz, i, None

        # Actualizar para la siguiente iteración
        x0, x1 = x1, x2

    return iteraciones, raiz, max_iter, (
        "Se alcanzó el número máximo de iteraciones sin cumplir el error deseado."
    )
