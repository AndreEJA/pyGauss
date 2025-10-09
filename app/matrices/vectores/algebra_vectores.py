# -*- coding: utf-8 -*-
from app.matrices.gauss.algebra import (
    ResolverGaussJordan,
    MatrizAumentada,
    FormateadorNumeros,
    EvaluadorSeguro,
)
from math import sqrt, acos

class AnalizadorVectores:
    """
    Clase base para operaciones con vectores.
    Implementa verificación de independencia lineal
    y otras operaciones básicas (ampliables).
    """

    def __init__(self, modo='fraccion', decimales=6):
        self.formateador = FormateadorNumeros(modo, decimales)
        self.solver = ResolverGaussJordan(self.formateador)
        self.evaluador = EvaluadorSeguro()

    def verificar_independencia(self, vectores):
        """
        Determina si un conjunto de vectores es linealmente independiente.
        - Interpreta cada vector como COLUMNA de la matriz A (dim = d, n_vectores = n).
        - Usa Gauss-Jordan sobre [A | 0] solo para obtener pivotes.
        """
        if not vectores or any(len(v) != len(vectores[0]) for v in vectores):
            raise ValueError("Todos los vectores deben tener la misma dimensión.")

        # Evalúa entradas numéricamente
        V = [[self.evaluador.evaluar(x) for x in v] for v in vectores]  # n_vectores x dim

        n = len(V)        # número de vectores
        d = len(V[0])     # dimensión

        # Matriz A con vectores como columnas
        A = [[V[i][j] for i in range(n)] for j in range(d)]  # d x n

        # Creamos matriz aumentada [A | 0] solo para usar el solver
        A_aug = [fila + [0] for fila in A]
        matriz_aum = MatrizAumentada(A_aug)
        res = self.solver.resolver(matriz_aum)

        pivotes = res["final"]["pivotes"]  # columnas pivote
        independiente = (len(pivotes) == n)

        return {
            "independiente": independiente,
            "mensaje": (
                "Los vectores son linealmente independientes."
                if independiente else
                "Los vectores son linealmente dependientes."
            ),
            "pasos": res["pasos"],
            "pivotes": pivotes,
            "n_vectores": n
        }
