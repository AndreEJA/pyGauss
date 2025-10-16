from flask import Blueprint, render_template, request, jsonify
from .operaciones_matrices import sumar_matrices, multiplicar_matrices, evaluar_matriz_str, multiplicar_matriz_por_vectores
from ..gauss.algebra import FormateadorNumeros

operaciones_bp = Blueprint("operaciones", __name__, template_folder="../../../templates")

# Nueva ruta para el menú de operaciones
@operaciones_bp.route("/", methods=["GET"])
def vista_menu_operaciones():
    return render_template("menu_operaciones.html", title="Menú de Operaciones")

# Ruta para la suma de matrices
@operaciones_bp.route("/suma", methods=["GET"])
def vista_operacion_suma():
    return render_template("operaciones_matrices.html", title="Suma de Matrices", operacion="sumar")

# Ruta para la multiplicación de matrices
@operaciones_bp.route("/multiplicacion", methods=["GET"])
def vista_operacion_multiplicacion():
    return render_template("operaciones_matrices.html", title="Multiplicación de Matrices", operacion="multiplicar")
    
# Nueva ruta para la multiplicación de matriz por vector(es)
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



# --- NUEVAS RUTAS: Traspuesta e Inversa ---
from .inversa_alg import transpose as _transpose, inverse_2x2 as _inverse_2x2, gauss_jordan_inverse as _gj_inverse
from .operaciones_matrices import evaluar_matriz_str
from ..gauss.algebra import FormateadorNumeros

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
