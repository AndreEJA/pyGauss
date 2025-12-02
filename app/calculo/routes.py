from flask import Blueprint, render_template, request, jsonify
from sympy import symbols, sympify, limit, oo, N, latex, diff, integrate
from builtins import str as py_str
import re
import math

def pretty_to_latex(pretty: str) -> str:
    """Traduce la expresión "bonita" del usuario a código LaTeX."""
    if not pretty: return ""
    tex = pretty.strip()
    tex = re.sub(r'\bsen\(', r'\\sin(', tex, flags=re.I)
    tex = re.sub(r'\btg\(',  r'\\tan(', tex, flags=re.I)
    tex = re.sub(r'\btan\(', r'\\tan(', tex, flags=re.I)
    tex = re.sub(r'\bcos\(', r'\\cos(', tex, flags=re.I)
    tex = re.sub(r'\bln\(', r'\\ln(', tex, flags=re.I)
    tex = re.sub(r'log10\(', r'\\log_{10}(', tex, flags=re.I)
    tex = re.sub(r'log_([0-9A-Za-z]+)\(', r'\\log_{\1}(', tex)
    tex = re.sub(r'√\(([^)]+)\)', r'\\sqrt{\1}', tex)
    tex = re.sub(r'√([A-Za-z0-9]+)', r'\\sqrt{\1}', tex)
    tex = re.sub(r'π', r'\\pi', tex)
    tex = re.sub(r'\(([^)]+)\)\s*/\s*\(([^)]+)\)', r'\\frac{\1}{\2}', tex)
    tex = re.sub(r'(\d+)\s*/\s*(\d+)', r'\\frac{\1}{\2}', tex)
    tex = re.sub(r'([A-Za-z0-9\)\]])\^\(([^)]+)\)', r'\1^{ \2 }', tex)
    tex = re.sub(r'([A-Za-z0-9\)\]])\^(-?[A-Za-z0-9]+)', r'\1^{ \2 }', tex)
    return tex

def safe_sympify(expr_str):
    """Convierte una cadena a una expresión SymPy, manejando constantes."""
    expr_str = str(expr_str).replace("inf", "oo").replace("INF", "oo")
    if expr_str.lower() in ["oo", "+oo"]: return oo
    if expr_str.lower() in ["-oo"]: return -oo
    try:
        return sympify(expr_str, evaluate=False)
    except Exception as e:
        raise ValueError(f"Expresión inválida para SymPy: {expr_str}. Error: {e}")


calculo_bp = Blueprint(
    "calculo",
    __name__,
    url_prefix="/calculo",
    template_folder="../../templates"
)


@calculo_bp.route("/limites", methods=["GET", "POST"])
def limites():
    resultado_limite = None
    error_msg = None
    datos = {
        "funcion": "",
        "funcion_latex": "",
        "a": "",
        "dir": "",
    }
    
    if request.method == "POST":
        try:
            # Lo que viene del MathField + Newton.js
            expr = (request.form.get("funcion") or "").strip()
            latex_input = (request.form.get("funcion_latex") or "").strip()
            a_str = (request.form.get("a") or "").strip()
            dir_str = (request.form.get("dir") or "").strip()

            if not expr:
                raise ValueError("Debes ingresar la función f(x).")
            if not a_str:
                raise ValueError("Debes ingresar el punto de límite 'a'.")

            datos.update({
                "funcion": expr,
                "funcion_latex": latex_input,
                "a": a_str,
                "dir": dir_str,
            })

            x = symbols("x")
            f_sym = sympify(expr)
            a_sym = safe_sympify(a_str)

            # Límite lateral si dir = '+' o '-', bilateral si está vacío
            if dir_str in ["+", "-"]:
                limite_calculado = limit(f_sym, x, a_sym, dir=dir_str)
            else:
                limite_calculado = limit(f_sym, x, a_sym)

            # ----------------- FORMATO PARA MOSTRAR -----------------
            s_lim = py_str(limite_calculado)

            if s_lim.replace("oo", "∞").replace("-oo", "-∞") in ["∞", "-∞"] or limite_calculado.has(oo):
                limite_display = s_lim.replace("oo", "∞")
            else:
                limite_display = N(limite_calculado, 6)
                limite_display = py_str(limite_display).replace("E", "e")

            # LaTeX bonito del valor del límite
            valor_latex = latex(limite_calculado)

            # Notación LaTeX del límite
            if py_str(a_sym) in ["oo", "-oo"]:
                limite_expresion = f"\\lim_{{x \\to {a_str.replace('oo', '\\\\infty')}}} f(x)"
            elif dir_str == "+":
                limite_expresion = f"\\lim_{{x \\to {a_str}^+}} f(x)"
            elif dir_str == "-":
                limite_expresion = f"\\lim_{{x \\to {a_str}^-}} f(x)"
            else:
                limite_expresion = f"\\lim_{{x \\to {a_str}}} f(x)"

            resultado_limite = {
                "expresion": limite_expresion,          # LaTeX de la notación de límite
                "valor_simbolico": s_lim,               # string "y**2 + 3"
                "valor_display": limite_display,        # número aproximado o ∞
                "valor_latex": valor_latex,             # LaTeX del resultado (y^{2} + 3)
            }

        except ValueError as e:
            error_msg = f"Error en los datos de entrada: {e}"
        except Exception as e:
            error_msg = f"Error al calcular el límite: {e}"

    return render_template(
        "limites.html",
        datos=datos,
        resultado_limite=resultado_limite,
        error_msg=error_msg,
    )

@calculo_bp.route("/derivadas", methods=["GET", "POST"])
def derivadas():
    resultado_derivada = None
    error_msg = None
    
    datos = {
        "funcion": "",
        "funcion_latex": "",
        "orden": "1",
    }

    if request.method == "POST":
        try:
            # Lo que viene del MathField + Newton.js
            expr = (request.form.get("funcion") or "").strip()
            latex_input = (request.form.get("funcion_latex") or "").strip()
            orden_str = (request.form.get("orden") or "1").strip()
            
            if not expr:
                raise ValueError("Debes ingresar la función f(x).")
            
            orden = int(orden_str)
            if orden < 1:
                raise ValueError("El orden de la derivada debe ser al menos 1.")

            x = symbols("x")
            f_sym = sympify(expr)
            
            derivadas_pasos = []
            
            # Calcular y almacenar todas las derivadas desde 1 hasta el orden solicitado
            for n in range(1, orden + 1):
                f_n_sym = diff(f_sym, x, n)
                derivada_latex = latex(f_n_sym)
                
                if n == 1:
                    expresion = f"f'(x) = {derivada_latex}"
                elif n == 2:
                    expresion = f"f''(x) = {derivada_latex}"
                elif n == 3:
                    expresion = f"f'''(x) = {derivada_latex}"
                else:
                    expresion = f"f^{{({n})}}(x) = {derivada_latex}"
                
                derivadas_pasos.append({
                    "orden": n,
                    "expresion_latex": expresion,
                    "es_final": (n == orden),
                })

            # La expresión final es la del último paso calculado
            derivada_expresion = derivadas_pasos[-1]["expresion_latex"]
            
            datos.update({
                "funcion": expr,
                "funcion_latex": latex_input,
                "orden": orden_str,
            })
            
            resultado_derivada = {
                "derivada_latex": derivada_expresion,  # La derivada final
                "pasos": derivadas_pasos,              # Todas las derivadas intermedias
            }

        except ValueError as e:
            error_msg = f"Error en los datos de entrada: {e}"
        except Exception as e:
            error_msg = f"Error al calcular la derivada: {e}"

    return render_template(
        "derivadas.html",
        datos=datos,
        resultado_derivada=resultado_derivada,
        error_msg=error_msg,
    )

@calculo_bp.route("/integrales", methods=["GET", "POST"])
def integrales():
    resultado_integral = None
    error_msg = None
    
    datos = {
        "funcion": "",
        "funcion_latex": "",
        "tipo_integral": "indefinida", 
        "limite_a": "",
        "limite_b": "",
        "funcion_pretty": "" 
    }

    if request.method == "POST":
        try:
            expr = request.form.get("funcion", "").strip()
            func_pretty = request.form.get("funcion_pretty", "").strip()
            
            if not expr and func_pretty:
                expr = func_pretty

            # --- LIMPIEZA DE ENTRADA (INT / DX) ---
            expr = re.sub(r'^\\int(?:_\{.*?\}\^\{.*?\})?\s*', '', expr)
            expr = re.sub(r'(\*|\\,)?\s*d[a-zA-Z]\s*$', '', expr)
            expr = expr.strip()

            if not expr:
                raise ValueError("Debes ingresar la función $f(x)$ a integrar.")

            tipo_integral = request.form.get("tipo_integral", "indefinida").strip()
            limite_a_str = request.form.get("limite_a", "").strip()
            limite_b_str = request.form.get("limite_b", "").strip()
            latex_input = request.form.get("funcion_latex", "").strip()

            datos.update({
                "funcion": expr,
                "funcion_latex": latex_input if latex_input else pretty_to_latex(expr),
                "tipo_integral": tipo_integral,
                "limite_a": limite_a_str,
                "limite_b": limite_b_str,
                "funcion_pretty": func_pretty
            })

            x = symbols("x")
            f_sym = sympify(expr)
            
            if tipo_integral == "definida":
                if not limite_a_str or not limite_b_str:
                    raise ValueError("Debes ingresar los límites inferior (a) y superior (b).")
                
                a_sym = safe_sympify(limite_a_str)
                b_sym = safe_sympify(limite_b_str)
                
                integral_sym = integrate(f_sym, (x, a_sym, b_sym))
                resultado_final_latex = latex(integral_sym, ln_notation=True)
                
                # Intentamos también poner valor absoluto en el resultado definido si fuera simbólico
                resultado_final_latex = re.sub(r"\\ln\s*\\{\\left\((.*?)\\right\)\\}", r"\\ln{\\left|\1\\right|}", resultado_final_latex)

                la = limite_a_str.replace('oo', '\\infty').replace('inf', '\\infty')
                lb = limite_b_str.replace('oo', '\\infty').replace('inf', '\\infty')
                
                expresion_latex = f"\\int_{{{la}}}^{{{lb}}} {latex(f_sym, ln_notation=True)} \\, dx"
                
            else:
                # INTEGRAL INDEFINIDA
                integral_sym = integrate(f_sym, x)
                
                # 1. Obtenemos LaTeX base con notación 'ln'
                raw_latex = latex(integral_sym, ln_notation=True)
                
                # 2. TRUCO DE VALOR ABSOLUTO:
                # Reemplazamos \ln{\left( ... \right)} por \ln{\left| ... \right|}
                # Esto convierte ln(u) en ln|u| visualmente.
                final_latex = re.sub(r"\\ln\s*\\{\\left\((.*?)\\right\)\\}", r"\\ln{\\left|\1\\right|}", raw_latex)
                
                resultado_final_latex = f"{final_latex} + C"
                
                expresion_latex = f"\\int {latex(f_sym, ln_notation=True)} \\, dx"
            
            resultado_integral = {
                "expresion": expresion_latex,
                "resultado_latex": resultado_final_latex,
            }

        except ValueError as e:
            error_msg = f"Error en los datos de entrada: {e}"
        except Exception as e:
            error_msg = f"Error al calcular la integral: {e}"

    return render_template(
        "integrales.html",
        datos=datos,
        resultado_integral=resultado_integral,
        error_msg=error_msg,
    )