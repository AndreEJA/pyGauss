from flask import Blueprint, render_template

principal_bp = Blueprint("principal", __name__)

# NUEVA PÁGINA DE INICIO GLOBAL (selector de unidades)
@principal_bp.route("/")
def inicio():
    return render_template("home.html", title="PyGauss")

# UNIDAD 1: Álgebra Lineal (usa tu index actual)
@principal_bp.route("/algebra-lineal")
def unidad_algebra_lineal():
    return render_template("index.html", title="Álgebra Lineal")

@principal_bp.route("/matrices")
def menu_matrices():
    return render_template("menu_matrices.html", title="Matrices")

@principal_bp.route("/vectores")
def menu_vectores():
    return render_template("menu_vectores.html", title="Vectores")

@principal_bp.route("/ocio")
def menu_ocio():
    return render_template("menu_ocio.html", title="Ocio y Juegos")

# UNIDAD 2: Métodos Numéricos
@principal_bp.route("/metodos-numericos")
def unidad_metodos_numericos():
    return render_template(
        "unidad_metodos_numericos.html",
        title="Métodos Numéricos"
    )

# UNIDAD 3: Cálculo
@principal_bp.route("/calculo")
def unidad_calculo():
    return render_template(
        "unidad_calculo.html",
        title="Cálculo"
    )
