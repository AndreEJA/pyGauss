from flask import Blueprint, render_template
principal_bp = Blueprint("principal", __name__)
@principal_bp.route("/")
def inicio():
    return render_template("index.html", title="PyGauss")
@principal_bp.route("/matrices")
def menu_matrices():
    return render_template("menu_matrices.html", title="Matrices")
@principal_bp.route("/vectores")
def menu_vectores():
    return render_template("menu_vectores.html", title="Vectores")
@principal_bp.route("/ocio")
def menu_ocio():
    return render_template("menu_ocio.html", title="Ocio y Juegos")
