from flask import Blueprint, render_template, request, jsonify, send_file
from .algebra import (
    ResolverGaussJordan,
    ResolverGauss,            
    EvaluadorSeguro,
    MatrizAumentada,
    FormateadorNumeros,
    sistema_a_matriz_aumentada,   
)
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from .pygauss_ext import gauss_solve, gauss_jordan_solve
from .hf_client import hf_generate, load_hf_config


def pivot_to_1based_int(p):
    if isinstance(p, int):
        return p + 1
    s = str(p).strip().lower()
    if s.startswith("x"):
        s = s[1:]
    return int(s) + 1

def _lineas_a_solucion(lineas):
    """
    Convierte un arreglo de líneas tipo 'x1 = 60 + x6' y 'Variable libre: x6'
    a un diccionario { 'x1': '60 + x6', ..., 'x6': 'Variable libre' }.
    """
    sol = {}
    if not isinstance(lineas, list):
        return sol
    for s in lineas:
        if not isinstance(s, str): 
            continue
        s = s.strip()
        if not s:
            continue
        if s.lower().startswith('variable libre'):
            partes = s.split(':', 1)
            if len(partes) == 2:
                var = partes[1].strip()
                if var:
                    sol[var] = 'Variable libre'
        else:
            if '=' in s:
                left, right = s.split('=', 1)
                sol[left.strip()] = right.strip()
    return sol


gauss_bp = Blueprint("gauss", __name__, template_folder="../../../templates")


@gauss_bp.route("/", methods=["GET"])
def vista_gauss():
    return render_template("gauss.html", title="Método de Gauss-Jordan")


@gauss_bp.route("/simple", methods=["GET"])
def vista_gauss_simple():
    return render_template("gauss_simple.html", title="Método de Gauss")


# ================================
# NUEVO: sistema de ecuaciones → matriz
# ================================
@gauss_bp.route("/sistema_matriz", methods=["POST"])
def sistema_matriz():
    """
    Recibe un sistema de ecuaciones en texto y devuelve la matriz aumentada
    lista para rellenar la tabla del frontend.

    JSON de entrada esperado:
      {
        "sistema": "2x+3y-z=5\nx-y+4z=7\n-x+2y+z=1",
        "variables": "x, y, z",   # opcional
        "modo_precision": "fraccion" | "decimal",   # opcional
        "decimales": 6                               # opcional
      }

    Respuesta:
      {
        "ok": true,
        "matriz": [[...], ...],         # valores formateados como strings
        "filas": n_filas,
        "columnas": n_cols_sin_b,
        "variables": ["x", "y", "z"]
      }
    """
    datos = request.get_json(force=True) or {}
    sistema_str = datos.get("sistema", "") or ""
    variables_str = datos.get("variables", "") or ""
    modo_precision = datos.get("modo_precision", "fraccion")
    decimales = int(datos.get("decimales", 6))

    if not sistema_str.strip():
        return jsonify({"ok": False, "error": "No se recibió ningún sistema de ecuaciones."}), 400

    try:
        # Usa la utilidad de algebra.py para convertir sistema → [A|b]
        matriz_aug, vars_nombres = sistema_a_matriz_aumentada(
            sistema_str,
            variables_str if variables_str.strip() else None
        )

        # Formatear según la preferencia (fracción / decimal)
        formateador = FormateadorNumeros(modo=modo_precision, decimales=decimales)
        matriz_fmt = [
            [formateador.fmt(v) for v in fila]
            for fila in matriz_aug
        ]

        filas = len(matriz_fmt)
        columnas = len(matriz_fmt[0]) - 1 if filas > 0 else 0

        return jsonify({
            "ok": True,
            "matriz": matriz_fmt,
            "filas": filas,
            "columnas": columnas,
            "variables": vars_nombres,
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"Error al interpretar el sistema: {e}"
        }), 400


@gauss_bp.route("/resolver", methods=["POST"])
def resolver_gauss_jordan():
    datos = request.get_json(force=True)
    tabla = datos.get("tabla", [])
    filas = len(tabla)
    if filas == 0:
        return jsonify({"ok": False, "error": "No se recibieron filas."}), 400
    columnas = len(tabla[0]) - 1
    if columnas < 0:
        return jsonify({"ok": False, "error": "Formato de tabla inválido."}), 400
    if any(len(f) != columnas + 1 for f in tabla):
        return jsonify({"ok": False, "error": "Las filas no tienen el mismo número de columnas."}), 400

    modo_precision = datos.get("modo_precision", "fraccion")
    decimales = int(datos.get("decimales", 6))

    evaluador = EvaluadorSeguro()
    try:
        matriz_num = []
        for fila in tabla:
            fila_vals = []
            for val in fila:
                expr = str(val).strip()
                if expr == "":
                    raise ValueError("Hay celdas vacías en la matriz.")
                fila_vals.append(evaluador.evaluar(expr))
            matriz_num.append(fila_vals)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Error al evaluar expresiones: {e}"}), 400

    matriz = MatrizAumentada(matriz_num)
    formateador = FormateadorNumeros(modo=modo_precision, decimales=decimales)
    solver = ResolverGaussJordan(formateador)
    resultado = solver.resolver(matriz)

    # Añadir líneas x1=..., libres, etc. con Gauss-Jordan (pygauss_ext)
    A = [fila[:-1] for fila in matriz_num]
    b = [fila[-1] for fila in matriz_num]
    gj = gauss_jordan_solve(A, b, keep_steps=False)
    pivotes_raw = gj.get("pivots", [])
    pivotes_num = [pivot_to_1based_int(p) for p in pivotes_raw]
    pivotes_vars = [f"x{i}" for i in pivotes_num]

    # Normaliza estructura
    if isinstance(resultado.get("final"), dict):
        resultado["final"]["lineas"] = gj.get("lines", [])
        resultado["final"]["solucion"] = _lineas_a_solucion(gj.get("lines", []))
        resultado["final"]["pivotes"] = pivotes_num
        resultado["final"]["pivotes_vars"] = pivotes_vars
        libres_idx = gj.get("free_vars", [])
        resultado["final"]["variables_libres"] = [f"x{i+1}" for i in libres_idx]
    else:
        resultado["final"] = {
            "lineas": gj.get("lines", []),
            "pivotes": pivotes_num,
            "pivotes_vars": pivotes_vars,
            "variables_libres": [f"x{i+1}" for i in gj.get("free_vars", [])],
            "solucion": _lineas_a_solucion(gj.get("lines", [])),
        }
    return jsonify({"ok": True, **resultado})


@gauss_bp.route("/resolver_simple", methods=["POST"])
def resolver_gauss_simple():
    datos = request.get_json(force=True)
    tabla = datos.get("tabla", [])
    filas = len(tabla)
    if filas == 0:
        return jsonify({"ok": False, "error": "No se recibieron filas."}), 400
    columnas = len(tabla[0]) - 1
    if columnas < 0:
        return jsonify({"ok": False, "error": "Formato de tabla inválido."}), 400
    if any(len(f) != columnas + 1 for f in tabla):
        return jsonify({"ok": False, "error": "Las filas no tienen el mismo número de columnas."}), 400

    modo_precision = datos.get("modo_precision", "fraccion")
    decimales = int(datos.get("decimales", 6))

    evaluador = EvaluadorSeguro()
    try:
        matriz_num = []
        for fila in tabla:
            fila_vals = []
            for val in fila:
                expr = str(val).strip()
                if expr == "":
                    raise ValueError("Hay celdas vacías en la matriz.")
                fila_vals.append(evaluador.evaluar(expr))
            matriz_num.append(fila_vals)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Error al evaluar expresiones: {e}"}), 400

    matriz = MatrizAumentada(matriz_num)
    formateador = FormateadorNumeros(modo=modo_precision, decimales=decimales)
    solver = ResolverGauss(formateador)
    resultado = solver.resolver(matriz)

    # Añadir líneas x1=..., libres, etc. con Gauss-Jordan (pygauss_ext)
    A = [fila[:-1] for fila in matriz_num]
    b = [fila[-1] for fila in matriz_num]
    gj = gauss_jordan_solve(A, b, keep_steps=False)
    pivotes_raw = gj.get("pivots", [])
    pivotes_num = [pivot_to_1based_int(p) for p in pivotes_raw]
    pivotes_vars = [f"x{i}" for i in pivotes_num]

    # Normaliza estructura
    if isinstance(resultado.get("final"), dict):
        resultado["final"]["lineas"] = gj.get("lines", [])
        resultado["final"]["solucion"] = _lineas_a_solucion(gj.get("lines", []))
        resultado["final"]["pivotes"] = pivotes_num
        resultado["final"]["pivotes_vars"] = pivotes_vars
        libres_idx = gj.get("free_vars", [])
        resultado["final"]["variables_libres"] = [f"x{i+1}" for i in libres_idx]
    else:
        resultado["final"] = {
            "lineas": gj.get("lines", []),
            "pivotes": pivotes_num,
            "pivotes_vars": pivotes_vars,
            "variables_libres": [f"x{i+1}" for i in gj.get("free_vars", [])],
            "solucion": _lineas_a_solucion(gj.get("lines", [])),
        }
    return jsonify({"ok": True, **resultado})


@gauss_bp.route("/pdf", methods=["POST"])
def pdf():
    datos = request.get_json(force=True)
    pasos = datos.get("pasos", [])
    final = datos.get("final", {})
    pivotes = final.get("pivotes", [])
    libres = final.get("variables_libres", [])
    titulo = datos.get("titulo", "Método de Gauss-Jordan")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title=titulo)
    estilos = getSampleStyleSheet()
    elems = []

    elems.append(Paragraph(f"<b>{titulo}</b>", estilos["Title"]))
    elems.append(Spacer(1, 12))

    if final:
        elems.append(Paragraph("<b>Resultado:</b>", estilos["Heading2"]))
        if pivotes:
            elems.append(Paragraph(f"Columnas pivote: {', '.join(f'x{i}' for i in range(1, len(pivotes)+1))}", estilos["BodyText"]))
        if libres:
            elems.append(Paragraph(f"Variables libres: {', '.join(libres)}", estilos["BodyText"]))
        desc = final.get("descripcion", "")
        elems.append(Paragraph(desc, estilos["BodyText"]))
        sol = final.get("solucion")
        if sol:
            filas_sol = [["Variable", "Valor"]] + [[k, v] for k, v in sol.items()]
            tsol = Table(filas_sol, hAlign='LEFT')
            tsol.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0), colors.HexColor("#111827")),
                ('TEXTCOLOR',(0,0),(-1,0), colors.white),
                ('GRID',(0,0),(-1,-1), 0.5, colors.grey),
                ('ROWBACKGROUNDS',(0,1),(-1,-1), [colors.whitesmoke, colors.lightgrey])
            ]))
            elems.append(Spacer(1, 6))
            elems.append(tsol)
        elems.append(Spacer(1, 12))

    elems.append(Paragraph("<b>Pasos:</b>", estilos["Heading2"]))

    for idx, p in enumerate(pasos, start=1):
        elems.append(Paragraph(f"Paso {idx}: {p.get('descripcion','')}", estilos["Heading4"]))
        matriz = p.get("matriz", [])
        col_piv = p.get("col_pivote")
        if matriz:
            filas = len(matriz)
            cols = len(matriz[0])
            data = [[""] + [f"x{c+1}" for c in range(cols-1)] + ["b"]]
            for r in range(filas):
                data.append([str(r+1)] + [str(matriz[r][c]) for c in range(cols)])
            t = Table(data, hAlign='LEFT')
            ts = [('BACKGROUND',(0,0),(-1,0), colors.HexColor("#F3F4F6")),
                  ('GRID',(0,0),(-1,-1), 0.5, colors.grey),
                  ('ALIGN',(0,0),(-1,-1),'CENTER'),
                  ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                  ('FONTNAME',(0,0),(-1,0), 'Helvetica-Bold')]
            if col_piv:
                pivot_col_pdf = 1 + int(col_piv)
                ts.append(('BACKGROUND', (pivot_col_pdf,0), (pivot_col_pdf, filas), colors.HexColor('#FEF3C7')))
                ts.append(('FONTNAME', (pivot_col_pdf,0), (pivot_col_pdf, filas), 'Helvetica-Bold'))
            t.setStyle(TableStyle(ts))
            elems.append(t)
            elems.append(Spacer(1, 8))

    doc.build(elems)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name="gauss_pasos.pdf", mimetype="application/pdf")


@gauss_bp.route("/ia", methods=["POST"])
def preguntar_ia():
    datos = request.get_json(force=True)
    contexto = datos.get("contexto", "").strip()
    lineas = datos.get("lineas", [])
    from pathlib import Path
    base_dir = str(Path(__file__).resolve().parents[3])
    cfg = load_hf_config(base_dir)
    api_token = cfg.get("api_token", "")
    model = cfg.get("model_name", "microsoft/Phi-3.5-mini-instruct")

    if not api_token:
        return jsonify({"ok": False, "error": "Falta configurar HF_API_TOKEN o hf_config.json"}), 400

    resumen = "\n".join(lineas) if isinstance(lineas, list) else str(lineas)
    prompt = (
        "En el contexto de este ejercicio:\n" + contexto + "\n\n" +
        "Mensaje del cuadro de texto disponible para preguntar IA despues de responder el ejercicio:\n" +
        "Explica en 2–4 líneas el criterio para elegir valores de variables libres y cómo interpretar las dependencias.\n\n" +
        "Segun la respuesta que obtengo y las variables encontradas (incluye variables libres):\n" +
        resumen + "\n\n" +
        "Da una respuesta corta y sencilla con el criterio."
    )
    r = hf_generate(prompt=prompt, api_token=api_token, model=model)
    if r.get("ok"):
        return jsonify({"ok": True, "texto": r.get("text",""), "model": r.get("model", model)})
    return jsonify({"ok": False, "error": r.get("error","Error desconocido"), "raw": r.get("raw",""), "model": r.get("model", model)})
