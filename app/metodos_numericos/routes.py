from flask import Blueprint, render_template, request
from .biseccion import metodo_biseccion   

metodos_bp = Blueprint(
    "metodos_numericos",
    __name__,
    url_prefix="/metodos-numericos"
)

@metodos_bp.route("/biseccion", methods=["GET", "POST"])
def biseccion():
    resultados = None
    raiz = None
    n_iter = None
    error_msg = None

    expr_default = "x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10"
    datos = {
        "funcion": expr_default,
        "xi": "0.55",
        "xu": "1.1",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            expr = request.form.get("funcion", expr_default)
            xi = float(request.form.get("xi", "0.0"))
            xu = float(request.form.get("xu", "0.0"))
            es = float(request.form.get("es", "0.0001"))
            max_iter = int(request.form.get("max_iter", "50"))

            datos["funcion"] = expr
            datos["xi"] = str(xi)
            datos["xu"] = str(xu)
            datos["es"] = str(es)
            datos["max_iter"] = str(max_iter)

            resultados, raiz, n_iter = metodo_biseccion(expr, xi, xu, es, max_iter)

        except Exception as e:
            error_msg = f"Ocurrió un error: {e}"

    return render_template(
    "biseccion.html",
    datos=datos,
    resultados=resultados,
    raiz=raiz,
    n_iter=n_iter,
    error_msg=error_msg,
)
    
@metodos_bp.route("/regla-falsa")
def regla_falsa():
    # cuando tengas el HTML de regla falsa, usa "metodos/regla_falsa.html"
    return render_template("metodos/regla_falsa.html")

