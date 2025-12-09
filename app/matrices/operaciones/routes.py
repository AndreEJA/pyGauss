from flask import Blueprint, render_template, request, jsonify

from .operaciones_matrices import (
    sumar_matrices,
    multiplicar_matrices,
    evaluar_matriz_str,
    multiplicar_matriz_por_vectores,
    sumar_matrices_con_escalares,
)
from ..gauss.algebra import FormateadorNumeros, a_fraccion_si_aplica
from app.matrices.gauss.algebra import sistema_a_matriz_aumentada

from .inversa_alg import (
    transpose as _transpose,
    inverse_2x2 as _inverse_2x2,
    gauss_jordan_inverse as _gj_inverse,
)

from .determinantes import calculate_determinant, cramer_solve

# BLUEPRINT

operaciones_bp = Blueprint(
    "operaciones",
    __name__,
    template_folder="../../../templates",
)


# RUTAS PRINCIPALES


@operaciones_bp.route("/", methods=["GET"])
def vista_menu_operaciones():
    return render_template("menu_operaciones.html", title="Menú de Operaciones")


@operaciones_bp.route("/suma", methods=["GET"])
def vista_operacion_suma():
    return render_template(
        "operaciones_matrices.html",
        title="Suma de Matrices",
        operacion="sumar",
    )


@operaciones_bp.route("/multiplicacion", methods=["GET"])
def vista_operacion_multiplicacion():
    return render_template(
        "operaciones_matrices.html",
        title="Multiplicación de Matrices",
        operacion="multiplicar",
    )


@operaciones_bp.route("/matriz-por-vector", methods=["GET"])
def vista_matriz_por_vector():
    return render_template(
        "operaciones_matriz_vector.html",
        title="Multiplicación de Matriz por Vector",
        operacion="matriz_por_vector",
    )


@operaciones_bp.route("/suma-escalar", methods=["GET"])
def vista_suma_escalar():
    return render_template(
        "operaciones_escalar.html",
        title="Suma con Múltiples Escalares",
        operacion="suma_escalar_multiple",
    )


@operaciones_bp.route("/operar", methods=["POST"])
def operar_matrices():
    try:
        datos = request.get_json(force=True)
        operacion = datos.get("operacion")
        print("DEBUG operacion:", operacion)

        # --- CASOS SIMPLES: suma, multiplicación, matriz por vector ---
        if operacion in ["sumar", "multiplicar", "matriz_por_vector"]:
            matriz1_str = datos.get("matriz1", [])
            matriz2_str = datos.get("matriz2", [])
            matriz1 = evaluar_matriz_str(matriz1_str)
            matriz2 = evaluar_matriz_str(matriz2_str)

            if operacion == "sumar":
                resultado = sumar_matrices(matriz1, matriz2)
            elif operacion == "multiplicar":
                resultado = multiplicar_matrices(matriz1, matriz2)
            elif operacion == "matriz_por_vector":
                resultado = multiplicar_matriz_por_vectores(matriz1, matriz2)

        # --- NUEVO: SUMA CON MÚLTIPLES ESCALARES ---
        elif operacion == "suma_escalar_multiple":
            matrices_str = datos.get("matrices_str", [])
            escalares_str = datos.get("escalares_str", [])

            if not matrices_str:
                return jsonify(ok=False, error="No recibí matrices."), 400

            if len(matrices_str) != len(escalares_str):
                return jsonify(
                    ok=False,
                    error="La cantidad de matrices y escalares no coincide.",
                ), 400

            matrices = [evaluar_matriz_str(m) for m in matrices_str]
            escalares = [
                evaluar_matriz_str([[s]])[0][0] for s in escalares_str
            ]

            filas = len(matrices[0])
            cols = len(matrices[0][0])
            for m in matrices[1:]:
                if len(m) != filas or len(m[0]) != cols:
                    return jsonify(
                        ok=False,
                        error="Todas las matrices deben tener el mismo tamaño.",
                    ), 400

            pasos_raw = []
            acumulador = [[0 for _ in range(cols)] for _ in range(filas)]

            for i, (mat, esc) in enumerate(
                zip(matrices, escalares), start=1
            ):
                matriz_escalada = [[esc * val for val in fila] for fila in mat]
                pasos_raw.append(
                    {
                        "titulo": f"Paso {i}: Multiplicamos la matriz {i} por el escalar {esc}.",
                        "matriz": matriz_escalada,
                    }
                )

                acumulador = [
                    [
                        acumulador[r][c] + matriz_escalada[r][c]
                        for c in range(cols)
                    ]
                    for r in range(filas)
                ]
                pasos_raw.append(
                    {
                        "titulo": "Sumamos la matriz resultante con el acumulado anterior.",
                        "matriz": [fila[:] for fila in acumulador],
                    }
                )

            resultado = acumulador

        else:
            return (
                jsonify(
                    {"ok": False, "error": f"Operación no soportada: {operacion}"}
                ),
                400,
            )

        # --- FORMATEO NUMÉRICO COMÚN ---
        formateador = FormateadorNumeros(
            modo=datos.get("modo_precision", "fraccion"),
            decimales=int(datos.get("decimales", 6)),
        )
        matriz_final_formateada = [
            [formateador.fmt(v) for v in fila] for fila in resultado
        ]

        if operacion == "suma_escalar_multiple":
            pasos = []
            for paso in pasos_raw:
                matriz_fmt = [
                    [formateador.fmt(v) for v in fila]
                    for fila in paso["matriz"]
                ]
                pasos.append(
                    {
                        "titulo": paso["titulo"],
                        "matriz": matriz_fmt,
                    }
                )
            return jsonify(
                {"ok": True, "resultado": matriz_final_formateada, "pasos": pasos}
            )

        return jsonify({"ok": True, "resultado": matriz_final_formateada})

    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "ok": False,
                    "error": f"Ocurrió un error inesperado: {str(e)}",
                }
            ),
            500,
        )


# RUTAS DE TRASPUESTA E INVERSA


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
        form = FormateadorNumeros(
            modo=datos.get("modo_precision", "fraccion"),
            decimales=int(datos.get("decimales", 6)),
        )
        F = [[form.fmt(x) for x in fila] for fila in T]
        return jsonify({"ok": True, "resultado": F})
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception:
        return (
            jsonify({"ok": False, "error": "Ocurrió un error inesperado."}),
            500,
        )


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
        if len(A) != n or any(len(fila) != n for fila in A):
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "La matriz debe ser n×n con n filas y n columnas.",
                    }
                ),
                400,
            )

        if n == 2:
            res = _inverse_2x2(A)
            if not res.get("ok"):
                return jsonify(
                    {
                        "ok": True,
                        "mensaje": res.get("motivo"),
                        "inversa": None,
                        "pasos": res.get("pasos", []),
                    }
                )
            return jsonify(
                {
                    "ok": True,
                    "inversa": res.get("inversa"),
                    "pasos": res.get("pasos", []),
                }
            )
        else:
            res = _gj_inverse(A)
            if not res.get("ok"):
                return jsonify(
                    {
                        "ok": True,
                        "mensaje": res.get("motivo"),
                        "inversa": None,
                        "pasos": res.get("pasos", []),
                    }
                )
            form = FormateadorNumeros(modo=modo, decimales=dec)
            inv_fmt = [[form.fmt(x) for x in fila] for fila in res["inversa"]]
            pasos = res.get("pasos", [])
            return jsonify({"ok": True, "inversa": inv_fmt, "pasos": pasos})
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception:
        return (
            jsonify({"ok": False, "error": "Ocurrió un error inesperado."}),
            500,
        )


# RUTAS DE DETERMINANTE


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
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": "La matriz debe ser cuadrada (n×n) y no vacía.",
                    }
                ),
                400,
            )

        res = calculate_determinant(A)
        if not res["ok"]:
            return (
                jsonify(
                    {
                        "ok": False,
                        "error": res.get(
                            "error", "Error desconocido en el cálculo."
                        ),
                    }
                ),
                400,
            )

        det_final = res["det"]
        formateador = FormateadorNumeros(modo, dec)
        det_fmt = formateador.fmt(det_final)

        res["det"] = det_fmt

        pasos = res.get("pasos", [])
        for paso in pasos:
            if modo == "decimal":
                for key in ["matriz_izq", "matriz_der"]:
                    if key in paso and isinstance(paso[key], list):

                        def safe_eval_and_fmt(val_str):
                            try:
                                return formateador.fmt(
                                    evaluar_matriz_str([[val_str]])[0][0]
                                )
                            except Exception:
                                return val_str

                        paso[key] = [
                            [safe_eval_and_fmt(v) for v in row]
                            for row in paso[key]
                        ]

        return jsonify({"ok": True, "det": res["det"], "pasos": pasos})

    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception:
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Ocurrió un error inesperado al calcular el determinante.",
                }
            ),
            500,
        )


# RUTAS DE CRAMER


@operaciones_bp.route("/cramer", methods=["GET"])
def vista_cramer():
    return render_template("cramer.html", title="Regla de Cramer")


@operaciones_bp.route("/cramer/sistema_matriz", methods=["POST"])
def cramer_sistema_matriz():
    datos = request.get_json(force=True)
    sistema = datos.get("sistema", "")
    variables = datos.get("variables", "")
    modo = datos.get("modo_precision", "fraccion")
    dec = int(datos.get("decimales", 6))

    if not sistema.strip():
        return jsonify({"ok": False, "error": "Escribe un sistema de ecuaciones."}), 400

    try:
        matriz_aug, vars_nombres = sistema_a_matriz_aumentada(
            sistema,
            variables_str=variables if variables.strip() else None,
        )

        A = [fila[:-1] for fila in matriz_aug]
        b = [fila[-1] for fila in matriz_aug]

        n = len(A)

        fmt = FormateadorNumeros(modo, dec)
        A_fmt = [[fmt.fmt(x) for x in fila] for fila in A]
        b_fmt = [fmt.fmt(x) for x in b]

        return jsonify(
            {
                "ok": True,
                "n": n,
                "A": A_fmt,
                "b": b_fmt,
                "variables": vars_nombres,
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": f"Error al interpretar el sistema: {e}",
                }
            ),
            400,
        )


@operaciones_bp.route("/cramer/resolver", methods=["POST"])
def resolver_cramer():
    """
    Recibe A y b (como strings desde el front) y aplica la Regla de Cramer.
    La URL completa quedará: /matrices/operaciones/cramer/resolver
    si registras este blueprint con url_prefix="/matrices/operaciones".
    """
    try:
        datos = request.get_json(force=True) or {}
    except Exception as e:
        return jsonify({"ok": False, "error": f"JSON inválido: {e}"}), 400

    matriz_A_str = datos.get("matriz_A_str") or []
    vector_b_str = datos.get("vector_b_str") or []
    modo = datos.get("modo_precision", "fraccion")
    dec = int(datos.get("decimales", 6))

    # Si por alguna razón b viene como matriz n×1, la aplanamos
    if vector_b_str and isinstance(vector_b_str[0], list):
        vector_b_str = [fila[0] if fila else "0" for fila in vector_b_str]

    n = len(matriz_A_str)
    if n == 0:
        return jsonify({"ok": False, "error": "La matriz A está vacía."}), 400

    if any(len(fila) != n for fila in matriz_A_str):
        return jsonify(
            {
                "ok": False,
                "error": "La matriz A debe ser cuadrada (n×n).",
            }
        ), 400

    if len(vector_b_str) != n:
        return jsonify(
            {
                "ok": False,
                "error": "El vector b debe tener n entradas.",
            }
        ), 400

    try:
        # cramer_solve ya devuelve un dict {ok: ..., ...}
        resultado = cramer_solve(matriz_A_str, vector_b_str, modo, dec)
        return jsonify(resultado)
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except Exception as e:
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "ok": False,
                    "error": f"Excepción en resolver_cramer: {e}",
                }
            ),
            500,
        )
