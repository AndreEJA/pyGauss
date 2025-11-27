from flask import Blueprint, render_template, request, jsonify
from sympy import symbols, sympify, limit, oo, N, diff, latex 
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
        "funcion_pretty": "",
        "funcion": "",
        "funcion_latex": "",
        "a": "",
        "dir": "",
    }
    
    if request.method == "POST":
        try:
            func_pretty = request.form.get("funcion_pretty", "").strip()
            expr = request.form.get("funcion", "").strip()
            a_str = request.form.get("a", "").strip()
            dir_str = request.form.get("dir", "").strip()

            if not func_pretty or not expr:
                raise ValueError("Debes ingresar la función f(x).")
            if not a_str:
                raise ValueError("Debes ingresar el punto de límite 'a'.")

            datos.update({
                "funcion_pretty": func_pretty,
                "funcion": expr,
                "funcion_latex": pretty_to_latex(func_pretty),
                "a": a_str,
                "dir": dir_str,
            })

            x = symbols("x")
            f_sym = sympify(expr)
            a_sym = safe_sympify(a_str)
            
            dir_calculo = dir_str if dir_str in ["+", "-"] else "+"
            
            limite_calculado = limit(f_sym, x, a_sym, dir=dir_calculo)
            
            if str(limite_calculado).replace("oo", "∞").replace("-oo", "-∞") in ["∞", "-∞"] or limite_calculado.has(oo):
                limite_display = str(limite_calculado).replace("oo", "∞")
            else:
                limite_display = N(limite_calculado, 6)
                limite_display = str(limite_display).replace("E", "e")

            if str(a_sym) in ["oo", "-oo"]:
                limite_expresion = f"\\lim_{{x \\to {a_str.replace('oo', '\\infty').replace('-', '-')}}} f(x)"
            elif dir_str == "+":
                 limite_expresion = f"\\lim_{{x \\to {a_str}^+}} f(x)"
            elif dir_str == "-":
                 limite_expresion = f"\\lim_{{x \\to {a_str}}}^- f(x)"
            else:
                 limite_expresion = f"\\lim_{{x \\to {a_str}}} f(x)"

            resultado_limite = {
                "expresion": limite_expresion,
                "valor_simbolico": str(limite_calculado),
                "valor_display": str(limite_display),
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
        "funcion_pretty": "",
        "funcion": "",
        "funcion_latex": "",
        "orden": "1"
    }

    if request.method == "POST":
        try:
            func_pretty = request.form.get("funcion_pretty", "").strip()
            expr = request.form.get("funcion", "").strip()
            orden_str = request.form.get("orden", "1").strip()
            
            if not func_pretty or not expr:
                raise ValueError("Debes ingresar la función f(x).")
            
            orden = int(orden_str)
            if orden < 1:
                 raise ValueError("El orden de la derivada debe ser al menos 1.")

            x = symbols("x")
            f_sym = sympify(expr)
            
            fprime_sym = diff(f_sym, x, orden)
            derivada_latex = latex(fprime_sym)

            if orden == 1:
                operador_latex = f"\\frac{{d}}{{dx}}"
                derivada_expresion = f"f'(x) = {derivada_latex}"
            else:
                 operador_latex = f"\\frac{{d^{{{orden}}}}}{{dx^{{{orden}}}}}"
                 derivada_expresion = f"f^{{({orden})}}(x) = {derivada_latex}"

            
            datos.update({
                "funcion_pretty": func_pretty,
                "funcion": expr,
                "funcion_latex": pretty_to_latex(func_pretty),
                "orden": orden_str,
            })
            
            resultado_derivada = {
                "expresion": operador_latex,
                "derivada_latex": derivada_expresion,
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


@calculo_bp.route("/integrales", methods=["GET"])
def integrales():
    """Placeholder para evitar BuildError en url_for('calculo.integrales')"""
    # Usaremos un placeholder de HTML simple que diga "En desarrollo"
    return render_template("integrales.html", title="Integrales (En Desarrollo)")