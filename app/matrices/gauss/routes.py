from flask import Blueprint, render_template, request, jsonify, send_file
from .algebra import ResolverGaussJordan, EvaluadorSeguro, MatrizAumentada, FormateadorNumeros
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

gauss_bp = Blueprint("gauss", __name__, template_folder="../../../templates")

@gauss_bp.route("/", methods=["GET"])
def vista_gauss():
    return render_template("gauss.html", title="Método de Gauss-Jordan")

@gauss_bp.route("/resolver", methods=["POST"])
def resolver():
    datos = request.get_json(force=True)
    filas = int(datos.get("filas"))
    columnas = int(datos.get("columnas"))
    tabla = datos.get("tabla", [])
    modo_precision = datos.get("modo_precision", "fraccion")
    decimales = int(datos.get("decimales", 6))

    if not filas or not columnas or filas <= 0 or columnas <= 0:
        return jsonify({"ok": False, "error": "Parámetros inválidos."}), 400

    # Evaluamos expresiones de cada celda con un parser seguro (AST)
    evaluador = EvaluadorSeguro()
    try:
        matriz_num = []
        for i in range(filas):
            fila_vals = []
            for j in range(columnas):
                expr = str(tabla[i][j]).strip()
                if expr == "":
                    raise ValueError("Hay celdas vacías en la matriz.")
                val = evaluador.evaluar(expr)
                fila_vals.append(val)
            matriz_num.append(fila_vals)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Error al evaluar expresiones: {e}"}), 400

    # Normalizamos como matriz aumentada y resolvemos con Gauss-Jordan paso a paso
    matriz = MatrizAumentada(matriz_num)
    formateador = FormateadorNumeros(modo=modo_precision, decimales=decimales)
    solver = ResolverGaussJordan(formateador=formateador)
    resultado = solver.resolver(matriz)
    return jsonify({"ok": True, **resultado})

@gauss_bp.route("/pdf", methods=["POST"])
def pdf():
    datos = request.get_json(force=True)
    pasos = datos.get("pasos", [])
    final = datos.get("final", {})
    titulo = datos.get("titulo", "Método de Gauss-Jordan")

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title=titulo)
    estilos = getSampleStyleSheet()
    elems = []

    elems.append(Paragraph(f"<b>{titulo}</b>", estilos["Title"]))
    elems.append(Spacer(1, 12))

    if final:
        elems.append(Paragraph("<b>Resultado:</b>", estilos["Heading2"]))
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
        if matriz:
            filas = len(matriz)
            cols = len(matriz[0])
            data = [[""] + [f"x{c+1}" for c in range(cols-1)] + ["b"]]
            for r in range(filas):
                data.append([str(r+1)] + [str(matriz[r][c]) for c in range(cols)])
            t = Table(data, hAlign='LEFT')
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0), colors.HexColor("#F3F4F6")),
                ('GRID',(0,0),(-1,-1), 0.5, colors.grey),
                ('ALIGN',(0,0),(-1,-1),'CENTER'),
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                ('FONTNAME',(0,0),(-1,0), 'Helvetica-Bold')
            ]))
            elems.append(t)
            elems.append(Spacer(1, 8))

    doc.build(elems)
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name="gauss_pasos.pdf", mimetype="application/pdf")
