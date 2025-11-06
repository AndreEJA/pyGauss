from flask import Blueprint, render_template, request
from .biseccion import metodo_biseccion, evaluar_funcion
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
    grafica_png = None   
    
    # Función por defecto si el usuario no ingresa nada
    expr_default = "x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10"
    pretty_default = "x^4 - 5x^3 + 0.5x^2 - 11x + 10"
    
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
            accion = request.form.get("accion", "biseccion")  

            func_pretty = request.form.get("funcion_pretty", "").strip()

            expr = request.form.get("funcion", "").strip()

            if not expr:
                expr = expr_default
            if not func_pretty:
                func_pretty = pretty_default

            func_latex = pretty_to_latex(func_pretty)

            xi_str = request.form.get("xi", "").strip()
            xu_str = request.form.get("xu", "").strip()

            if xi_str == "" or xu_str == "":
                # Si solo quiere graficar, le damos un rango por defecto
                if accion == "graficar":
                    xi = -10.0
                    xu = 10.0
                else:
                    xi = float(xi_str or "0.0")
                    xu = float(xu_str or "0.0")
            else:
                xi = float(xi_str)
                xu = float(xu_str)

            es = float(request.form.get("es", "0.0001"))
            max_iter = int(request.form.get("max_iter", "50"))

            # Guardar lo que se volverá a pintar en el formulario / resultados
            datos["funcion_pretty"] = func_pretty
            datos["funcion"] = expr         
            datos["funcion_latex"] = func_latex  
            datos["xi"] = "" if accion == "graficar" and (xi_str == "" or xu_str == "") else str(xi)
            datos["xu"] = "" if accion == "graficar" and (xi_str == "" or xu_str == "") else str(xu)
            datos["es"] = str(es)
            datos["max_iter"] = str(max_iter)

            # 1) Si pidió calcular bisección, ejecutamos el método
            if accion == "biseccion":
                resultados, raiz, n_iter = metodo_biseccion(
                    expr, xi, xu, es, max_iter
                )

            # 2) Siempre que tengamos expr, generamos la gráfica con Matplotlib
            #    usando el intervalo [xi, xu]
            if xi == xu:
                xi -= 5
                xu += 5

            num_puntos = 400
            xs = []
            ys = []
            for i in range(num_puntos + 1):
                x = xi + (xu - xi) * i / num_puntos
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
                y1 = ys[i-1]
                y2 = ys[i]
                x1 = xs[i-1]
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
    return render_template("regla_falsa.html", title="Regla Falsa (En Desarrollo)")
