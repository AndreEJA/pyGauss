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
    tex = re.sub(r'([A-Za-z0-9\)\]])\^\(([^)]+)\)', r'\1^{ \2 }', tex)
    tex = re.sub(r'([A-Za-z0-9\)\]])\^(-?[A-Za-z0-9]+)', r'\1^{ \2 }', tex)

    return tex


@metodos_bp.route("/biseccion", methods=["GET", "POST"])
def biseccion():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    grafica_png = None

    expr_default = "x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10"
    latex_default = r"x^4 - 5x^3 + 0.5x^2 - 11x + 10"

    datos = {
        "funcion": "",
        "funcion_latex": "",
        "xi": "",
        "xu": "",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            accion = request.form.get("accion", "biseccion")
            expr = (request.form.get("funcion") or "").strip()
            func_latex = (request.form.get("funcion_latex") or "").strip()

            if not expr: expr = expr_default
            if not func_latex: func_latex = latex_default

            xi_str = (request.form.get("xi") or "").strip()
            xu_str = (request.form.get("xu") or "").strip()
            es_str = (request.form.get("es") or "0.0001").strip()
            max_iter_str = (request.form.get("max_iter") or "50").strip()

            datos.update({
                "funcion": expr, "funcion_latex": func_latex,
                "xi": xi_str, "xu": xu_str,
                "es": es_str, "max_iter": max_iter_str
            })

            if accion == "biseccion":
                if xi_str == "" or xu_str == "":
                    datos.update({"xi": "", "xu": ""})
                    error_msg = "Debes ingresar un intervalo [a, b]."
                    return render_template("biseccion.html", datos=datos, error_msg=error_msg)

                xi = float(xi_str)
                xu = float(xu_str)
                es = float(es_str)
                max_iter = int(max_iter_str)

                if xi >= xu:
                    datos.update({"xi": "", "xu": ""})
                    error_msg = "El intervalo no es válido (a < b)."
                    return render_template("biseccion.html", datos=datos, error_msg=error_msg)

                fa = evaluar_funcion(expr, xi)
                fb = evaluar_funcion(expr, xu)
                if fa * fb >= 0:
                    datos.update({"xi": "", "xu": ""})
                    error_msg = "La raíz no está en el intervalo (f(a) y f(b) deben tener signos opuestos)."
                    return render_template("biseccion.html", datos=datos, error_msg=error_msg)

                resultados, raiz, n_iter = metodo_biseccion(expr, xi, xu, es, max_iter)

            # --- GRÁFICA ---
            if xi_str == "" or xu_str == "":
                gx_i, gx_u = -10.0, 10.0
            else:
                gx_i, gx_u = float(xi_str), float(xu_str)
            
            if gx_i == gx_u: gx_i -= 5; gx_u += 5

            num_puntos = 400
            xs = []
            ys = []
            for i in range(num_puntos + 1):
                x = gx_i + (gx_u - gx_i) * i / num_puntos
                try:
                    y = evaluar_funcion(expr, x)
                    if not math.isfinite(y): y = float("nan")
                except: y = float("nan")
                xs.append(x)
                ys.append(y)

            roots_x = []
            for i in range(1, len(xs)):
                y1, y2 = ys[i-1], ys[i]
                if not (math.isfinite(y1) and math.isfinite(y2)): continue
                if y1 == 0: roots_x.append(xs[i-1])
                if y1 * y2 < 0:
                    x0 = xs[i-1] - y1 * (xs[i] - xs[i-1]) / (y2 - y1)
                    roots_x.append(x0)

            fig, ax = plt.subplots(figsize=(6, 3))
            ax.axhline(0, color="black", linewidth=0.8)
            ax.axvline(0, color="black", linewidth=0.8)
            ax.plot(xs, ys, linewidth=1.8)
            if roots_x: ax.scatter(roots_x, [0]*len(roots_x), s=25)
            ax.set_xlabel("x"); ax.set_ylabel("f(x)")
            ax.set_title("Gráfica de f(x)")
            ax.grid(True, linestyle=":", linewidth=0.5)
            
            buf = io.BytesIO()
            fig.tight_layout(); fig.savefig(buf, format="png")
            buf.seek(0)
            grafica_png = base64.b64encode(buf.getvalue()).decode("utf-8")
            plt.close(fig)

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template("biseccion.html", datos=datos, resultados=resultados, raiz=raiz, n_iter=n_iter, error_msg=error_msg, grafica_png=grafica_png)


@metodos_bp.route("/regla-falsa", methods=["GET", "POST"])
def regla_falsa():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    grafica_png = None

    datos = {
        "funcion": "", "funcion_latex": "",
        "xi": "", "xu": "", "es": "0.0001", "max_iter": "50",
    }

    if request.method == "POST":
        try:
            accion = request.form.get("accion", "regla_falsa")
            expr = (request.form.get("funcion") or "").strip()
            latex = (request.form.get("funcion_latex") or "").strip()
            xi_str = (request.form.get("xi") or "").strip()
            xu_str = (request.form.get("xu") or "").strip()
            es_str = (request.form.get("es") or "0.0001").strip()
            max_iter_str = (request.form.get("max_iter") or "50").strip()

            datos.update({
                "funcion": expr, "funcion_latex": latex,
                "xi": xi_str, "xu": xu_str, "es": es_str, "max_iter": max_iter_str
            })

            if not expr:
                error_msg = "Debes ingresar la función f(x)."
                return render_template("regla_falsa.html", datos=datos, error_msg=error_msg)

            es = float(es_str or "0.0001")
            max_iter = int(max_iter_str or "50")

            if accion == "regla_falsa":
                if xi_str == "" or xu_str == "":
                    error_msg = "Debes ingresar el intervalo [a,b]."
                    return render_template("regla_falsa.html", datos=datos, error_msg=error_msg)

                xi = float(xi_str)
                xu = float(xu_str)

                if xi >= xu:
                    error_msg = "El intervalo no es válido (a < b)."
                    datos.update({"xi": "", "xu": ""})
                    return render_template("regla_falsa.html", datos=datos, error_msg=error_msg)

                fa = evaluar_funcion(expr, xi)
                fb = evaluar_funcion(expr, xu)
                if fa * fb >= 0:
                    error_msg = "La regla falsa requiere signos opuestos en f(a) y f(b)."
                    datos.update({"xi": "", "xu": ""})
                    return render_template("regla_falsa.html", datos=datos, error_msg=error_msg)

                resultados, raiz, n_iter = metodo_regla_falsa(expr, xi, xu, es, max_iter)

            # --- GRÁFICA ---
            if xi_str == "" or xu_str == "":
                gx_i, gx_u = -10.0, 10.0
            else:
                gx_i, gx_u = float(xi_str), float(xu_str)
            
            if gx_i == gx_u: gx_i -= 5; gx_u += 5

            num_puntos = 400
            xs, ys = [], []
            for i in range(num_puntos + 1):
                x = gx_i + (gx_u - gx_i) * i / num_puntos
                try:
                    y = evaluar_funcion(expr, x)
                    if not math.isfinite(y): y = float("nan")
                except: y = float("nan")
                xs.append(x); ys.append(y)

            roots_x = []
            for i in range(1, len(xs)):
                y1, y2 = ys[i-1], ys[i]
                if not (math.isfinite(y1) and math.isfinite(y2)): continue
                if y1 == 0: roots_x.append(xs[i-1])
                if y1 * y2 < 0:
                    x0 = xs[i-1] - y1 * (xs[i] - xs[i-1]) / (y2 - y1)
                    roots_x.append(x0)

            fig, ax = plt.subplots(figsize=(6, 3))
            ax.axhline(0, color="black", linewidth=0.8)
            ax.axvline(0, color="black", linewidth=0.8)
            ax.plot(xs, ys, linewidth=1.8)
            if roots_x: ax.scatter(roots_x, [0]*len(roots_x), s=25)
            ax.set_xlabel("x"); ax.set_ylabel("f(x)")
            ax.set_title("Gráfica de f(x)")
            ax.grid(True, linestyle=":", linewidth=0.5)
            
            buf = io.BytesIO()
            fig.tight_layout(); fig.savefig(buf, format="png")
            buf.seek(0)
            grafica_png = base64.b64encode(buf.getvalue()).decode("utf-8")
            plt.close(fig)

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template("regla_falsa.html", datos=datos, resultados=resultados, raiz=raiz, n_iter=n_iter, error_msg=error_msg, grafica_png=grafica_png)


@metodos_bp.route("/newton-raphson", methods=["GET", "POST"])
def newton_raphson():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    derivada_latex = None
    ultima_iter = None
    grafica_png = None

    datos = {
        "funcion": "", "funcion_latex": "",
        "x0": "", "es": "0.0001", "max_iter": "50",
    }

    if request.method == "POST":
        try:
            accion = (request.form.get("accion") or "newton").strip()
            expr = (request.form.get("funcion") or "").strip()
            latex_str = (request.form.get("funcion_latex") or "").strip()
            x0_str = (request.form.get("x0") or "").strip()
            es_str = (request.form.get("es") or "0.0001").strip()
            max_iter_str = (request.form.get("max_iter") or "50").strip()
            force_calc = request.form.get("force_calc")  # <--- CAPTURA DEL CAMPO OCULTO

            datos.update({
                "funcion": expr, "funcion_latex": latex_str,
                "x0": x0_str, "es": es_str, "max_iter": max_iter_str,
            })

            if not expr:
                error_msg = "Debes ingresar la función f(x)."
            else:
                # --- PREPARAR GRÁFICA Y DETECTAR RAÍCES ---
                if x0_str:
                    centro = float(x0_str)
                    gx_i, gx_u = centro - 5, centro + 5
                else:
                    gx_i, gx_u = -10.0, 10.0

                num_puntos = 400
                xs, ys = [], []
                for i in range(num_puntos + 1):
                    x = gx_i + (gx_u - gx_i) * i / num_puntos
                    try:
                        # evaluar_funcion es segura para gráficas
                        y = evaluar_funcion(expr, x) 
                        if not math.isfinite(y): y = float("nan")
                    except: y = float("nan")
                    xs.append(x); ys.append(y)

                roots_x = []
                for i in range(1, len(xs)):
                    y1, y2 = ys[i-1], ys[i]
                    if not (math.isfinite(y1) and math.isfinite(y2)): continue
                    if y1 == 0: roots_x.append(xs[i-1])
                    if y1 * y2 < 0:
                        x0_root = xs[i-1] - y1 * (xs[i] - xs[i-1]) / (y2 - y1)
                        roots_x.append(x0_root)

                # --- GENERAR IMAGEN DE LA GRÁFICA ---
                fig, ax = plt.subplots(figsize=(6, 3))
                ax.axhline(0, color="black", linewidth=0.8)
                ax.axvline(0, color="black", linewidth=0.8)
                ax.plot(xs, ys, linewidth=1.8)
                if roots_x: ax.scatter(roots_x, [0]*len(roots_x), s=25)
                ax.set_xlabel("x"); ax.set_ylabel("f(x)")
                ax.set_title("Gráfica de f(x)")
                ax.grid(True, linestyle=":", linewidth=0.5)
                buf = io.BytesIO()
                fig.tight_layout(); fig.savefig(buf, format="png")
                buf.seek(0)
                grafica_png = base64.b64encode(buf.getvalue()).decode("utf-8")
                plt.close(fig)

                # --- LÓGICA DE INTERCEPCIÓN (ADVERTENCIA) ---
                # Si no hay raíces, y el usuario quiere calcular (accion='newton'), 
                # y NO ha forzado el cálculo todavía:
                if accion == "newton" and not roots_x and not force_calc:
                    error_msg = "ADVERTENCIA: La función no parece cruzar el eje X en el rango visible. ¿Deseas forzar el cálculo de iteraciones?"
                    # Retornamos AQUÍ para que el usuario vea el mensaje y decida.
                    return render_template(
                        "newton_raphson.html",
                        datos=datos,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                        resultados=None
                    )

                # --- CÁLCULO DEL MÉTODO ---
                # Se ejecuta si accion es 'newton' Y (hay raíces O se forzó el cálculo)
                if accion == "newton":
                    if not x0_str:
                        raise ValueError("Debes ingresar un valor inicial x₀.")
                    
                    x0 = float(x0_str)
                    es = float(es_str)
                    max_iter = int(max_iter_str)

                    # Llamada al método numérico
                    ret = metodo_newton_raphson(expr, x0, es=es, max_iter=max_iter)

                    if isinstance(ret, dict):
                        raiz = ret.get("raiz")
                        resultados = ret.get("tabla")
                    
                    if resultados:
                        ultima_iter = resultados[-1]
                        n_iter = len(resultados)
                    else:
                        n_iter = 0

                    # Derivada simbólica para mostrar
                    x_sym = symbols('x')
                    try:
                        f_sym = sympify(expr)
                        fprime_sym = diff(f_sym, x_sym)
                        derivada_latex = latex(fprime_sym)
                    except:
                        derivada_latex = ""

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template(
        "newton_raphson.html",
        datos=datos,
        resultados=resultados,
        raiz=raiz,
        n_iter=n_iter,
        derivada_latex=derivada_latex,
        ultima_iter=ultima_iter,
        error_msg=error_msg,
        grafica_png=grafica_png,
    )


@metodos_bp.route("/secante", methods=["GET", "POST"])
def secante():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None
    grafica_png = None

    datos = {
        "funcion": "", "funcion_latex": "",
        "x0": "", "x1": "", "es": "0.0001", "max_iter": "50",
    }

    if request.method == "POST":
        try:
            accion = (request.form.get("accion") or "secante").strip()
            expr = (request.form.get("funcion") or "").strip()
            latex_str = (request.form.get("funcion_latex") or "").strip()
            x0_str = (request.form.get("x0") or "").strip()
            x1_str = (request.form.get("x1") or "").strip()
            es_str = (request.form.get("es") or "0.0001").strip()
            max_iter_str = (request.form.get("max_iter") or "50").strip()
            force_calc = request.form.get("force_calc") # <--- CAPTURA DEL CAMPO OCULTO

            datos.update({
                "funcion": expr, "funcion_latex": latex_str,
                "x0": x0_str, "x1": x1_str,
                "es": es_str, "max_iter": max_iter_str,
            })

            if not expr:
                error_msg = "Debes ingresar la función f(x)."
            else:
                # --- PREPARAR GRÁFICA Y DETECTAR RAÍCES ---
                if x0_str and x1_str:
                    gx_i = float(x0_str)
                    gx_u = float(x1_str)
                    if gx_i == gx_u: gx_i -= 5; gx_u += 5
                else:
                    gx_i, gx_u = -10.0, 10.0

                num_puntos = 400
                xs, ys = [], []
                for i in range(num_puntos + 1):
                    x = gx_i + (gx_u - gx_i) * i / num_puntos
                    try:
                        y = evaluar_funcion(expr, x)
                        if not math.isfinite(y): y = float("nan")
                    except: y = float("nan")
                    xs.append(x); ys.append(y)

                roots_x = []
                for i in range(1, len(xs)):
                    y1, y2 = ys[i-1], ys[i]
                    if not (math.isfinite(y1) and math.isfinite(y2)): continue
                    if y1 == 0: roots_x.append(xs[i-1])
                    if y1 * y2 < 0:
                        x0_root = xs[i-1] - y1 * (xs[i] - xs[i-1]) / (y2 - y1)
                        roots_x.append(x0_root)

                # --- GENERAR IMAGEN ---
                fig, ax = plt.subplots(figsize=(6, 3))
                ax.axhline(0, color="black", linewidth=0.8)
                ax.axvline(0, color="black", linewidth=0.8)
                ax.plot(xs, ys, linewidth=1.8)
                if roots_x: ax.scatter(roots_x, [0]*len(roots_x), s=25)
                ax.set_xlabel("x"); ax.set_ylabel("f(x)")
                ax.set_title("Gráfica de f(x)")
                ax.grid(True, linestyle=":", linewidth=0.5)
                buf = io.BytesIO()
                fig.tight_layout(); fig.savefig(buf, format="png")
                buf.seek(0)
                grafica_png = base64.b64encode(buf.getvalue()).decode("utf-8")
                plt.close(fig)

                # --- LÓGICA DE INTERCEPCIÓN (ADVERTENCIA) ---
                if accion == "secante" and not roots_x and not force_calc:
                    error_msg = "ADVERTENCIA: La función no parece cruzar el eje X en el rango visible. ¿Deseas forzar el cálculo de iteraciones?"
                    return render_template(
                        "secante.html",
                        datos=datos,
                        error_msg=error_msg,
                        grafica_png=grafica_png,
                        resultados=None
                    )

                # --- CÁLCULO DEL MÉTODO ---
                if accion == "secante":
                    if x0_str == "" or x1_str == "":
                        error_msg = "Debes ingresar x₀ y x₁."
                    else:
                        x0 = float(x0_str)
                        x1 = float(x1_str)
                        es = float(es_str)
                        max_iter = int(max_iter_str)

                        if x0 == x1:
                            error_msg = "x₀ y x₁ deben ser distintos."
                        else:
                            # Llamada al método numérico
                            ret = metodo_secante(expr, x0, x1, es, max_iter)
                            
                            # Manejo flexible del retorno (tuplas o dicts)
                            if isinstance(ret, dict):
                                resultados = ret.get("resultados") or ret.get("tabla")
                                raiz = ret.get("raiz")
                                n_iter = ret.get("n_iter")
                            elif isinstance(ret, (list, tuple)):
                                # Asumiendo tupla: (resultados, raiz, n_iter, error_opt)
                                if len(ret) >= 3:
                                    resultados, raiz, n_iter = ret[0], ret[1], ret[2]
                                    if len(ret) > 3 and ret[3]: error_msg = ret[3]
                                else:
                                    resultados = ret

                            if n_iter is None and isinstance(resultados, list):
                                n_iter = len(resultados)

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template(
        "secante.html",
        datos=datos,
        resultados=resultados,
        raiz=raiz,
        n_iter=n_iter,
        error_msg=error_msg,
        grafica_png=grafica_png,
    )