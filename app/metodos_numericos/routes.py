from flask import Blueprint, render_template, request
from .biseccion import metodo_biseccion, evaluar_funcion
from .regla_falsa import metodo_regla_falsa
from .newton_raphson import metodo_newton_raphson 
from .secante import metodo_secante 
from sympy import symbols, sympify, diff, latex

import re
import math
import io
import base64

import matplotlib
matplotlib.use("Agg")  
import matplotlib.pyplot as plt

metodos_bp = Blueprint(
    "metodos_numericos",
    __name__,
    url_prefix="/metodos-numericos"
)

def pretty_to_latex(pretty: str) -> str:
    if not pretty:
        return ""
    tex = pretty.strip()

    # trig
    tex = re.sub(r'\bsen\(', r'\\sin(', tex, flags=re.I)
    tex = re.sub(r'\btg\(',  r'\\tan(', tex, flags=re.I)
    tex = re.sub(r'\btan\(', r'\\tan(', tex, flags=re.I)
    tex = re.sub(r'\bcos\(', r'\\cos(', tex, flags=re.I)
    

    # logs
    tex = re.sub(r'\bln\(', r'\\ln(', tex, flags=re.I)
    tex = re.sub(r'log10\(', r'\\log_{10}(', tex, flags=re.I)
    tex = re.sub(r'log_([0-9A-Za-z]+)\(', r'\\log_{\1}(', tex)

    # raíz cuadrada
    tex = re.sub(r'√\(([^)]+)\)', r'\\sqrt{\1}', tex)
    tex = re.sub(r'√([A-Za-z0-9]+)', r'\\sqrt{\1}', tex)

    # pi
    tex = re.sub(r'π', r'\\pi', tex)

    # fracciones simples
    tex = re.sub(r'\(([^)]+)\)\s*/\s*\(([^)]+)\)', r'\\frac{\1}{\2}', tex)
    tex = re.sub(r'(\d+)\s*/\s*(\d+)', r'\\frac{\1}{\2}', tex)

    # potencias:
    # 1) base^(expresión entre paréntesis)  e^(-x), x^(1/2), a^(n+1)
    tex = re.sub(
        r'([A-Za-z0-9\)\]])\^\(([^)]+)\)',
        r'\1^{ \2 }',
        tex
    )
    # 2) base^exponente simple: x^4, a^n, 2^k, e^-x
    tex = re.sub(
        r'([A-Za-z0-9\)\]])\^(-?[A-Za-z0-9]+)',
        r'\1^{ \2 }',
        tex
    )

    return tex


@metodos_bp.route("/biseccion", methods=["GET", "POST"])
def biseccion():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    grafica_png = None   # acá se guardará la imagen

    # Función de ejemplo SOLO como respaldo interno
    expr_default = "x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10"
    pretty_default = "x^4 - 5x^3 + 0.5x^2 - 11x + 10"

    # Valores iniciales que se muestran en el formulario
    datos = {
        "funcion_prety": "",
        "funcion_pretty": "",
        "funcion": "",
        "funcion_latex": "",
        "xi": "",
        "xu": "",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            accion = request.form.get("accion", "biseccion")  # "graficar" o "biseccion"

            func_pretty = request.form.get("funcion_pretty", "").strip()
            expr = request.form.get("funcion", "").strip()

            if not expr:
                expr = expr_default
            if not func_pretty:
                func_prety = pretty_default

            # Generar LaTeX en el servidor (a partir de func_pretty)
            func_latex = pretty_to_latex(func_pretty)

            # Parámetros como texto
            xi_str = request.form.get("xi", "").strip()
            xu_str = request.form.get("xu", "").strip()
            es_str = request.form.get("es", "0.0001").strip()
            max_iter_str = request.form.get("max_iter", "50").strip()

            if es_str == "":
                es_str = "0.0001"
            if max_iter_str == "":
                max_iter_str = "50"

            # Guardamos lo que escribió el usuario
            datos["funcion_pretty"] = func_pretty
            datos["funcion"] = expr
            datos["funcion_latex"] = func_latex
            datos["xi"] = xi_str
            datos["xu"] = xu_str
            datos["es"] = es_str
            datos["max_iter"] = max_iter_str

            # ============================
            # 1) CÁLCULO POR BISECCIÓN
            # ============================
            if accion == "biseccion":
                # --- validar que haya extremos ---
                if xi_str == "" or xu_str == "":
                    datos["xi"] = ""
                    datos["xu"] = ""
                    error_msg = (
                        "Debes ingresar un intervalo [a, b] para aplicar el método "
                        "de bisección. La raíz no se puede determinar sin un intervalo."
                    )
                    return render_template(
                        "biseccion.html",
                        datos=datos,
                        resultados=None,
                        raiz=None,
                        n_iter=None,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                    )

                xi = float(xi_str)
                xu = float(xu_str)
                es = float(es_str)
                max_iter = int(max_iter_str)

                # --- validar a < b ---
                if xi >= xu:
                    datos["xi"] = ""
                    datos["xu"] = ""
                    error_msg = (
                        "El intervalo no es válido. Debe cumplirse a < b "
                        "para poder buscar la raíz con el método de bisección."
                    )
                    return render_template(
                        "biseccion.html",
                        datos=datos,
                        resultados=None,
                        raiz=None,
                        n_iter=None,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                    )

                # --- validar cambio de signo ---
                fa = evaluar_funcion(expr, xi)
                fb = evaluar_funcion(expr, xu)
                if fa * fb >= 0:
                    datos["xi"] = ""
                    datos["xu"] = ""
                    error_msg = (
                        "La raíz no se encuentra dentro del intervalo seleccionado. "
                        "El método de bisección requiere que f(a) y f(b) tengan signos opuestos."
                    )
                    return render_template(
                        "biseccion.html",
                        datos=datos,
                        resultados=None,
                        raiz=None,
                        n_iter=None,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                    )

                # Si todo es válido, ejecutar método de Bisección
                resultados, raiz, n_iter = metodo_biseccion(
                    expr, xi, xu, es, max_iter
                )

            # ============================
            # 2) GRÁFICA (siempre que haya expr)
            # ============================
            # Para graficar usamos el intervalo que haya escrito el usuario
            # o un rango por defecto si está vacío.
            if xi_str == "" or xu_str == "":
                gx_i = -10.0
                gx_u = 10.0
            else:
                gx_i = float(xi_str)
                gx_u = float(xu_str)

            if gx_i == gx_u:
                gx_i -= 5
                gx_u += 5

            num_puntos = 400
            xs = []
            ys = []
            for i in range(num_puntos + 1):
                x = gx_i + (gx_u - gx_i) * i / num_puntos
                try:
                    y = evaluar_funcion(expr, x)
                    if not math.isfinite(y):
                        y = float("nan")
                except Exception:
                    y = float("nan")
                xs.append(x)
                ys.append(y)

            # Detectar puntos aproximados donde la función corta el eje X
            roots_x = []
            for i in range(1, len(xs)):
                y1 = ys[i - 1]
                y2 = ys[i]
                x1 = xs[i - 1]
                x2 = xs[i]

                if not (math.isfinite(y1) and math.isfinite(y2)):
                    continue

                # cruce exacto
                if y1 == 0:
                    roots_x.append(x1)

                # cambio de signo
                if y1 * y2 < 0:
                    # interpolación lineal
                    x0 = x1 - y1 * (x2 - x1) / (y2 - y1)
                    roots_x.append(x0)

            # Crear la figura con Matplotlib
            fig, ax = plt.subplots(figsize=(6, 3))
            ax.axhline(0, color="black", linewidth=0.8)
            ax.axvline(0, color="black", linewidth=0.8)

            ax.plot(xs, ys, linewidth=1.8)
            if roots_x:
                ax.scatter(roots_x, [0] * len(roots_x), s=25)

            ax.set_xlabel("x")
            ax.set_ylabel("f(x)")
            ax.set_title("Gráfica de f(x)")
            ax.grid(True, linestyle=":", linewidth=0.5)

            buf = io.BytesIO()
            fig.tight_layout()
            fig.savefig(buf, format="png")
            buf.seek(0)
            grafica_png = base64.b64encode(buf.getvalue()).decode("utf-8")
            plt.close(fig)

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template(
        "biseccion.html",
        datos=datos,
        resultados=resultados,
        raiz=raiz,
        n_iter=n_iter,
        error_msg=error_msg,
        grafica_png=grafica_png,
    )



@metodos_bp.route("/regla-falsa", methods=["GET", "POST"])
def regla_falsa():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    grafica_png = None   #aca se guardara la imgen

    # Función de ejemplo SOLO como respaldo interno
    expr_default = "x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10"
    pretty_default = "x^4 - 5x^3 + 0.5x^2 - 11x + 10"

    # Valores iniciales que se muestran en el formulario
    datos = {
        "funcion_pretty": "",
        "funcion": "",
        "funcion_latex": "",
        "xi": "",
        "xu": "",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            accion = request.form.get("accion", "regla_falsa")  # "graficar" o "regla_falsa"

            func_pretty = request.form.get("funcion_pretty", "").strip()
            expr = request.form.get("funcion", "").strip()

            if not expr:
                expr = expr_default
            if not func_pretty:
                func_pretty = pretty_default

            # Generar LaTeX en el servidor (a partir de func_pretty)
            func_latex = pretty_to_latex(func_pretty)

            # Parámetros como texto
            xi_str = request.form.get("xi", "").strip()
            xu_str = request.form.get("xu", "").strip()
            es_str = request.form.get("es", "0.0001").strip()
            max_iter_str = request.form.get("max_iter", "50").strip()

            if es_str == "":
                es_str = "0.0001"
            if max_iter_str == "":
                max_iter_str = "50"

            # Guardamos lo que escribió el usuario
            datos["funcion_pretty"] = func_pretty
            datos["funcion"] = expr
            datos["funcion_latex"] = func_latex
            datos["xi"] = xi_str
            datos["xu"] = xu_str
            datos["es"] = es_str
            datos["max_iter"] = max_iter_str

            # ============================
            # 1) CÁLCULO POR REGLA FALSA
            # ============================
            if accion == "regla_falsa":
                # --- validar que haya extremos ---
                if xi_str == "" or xu_str == "":
                    datos["xi"] = ""
                    datos["xu"] = ""
                    error_msg = "Debes ingresar un intervalo [a, b] válido para aplicar la Regla Falsa."
                    return render_template(
                        "regla_falsa.html",
                        datos=datos,
                        resultados=None,
                        raiz=None,
                        n_iter=None,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                    )

                xi = float(xi_str)
                xu = float(xu_str)
                es = float(es_str)
                max_iter = int(max_iter_str)

                # --- validar a < b ---
                if xi >= xu:
                    datos["xi"] = ""
                    datos["xu"] = ""
                    error_msg = "El intervalo no es válido. Debe cumplirse a < b."
                    return render_template(
                        "regla_falsa.html",
                        datos=datos,
                        resultados=None,
                        raiz=None,
                        n_iter=None,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                    )

                # --- validar cambio de signo ---
                fa = evaluar_funcion(expr, xi)
                fb = evaluar_funcion(expr, xu)
                if fa * fb >= 0:
                    datos["xi"] = ""
                    datos["xu"] = ""
                    error_msg = (
                        "La raíz no se encuentra dentro del intervalo seleccionado. "
                        "El método requiere que f(a) y f(b) tengan signos opuestos."
                    )
                    return render_template(
                        "regla_falsa.html",
                        datos=datos,
                        resultados=None,
                        raiz=None,
                        n_iter=None,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                    )

                # Si todo es válido, ejecutar método de Regla Falsa
                resultados, raiz, n_iter = metodo_regla_falsa(
                    expr, xi, xu, es, max_iter
                )

            # ============================
            # 2) GRÁFICA (siempre que haya expr)
            # ============================
            if xi_str == "" or xu_str == "":
                # rango por defecto si no hay intervalos
                gx_i = -10.0
                gx_u = 10.0
            else:
                gx_i = float(xi_str)
                gx_u = float(xu_str)

            if gx_i == gx_u:
                gx_i -= 5
                gx_u += 5

            num_puntos = 400
            xs = []
            ys = []
            for i in range(num_puntos + 1):
                x = gx_i + (gx_u - gx_i) * i / num_puntos
                try:
                    y = evaluar_funcion(expr, x)
                    if not math.isfinite(y):
                        y = float("nan")
                except Exception:
                    y = float("nan")
                xs.append(x)
                ys.append(y)

            # Detectar puntos aproximados donde la función corta el eje X
            roots_x = []
            for i in range(1, len(xs)):
                y1 = ys[i - 1]
                y2 = ys[i]
                x1 = xs[i - 1]
                x2 = xs[i]

                if not (math.isfinite(y1) and math.isfinite(y2)):
                    continue

                # cruce exacto
                if y1 == 0:
                    roots_x.append(x1)

                # cambio de signo
                if y1 * y2 < 0:
                    # interpolación lineal
                    x0 = x1 - y1 * (x2 - x1) / (y2 - y1)
                    roots_x.append(x0)

            # Crear la figura con Matplotlib
            fig, ax = plt.subplots(figsize=(6, 3))
            ax.axhline(0, color="black", linewidth=0.8)
            ax.axvline(0, color="black", linewidth=0.8)

            ax.plot(xs, ys, linewidth=1.8)
            if roots_x:
                ax.scatter(roots_x, [0] * len(roots_x), s=25)

            ax.set_xlabel("x")
            ax.set_ylabel("f(x)")
            ax.set_title("Gráfica de f(x)")
            ax.grid(True, linestyle=":", linewidth=0.5)

            buf = io.BytesIO()
            fig.tight_layout()
            fig.savefig(buf, format="png")
            buf.seek(0)
            grafica_png = base64.b64encode(buf.getvalue()).decode("utf-8")
            plt.close(fig)

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template(
        "regla_falsa.html",
        datos=datos,
        resultados=resultados,
        raiz=raiz,
        n_iter=n_iter,
        error_msg=error_msg,
        grafica_png=grafica_png,
    )


    
@metodos_bp.route("/newton-raphson", methods=["GET", "POST"])
def newton_raphson():
    from sympy import symbols, sympify, diff, latex

    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    derivada_latex = None

    # valores iniciales del formulario (vacíos)
    datos = {
        "funcion_pretty": "",
        "funcion": "",
        "funcion_latex": "",
        "x0": "",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            func_pretty = request.form.get("funcion_pretty", "").strip()
            expr = request.form.get("funcion", "").strip()

            # si no hay función, NO ponemos ejemplo, mostramos error
            if not func_pretty or not expr:
                raise ValueError("Debes ingresar la función f(x).")

            # LaTeX bonito desde lo que ve el usuario
            func_latex = pretty_to_latex(func_pretty)

            # Derivada simbólica
            x = symbols("x")
            f_sym = sympify(expr)
            fprime_sym = diff(f_sym, x)
            derivada_latex = latex(fprime_sym)

            # Parámetros numéricos
            x0_str = request.form.get("x0", "").strip()
            if x0_str == "":
                raise ValueError("Debes ingresar un valor inicial x₀.")
            x0 = float(x0_str)

            es = float(request.form.get("es", "0.0001"))
            max_iter = int(request.form.get("max_iter", "50"))

            # Ejecutar método
            resultado = metodo_newton_raphson(expr, x0, es, max_iter)
            resultados = resultado["tabla"]
            raiz = resultado["raiz"]
            n_iter = resultado["n_iter"]

            # Lo que se vuelve a pintar en el form
            datos["funcion_pretty"] = func_pretty
            datos["funcion"] = expr
            datos["funcion_latex"] = func_latex
            datos["x0"] = x0_str
            datos["es"] = str(es)
            datos["max_iter"] = str(max_iter)

        except Exception as e:
            error_msg = f"No se pudo aplicar el método: {e}"

    return render_template(
        "newton_raphson.html",
        datos=datos,
        resultados=resultados,
        raiz=raiz,
        n_iter=n_iter,
        error_msg=error_msg,
        derivada_latex=derivada_latex,
    )


@metodos_bp.route("/secante", methods=["GET", "POST"])
def secante():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None

    # valores por defecto que usamos en el HTML
    datos = {
        "funcion_pretty": "",
        "funcion": "",
        "funcion_latex": "",
        "x0": "",
        "x1": "",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            # 1) Lo que el usuario ESCRIBE (bonito)
            funcion_pretty = request.form.get("funcion_pretty", "")

            # 2) Versión "real" en sintaxis Python (la llena tu JS en el input hidden name="funcion")
            expr = request.form.get("funcion", "")

            # 3) (opcional) LaTeX, por si lo usas en algún lado
            funcion_latex = request.form.get("funcion_latex", "")

            x0 = float(request.form.get("x0", "0"))
            x1 = float(request.form.get("x1", "0"))
            es = float(request.form.get("es", "0.0001"))
            max_iter = int(request.form.get("max_iter", "50"))

            datos.update({
                "funcion_pretty": funcion_pretty,  # lo que se ve en el input
                "funcion": expr,                   # versión Python
                "funcion_latex": funcion_latex,
                "x0": x0,
                "x1": x1,
                "es": es,
                "max_iter": max_iter,
            })

            # Llamada correcta a tu método de la secante
            resultados, raiz, n_iter, error_msg = metodo_secante(
                expr,      # expr_str
                x0,        # x0
                x1,        # x1
                es,        # es
                max_iter,  # max_iter
            )

        except ValueError:
            error_msg = "El valor inicial y/o el segundo valor no pueden estar vacíos"

    return render_template(
        "secante.html",
        datos=datos,
        resultados=resultados,
        raiz=raiz,
        n_iter=n_iter,
        error_msg=error_msg,
    )

