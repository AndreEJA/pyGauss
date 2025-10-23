from flask import Blueprint, render_template, request, jsonify
from .operaciones_matrices import sumar_matrices, multiplicar_matrices, evaluar_matriz_str, multiplicar_matriz_por_vectores
from ..gauss.algebra import FormateadorNumeros
from ..gauss.algebra import a_fraccion_si_aplica # Importado para manejo de tipos

operaciones_bp = Blueprint("operaciones", __name__, template_folder="../../../templates")

# --- RUTAS PRINCIPALES ---

@operaciones_bp.route("/", methods=["GET"])
def vista_menu_operaciones():
    return render_template("menu_operaciones.html", title="Menú de Operaciones")

@operaciones_bp.route("/suma", methods=["GET"])
def vista_operacion_suma():
    return render_template("operaciones_matrices.html", title="Suma de Matrices", operacion="sumar")

@operaciones_bp.route("/multiplicacion", methods=["GET"])
def vista_operacion_multiplicacion():
    return render_template("operaciones_matrices.html", title="Multiplicación de Matrices", operacion="multiplicar")
    
@operaciones_bp.route("/matriz-por-vector", methods=["GET"])
def vista_matriz_por_vector():
    return render_template("operaciones_matriz_vector.html", title="Multiplicación de Matriz por Vector", operacion="matriz_por_vector")

@operaciones_bp.route("/operar", methods=["POST"])
def operar_matrices():
    try:
        datos = request.get_json(force=True)
        matriz1_str = datos.get("matriz1", [])
        matriz2_str = datos.get("matriz2", [])
        operacion = datos.get("operacion")
        
        matriz1 = evaluar_matriz_str(matriz1_str)
        matriz2 = evaluar_matriz_str(matriz2_str)

        if operacion == "sumar":
            resultado = sumar_matrices(matriz1, matriz2)
            
        elif operacion == "multiplicar":
            resultado = multiplicar_matrices(matriz1, matriz2)
        
        elif operacion == "matriz_por_vector":
            resultado = multiplicar_matriz_por_vectores(matriz1, matriz2)

        else:
            return jsonify({"ok": False, "error": "Operación no soportada."}), 400

        formateador = FormateadorNumeros(modo=datos.get("modo_precision", "fraccion"), decimales=int(datos.get("decimales", 6)))
        matriz_final_formateada = [[formateador.fmt(v) for v in fila] for fila in resultado]

        return jsonify({"ok": True, "resultado": matriz_final_formateada})
    
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception:
        return jsonify({"ok": False, "error": "Ocurrió un error inesperado."}), 500


# --- RUTAS DE TRASPUESTA E INVERSA ---
from .inversa_alg import transpose as _transpose, inverse_2x2 as _inverse_2x2, gauss_jordan_inverse as _gj_inverse

@operaciones_bp.route("/traspuesta", methods=["GET"])
def vista_traspuesta():
    return render_template("traspuesta.html", title="Traspuesta")

@operaciones_bp.route("/traspuesta/resolver", methods=["POST"])
def resolver_traspuesta():
    datos = request.get_json(force=True)
    matriz_str = datos.get("matriz_str")
    try:
        A = evaluar_matriz_str(matriz_str)
        T = _transpose(A)
        form = FormateadorNumeros(modo=datos.get("modo_precision","fraccion"), decimales=int(datos.get("decimales",6)))
        F = [[form.fmt(x) for x in fila] for fila in T]
        return jsonify({"ok": True, "resultado": F})
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception:
        return jsonify({"ok": False, "error": "Ocurrió un error inesperado."}), 500

@operaciones_bp.route("/inversa", methods=["GET"])
def vista_inversa():
    return render_template("inversa.html", title="Inversa")

@operaciones_bp.route("/inversa/resolver", methods=["POST"])
def resolver_inversa():
    datos = request.get_json(force=True)
    n = int(datos.get("n", 0))
    matriz_str = datos.get("matriz_str")
    modo = datos.get("modo_precision", "fraccion")
    dec = int(datos.get("decimales", 6))
    if n < 2:
        return jsonify({"ok": False, "error": "n debe ser un entero ≥ 2."}), 400
    try:
        A = evaluar_matriz_str(matriz_str)
        # validación cuadrada n×n
        if len(A) != n or any(len(fila)!=n for fila in A):
            return jsonify({"ok": False, "error": "La matriz debe ser n×n con n filas y n columnas."}), 400
        if n == 2:
            res = _inverse_2x2(A)
            if not res.get("ok"):
                return jsonify({"ok": True, "mensaje": res.get("motivo"), "inversa": None, "pasos": res.get("pasos", [])})
            return jsonify({"ok": True, "inversa": res.get("inversa"), "pasos": res.get("pasos", [])})
        else:
            res = _gj_inverse(A)
            if not res.get("ok"):
                return jsonify({"ok": True, "mensaje": res.get("motivo"), "inversa": None, "pasos": res.get("pasos", [])})
            # formatear
            form = FormateadorNumeros(modo=modo, decimales=dec)
            inv_fmt = [[form.fmt(x) for x in fila] for fila in res["inversa"]]
            pasos = res.get("pasos", [])
            return jsonify({"ok": True, "inversa": inv_fmt, "pasos": pasos})
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"ok": False, "error": "Ocurrió un error inesperado."}), 500

# --- RUTAS DE DETERMINANTE Y REGLA DE CRAMER (Corregidas para JSON) ---
from .determinantes import calculate_determinant, cramer_solve

@operaciones_bp.route("/determinante", methods=["GET"])
def vista_determinante():
    return render_template("determinante.html", title="Determinante")

@operaciones_bp.route("/determinante/resolver", methods=["POST"])
def resolver_determinante():
    datos = request.get_json(force=True)
    matriz_str = datos.get("matriz_str")
    modo = datos.get("modo_precision", "fraccion")
    dec = int(datos.get("decimales", 6))
    try:
        A = evaluar_matriz_str(matriz_str)
        n = len(A)
        if n == 0 or any(len(fila) != n for fila in A):
            return jsonify({"ok": False, "error": "La matriz debe ser cuadrada (n×n) y no vacía."}), 400

        res = calculate_determinant(A)
        if not res["ok"]:
            return jsonify({"ok": False, "error": res.get("error", "Error desconocido en el cálculo.")}), 400
        
        # Obtener y formatear el determinante final (Fraction)
        det_final = res["det"]
        formateador = FormateadorNumeros(modo, dec)
        det_fmt = formateador.fmt(det_final)
        
        # 💡 FIX JSON: Reemplazar el objeto Fraction con su representación en string.
        res["det"] = det_fmt 
        
        # Formatear pasos restantes (decimales)
        pasos = res.get("pasos", [])
        for paso in pasos:
            if modo == 'decimal':
                for key in ['matriz_izq', 'matriz_der']:
                    if key in paso and isinstance(paso[key], list):
                        def safe_eval_and_fmt(val_str):
                            # Necesita evaluar el string de fracción del paso y luego formatearlo a decimal
                            try: return formateador.fmt(evaluar_matriz_str([[val_str]])[0][0])
                            except: return val_str
                                
                        paso[key] = [[safe_eval_and_fmt(v) for v in row] for row in paso[key]]

        return jsonify({"ok": True, "det": res["det"], "pasos": pasos})
        
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Ocurrió un error inesperado al calcular el determinante."}), 500

@operaciones_bp.route("/cramer", methods=["GET"])
def vista_cramer():
    return render_template("cramer.html", title="Regla de Cramer")

@operaciones_bp.route("/cramer/resolver", methods=["POST"])
def resolver_cramer():
    datos = request.get_json(force=True)
    matriz_A_str = datos.get("matriz_A_str")
    vector_b_str = datos.get("vector_b_str")
    modo = datos.get("modo_precision", "fraccion")
    dec = int(datos.get("decimales", 6))
    try:
        A_raw = evaluar_matriz_str(matriz_A_str)
        n = len(A_raw)
        
        b_raw_list = [x[0] for x in vector_b_str]
        b_evaluated = evaluar_matriz_str([b_raw_list])[0] 
        
        if len(b_evaluated) != n:
            return jsonify({"ok": False, "error": f"El vector b debe tener {n} componentes, pero se encontraron {len(b_evaluated)}."}), 400

        res = cramer_solve(A_raw, b_evaluated, modo, dec)
        
        formateador = FormateadorNumeros(modo, dec)
        
        det_A_formatted = formateador.fmt(a_fraccion_si_aplica(res["det_A"]))
        res["det_A"] = det_A_formatted

        return jsonify({"ok": True, **res})
        
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"ok": False, "error": "Ocurrió un error inesperado al aplicar la Regla de Cramer."}), 500