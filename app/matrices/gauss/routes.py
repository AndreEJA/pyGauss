from flask import Blueprint, render_template, request, jsonify, send_file
from .algebra import (
    ResolverGaussJordan,
    ResolverGauss,            # 🔹 nuevo import
    EvaluadorSeguro,
    MatrizAumentada,
    FormateadorNumeros
)
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

gauss_bp = Blueprint("gauss", __name__, template_folder="../../../templates")
 
@gauss_bp.route("/", methods=["GET"])
def vista_gauss():
    return render_template("gauss.html", title="Método de Gauss-Jordan")

 
@gauss_bp.route("/simple", methods=["GET"])
def vista_gauss_simple():
    return render_template("gauss_simple.html", title="Método de Gauss")


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
    solver = ResolverGauss(formateador)  # 🔹 aquí usamos el método nuevo
    resultado = solver.resolver(matriz)
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
            elems.append(Paragraph(f"Columnas pivote: {', '.join('x'+str(p) for p in pivotes)}", estilos["BodyText"]))
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
