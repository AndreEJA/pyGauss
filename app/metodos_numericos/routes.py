# app/metodos_numericos/routes.py
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

    # Función de ejemplo SOLO como respaldo interno
    expr_default = "x**4 - 5*x**3 + 0.5*x**2 - 11*x + 10"

    # Valores iniciales que se muestran en el formulario
    datos = {
        "funcion": "",
        "xi": "",
        "xu": "",
        "es": "0.0001",
        "max_iter": "50",
    }

    if request.method == "POST":
        try:
            # Lo que el usuario ve (bonito)
            func_pretty = request.form.get("funcion_pretty", "").strip()
            # Lo que enviamos oculto con sintaxis Python
            expr = request.form.get("funcion", "").strip()

            if not expr:
                expr = expr_default

            xi = float(request.form.get("xi", "0.0"))
            xu = float(request.form.get("xu", "0.0"))
            es = float(request.form.get("es", "0.0001"))
            max_iter = int(request.form.get("max_iter", "50"))

            # Lo que se vuelve a pintar en el input visible
            datos["funcion"] = func_pretty if func_pretty else expr
            datos["xi"] = str(xi)
            datos["xu"] = str(xu)
            datos["es"] = str(es)
            datos["max_iter"] = str(max_iter)

            resultados, raiz, n_iter = metodo_biseccion(
                expr, xi, xu, es, max_iter
            )

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


@metodos_bp.route("/regla-falsa", methods=["GET", "POST"])
def regla_falsa():
    return render_template("regla_falsa.html")
