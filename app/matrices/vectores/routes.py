# -*- coding: utf-8 -*-
from flask import Blueprint, render_template, request, jsonify
from .algebra_vectores import AnalizadorVectores

vectores_bp = Blueprint("vectores", __name__, template_folder="../../../templates")

@vectores_bp.route("/", methods=["GET"])
def vista_vectores():
    return render_template("vectores.html", title="Independencia Lineal")

@vectores_bp.route("/independencia", methods=["POST"])
def verificar_independencia():
    datos = request.get_json(force=True)
    vectores = datos.get("tabla", [])
    if not vectores:
        return jsonify({"ok": False, "error": "No se recibieron vectores."}), 400
    try:
        analizador = AnalizadorVectores()
        resultado = analizador.verificar_independencia(vectores)
        # Incluimos pasos y pivotes en la respuesta
        return jsonify({
            "ok": True,
            "independiente": resultado["independiente"],
            "mensaje": resultado["mensaje"],
            "pasos": resultado["pasos"],
            "pivotes": resultado["pivotes"]
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400
