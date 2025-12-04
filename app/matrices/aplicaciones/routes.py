from flask import Blueprint, render_template, request, jsonify
from ..gauss.pygauss_ext import gauss_jordan_solve
from ..gauss.algebra import EvaluadorSeguro
from fractions import Fraction
import re

aplicaciones_bp = Blueprint("aplicaciones", __name__, template_folder="../../../templates")

@aplicaciones_bp.route("/economia", methods=["GET"])
def vista_economia():
    return render_template("economia.html", title="Aplicaciones: Economía")

def formatear_linea(linea, usar_decimales):
    """Convierte fracciones a decimales en el texto final si se solicita."""
    if not usar_decimales:
        return linea
    def repl(match):
        try:
            val = float(match.group(1)) / float(match.group(2))
            return f"{val:.4f}".rstrip('0').rstrip('.')
        except: return match.group(0)
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
        
        # 1. Construir sistema (M - I)
        A_sistema = []
        for i in range(n):
            fila = []
            for j in range(n):
                val = evaluador.evaluar(str(tabla_raw[i][j]))
                if i == j: val -= 1
                fila.append(val)
            A_sistema.append(fila)

        b = [0] * n
        
        # 2. Resolver
        res = gauss_jordan_solve(A_sistema, b, keep_steps=False)
        
        # 3. Extraer Vector de Proporciones (Base Numérica)
        # Suponemos que la última columna es la variable libre (común en estos problemas)
        # Si x_i + c*x_n = 0  ->  x_i = -c * x_n
        rref = res.get("rref_matrix", []) # Matriz de cadenas fraccionarias
        
        vector_base = [0.0] * n
        # Por defecto, asumimos que la última variable es la libre y vale 1
        idx_libre = n - 1
        vector_base[idx_libre] = 1.0
        
        if res["status"] == "infinite":
            # Extraer coeficientes de la columna de la variable libre
            for i in range(n):
                if i != idx_libre and i < len(rref):
                    # El valor en la columna libre (última)
                    val_str = rref[i][idx_libre] # string "num/den"
                    try:
                        frac = Fraction(val_str)
                        # En RREF: x_i + val * x_libre = 0  => x_i = -val * x_libre
                        vector_base[i] = float(-frac)
                    except:
                        pass
        elif res["status"] == "unique":
            # Todo es cero
            vector_base = [0.0] * n

        # 4. Formatear Texto de Salida
        lineas_finales = []
        mapa_vars = {f"x{i+1}": f"P({nombres[i]})" for i in range(n)}
        
        for linea in res["lines"]:
            txt = linea
            for k in range(n, 0, -1):
                key = f"x{k}"
                txt = txt.replace(key, mapa_vars.get(key, key))
            txt = formatear_linea(txt, usar_decimales)
            lineas_finales.append(txt)

        # Interpretación
        interpretacion = ""
        if res["status"] == "infinite":
            interpretacion = (
                "<strong>Equilibrio Relativo:</strong> Los precios dependen unos de otros. "
                "Usa la calculadora abajo para asignar un valor a un sector y ver cómo afecta a los demás."
            )
        elif res["status"] == "unique":
            interpretacion = "Solución trivial (todos ceros). Revisa si la suma de columnas es 1."
        else:
            interpretacion = "El sistema es inconsistente."

        if "steps" in res: del res["steps"] # No queremos pasos

        return jsonify({
            "ok": True, 
            "resultado": { "lines": lineas_finales },
            "vector_base": vector_base, # Enviamos los números crudos al JS
            "interpretacion": interpretacion
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 400
    
@aplicaciones_bp.route("/economia-abierto", methods=["GET"])
def vista_economia_abierto():
    return render_template("economia_abierto.html", title="Economía: Modelo Abierto")

@aplicaciones_bp.route("/economia-abierto/resolver", methods=["POST"])
def resolver_economia_abierto():
    datos = request.get_json(force=True)
    matriz_A_raw = datos.get("matriz_A", [])
    vector_d_raw = datos.get("vector_d", [])
    nombres = datos.get("nombres", [])
    usar_decimales = datos.get("usar_decimales", False)

    if not matriz_A_raw or not vector_d_raw:
        return jsonify({"ok": False, "error": "Faltan datos (Matriz A o Vector d)"}), 400

    try:
        n = len(matriz_A_raw)
        evaluador = EvaluadorSeguro()

        # 1. Construir el sistema (I - A)x = d
        # Elemento (i, j) del sistema será:
        # Si i == j: 1 - A[i][j]
        # Si i != j: -A[i][j]
        
        sistema_M = []
        for i in range(n):
            fila = []
            for j in range(n):
                val_A = evaluador.evaluar(str(matriz_A_raw[i][j]))
                if i == j:
                    val_sistema = 1 - val_A
                else:
                    val_sistema = -val_A
                fila.append(val_sistema)
            sistema_M.append(fila)

        # Vector b es la demanda externa (d)
        vector_b = [evaluador.evaluar(str(x)) for x in vector_d_raw]

        # 2. Resolver usando Gauss-Jordan
        res = gauss_jordan_solve(sistema_M, vector_b, keep_steps=False)

        # 3. Formatear salida
        lineas_finales = []
        produccion_total = {}
        
        # Mapa de variables x1 -> C, x2 -> I, etc.
        mapa_vars = {f"x{i+1}": nombres[i] if i < len(nombres) else f"Sector {i+1}" for i in range(n)}

        # Procesar los resultados
        # En un sistema compatible determinado (única solución), gauss_jordan devuelve líneas tipo "x1 = 1250"
        
        if res["status"] == "unique":
            # Extraer valores numéricos para mostrarlos limpios
            # Las líneas vienen como "x1 = 2000". Parseamos eso.
            for linea in res["lines"]:
                # linea ejemplo: "x1 = 2500"
                partes = linea.split("=")
                if len(partes) == 2:
                    var_key = partes[0].strip() # x1
                    valor_str = partes[1].strip() # 2500
                    
                    nombre_real = mapa_vars.get(var_key, var_key)
                    
                    # Convertir a decimal para visualización monetaria
                    txt_valor = formatear_linea(valor_str, usar_decimales=True) 
                    
                    lineas_finales.append({
                        "sector": nombre_real,
                        "valor": txt_valor,
                        "raw": valor_str
                    })
        else:
            # Caso raro en economía real (sistema singular), devolvemos las líneas crudas
            for linea in res["lines"]:
                lineas_finales.append({"sector": "Ecuación", "valor": linea})

        interpretacion = "Se han calculado los niveles de producción necesarios para satisfacer tanto la demanda interna como la externa."

        return jsonify({
            "ok": True,
            "solucion": lineas_finales,
            "status": res["status"],
            "interpretacion": interpretacion
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 400


@aplicaciones_bp.route("/leontief-demanda", methods=["GET"])
def vista_leontief_demanda():
    return render_template("leontief_demanda.html", title="Leontief: Demanda Interna")

@aplicaciones_bp.route("/leontief-demanda/resolver", methods=["POST"])
def resolver_leontief_demanda():
    datos = request.get_json(force=True)
    matriz_C_raw = datos.get("matriz_C", []) # Matriz Insumo-Producto
    vector_X_raw = datos.get("vector_X", []) # Producción Total
    nombres = datos.get("nombres", [])
    usar_decimales = datos.get("usar_decimales", False)

    if not matriz_C_raw or not vector_X_raw:
        return jsonify({"ok": False, "error": "Faltan datos (Matriz C o Vector X)"}), 400

    try:
        n = len(matriz_C_raw)
        evaluador = EvaluadorSeguro()

        # 1. Evaluar Matriz C y Vector X
        C = []
        for fila in matriz_C_raw:
            C.append([evaluador.evaluar(str(val)) for val in fila])
        
        X = [evaluador.evaluar(str(val)) for val in vector_X_raw]

        # 2. Calcular Demanda Interna (DI = C * X)
        # DI[i] = Sum(C[i][j] * X[j])
        demanda_interna = []
        detalles_calculo = []

        for i in range(n):
            suma = 0
            pasos_fila = []
            for j in range(n):
                val = C[i][j] * X[j]
                suma += val
                # Guardamos el detalle: "0.2 * 100"
                nombre_dest = nombres[j] if j < len(nombres) else f"Sec.{j+1}"
                pasos_fila.append({
                    "coef": float(C[i][j]),
                    "prod": float(X[j]),
                    "sector_origen": nombres[i],
                    "sector_destino": nombre_dest
                })
            
            demanda_interna.append(suma)
            detalles_calculo.append(pasos_fila)

        # 3. Formatear Salida
        resultados = []
        for i in range(n):
            nombre_sec = nombres[i] if i < len(nombres) else f"Sector {i+1}"
            
            # Formatear valor final
            val_final = float(demanda_interna[i])
            val_str = f"{val_final:.2f}" if usar_decimales else str(val_final)
            
            # Interpretación textual específica
            interpretacion = (
                f"El sector <strong>{nombre_sec}</strong> debe suministrar un total de "
                f"<strong>{val_str}</strong> unidades a las demás industrias (consumo interindustrial) "
                f"para sostener la producción total dada."
            )

            resultados.append({
                "sector": nombre_sec,
                "valor": val_str,
                "texto": interpretacion,
                "produccion_total": float(X[i])
            })

        return jsonify({
            "ok": True,
            "resultados": resultados
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 400