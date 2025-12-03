# app/matrices/aplicaciones/routes.py
from flask import Blueprint, render_template, request, jsonify
from ..gauss.pygauss_ext import gauss_jordan_solve
from ..gauss.algebra import EvaluadorSeguro
import re

aplicaciones_bp = Blueprint("aplicaciones", __name__, template_folder="../../../templates")

@aplicaciones_bp.route("/economia", methods=["GET"])
def vista_economia():
    return render_template("economia.html", title="Aplicaciones: Economía")

def formatear_linea(linea, usar_decimales):
    """
    Convierte fracciones 'a/b' en decimales si se solicita.
    Ejemplo: '3/2' -> '1.50'
    """
    if not usar_decimales:
        return linea
    
    def repl(match):
        try:
            num = float(match.group(1))
            den = float(match.group(2))
            val = num / den
            return f"{val:.4f}".rstrip('0').rstrip('.')
        except:
            return match.group(0)

    # Busca patrones num/den. El regex busca dígitos, un slash y dígitos.
    # Se ignora si forma parte de nombres de variables (aunque x1/x2 no debería pasar aquí).
    return re.sub(r'(-?\d+)/(\d+)', repl, linea)

@aplicaciones_bp.route("/economia/resolver", methods=["POST"])
def resolver_economia():
    datos = request.get_json(force=True)
    tabla_raw = datos.get("tabla", [])
    nombres = datos.get("nombres", [])
    usar_decimales = datos.get("usar_decimales", False)
    
    if not tabla_raw:
        return jsonify({"ok": False, "error": "Matriz vacía"}), 400

    try:
        n = len(tabla_raw)
        evaluador = EvaluadorSeguro()
        M = []
        for fila in tabla_raw:
            vals = []
            for celda in fila:
                vals.append(evaluador.evaluar(str(celda)))
            M.append(vals)

        # Construcción del sistema (M - I)p = 0
        A_sistema = []
        for i in range(n):
            fila_sistema = []
            for j in range(n):
                val = M[i][j]
                if i == j:
                    val = val - 1
                fila_sistema.append(val)
            A_sistema.append(fila_sistema)

        b = [0] * n

        # Resolvemos (siempre mantenemos fracciones internamente para precisión)
        res = gauss_jordan_solve(A_sistema, b, keep_steps=False)
        
        # --- Post-Procesamiento para la Vista ---
        
        lineas_crudas = res["lines"]
        lineas_finales = []
        mapa_vars = {f"x{i+1}": f"P({nombres[i]})" for i in range(n)}
        
        # Detectar variable libre para la interpretación (usualmente la última)
        var_libre_nombre = None
        if res["free_vars"]:
            idx_libre = res["free_vars"][-1]
            var_libre_nombre = nombres[idx_libre]

        for linea in lineas_crudas:
            txt = linea
            # Reemplazar variables x1 -> P(Carbon)
            for k in range(n, 0, -1):
                key = f"x{k}"
                if key in txt:
                    txt = txt.replace(key, mapa_vars[key])
            
            # Convertir a decimales si aplica
            txt = formatear_linea(txt, usar_decimales)
            lineas_finales.append(txt)

        res["lines"] = lineas_finales
        
        # --- Interpretación ---
        interpretacion = ""
        if res["status"] == "infinite":
            interpretacion = (
                "<strong>Equilibrio Relativo Encontrado:</strong><br>"
                "En este modelo cerrado, los precios no son absolutos, sino que dependen unos de otros. "
            )
            if var_libre_nombre:
                interpretacion += (
                    f"Si fijamos el precio base de <strong>{var_libre_nombre}</strong> en <strong>100</strong>, "
                    "los demás precios se ajustan proporcionalmente según las ecuaciones de abajo."
                )
        elif res["status"] == "unique":
            interpretacion = (
                "<strong>Solución Trivial:</strong><br>"
                "El único equilibrio matemático es que todos los precios sean 0. "
                "Esto suele indicar que la tabla de producción no suma correctamente (no es estocástica por columnas) "
                "o que el sistema no es productivo."
            )
        else:
            interpretacion = "El sistema es inconsistente."

        # Eliminamos 'steps' explícitamente para no enviarlos
        if "steps" in res:
            del res["steps"]

        return jsonify({"ok": True, "resultado": res, "interpretacion": interpretacion})

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400