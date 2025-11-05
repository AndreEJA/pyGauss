from flask import Blueprint, render_template

metodos_bp = Blueprint('metodos_numericos', __name__, url_prefix='/metodos-numericos')

@metodos_bp.route('/metodos-cerrados')
def metodos_cerrados():
    return render_template('metodos_cerrados.html')

@metodos_bp.route('/biseccion')
def biseccion():
    return render_template('biseccion.html')  # aquí irá la página del método

@metodos_bp.route('/regla-falsa')
def regla_falsa():
    return render_template('regla_falsa.html')  # y aquí la de regla falsa
