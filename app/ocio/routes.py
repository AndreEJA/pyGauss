# app/ocio/routes.py
from flask import Blueprint, render_template

# Definición del Blueprint 'ocio'
ocio_bp = Blueprint("ocio", __name__, template_folder="../../templates")

@ocio_bp.route("/buscaminas/reglas")
def buscaminas_reglas():
    return render_template("buscaminas.html", title="Buscaminas Matricial")

@ocio_bp.route("/buscaminas/jugar")
def buscaminas_jugar():
    return render_template("buscaminas.html", title="Buscaminas Matricial")

@ocio_bp.route("/sudoku")
def sudoku():
    return render_template("sudoku.html", title="Sudoku (En Desarrollo)")