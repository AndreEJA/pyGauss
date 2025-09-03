from fractions import Fraction

class Matriz:
    """Clase Matriz, maneja funciones elementales de matrices usando Fracciones para mayor precisión."""

    def __init__(self, filas, columnas):
        """Inicializa la matriz con objetos Fraction(0)"""
        self.filas = filas
        self.columnas = columnas
        self.datos = [[Fraction(0) for _ in range(columnas)] for _ in range(filas)]

    def tomarDatos(self):
        """Toma los datos de la matriz, permitiendo entradas como enteros, decimales o fracciones ('a/b')."""
        print("\nIngrese los coeficientes (puede usar enteros, decimales o fracciones como '3/4'):")
        for i in range(self.filas):
            for j in range(self.columnas):
                while True:
                    try:
                        valor_str = input(f"  Posición [{i+1}, {j+1}]: ")
                        # .limit_denominator() convierte floats como 0.5 a una fracción limpia como 1/2
                        self.datos[i][j] = Fraction(valor_str).limit_denominator()
                        break
                    except (ValueError, ZeroDivisionError):
                        print("  Error: Formato no válido. Use enteros, decimales o fracciones como 'a/b'.")

    def __str__(self):
        """Devuelve una representación en string de la matriz, alineada y mostrando fracciones."""
        str_datos = [[str(val) for val in row] for row in self.datos]
        
        max_len = [0] * self.columnas
        for j in range(self.columnas):
            for i in range(self.filas):
                len_val = len(str_datos[i][j])
                if len_val > max_len[j]:
                    max_len[j] = len_val
        
        res = ""
        for i in range(self.filas):
            res += "| "
            for j in range(self.columnas):
                val_str = str_datos[i][j]
                res += val_str.rjust(max_len[j]) + " "
                if j == self.columnas - 2:
                    res += "| "
            res += "|\n"
        return res

    # ###############################################
    # OPERACIONES DE FILAS
    # ###############################################

    def intercambiarFilas(self, i, j):
        """Intercambia dos filas cualesquiera, i y j."""
        if i != j:
            self.datos[i], self.datos[j] = self.datos[j], self.datos[i]
            
    def escalarFila(self, fila, escalar):
        """
        Operación: Multiplica una fila por un escalar no nulo.
        - fila: índice de la fila a escalar.
        - escalar: valor por el cual se multiplicará la fila.
        """
        escalar = Fraction(escalar)
        if escalar == 0:
            raise ValueError("El escalar no puede ser 0 para esta operación.")
        
        self.datos[fila] = [valor * escalar for valor in self.datos[fila]]

    def combinarFilas(self, filaDestino, filaOrigen, factor):
        """
        Realiza la operación elemental: filaDestino = filaDestino + (factor * filaOrigen)
        - filaDestino: índice de la fila que se modificará.
        - filaOrigen: índice de la fila que se usará como base.
        - factor: escalar que multiplica a la filaOrigen.
        """
        factor = Fraction(factor)
        if not (0 <= filaDestino < self.filas and 0 <= filaOrigen < self.filas):
            raise ValueError("Índice de fila fuera de rango")

        self.datos[filaDestino] = [
            d + factor * o for d, o in zip(self.datos[filaDestino], self.datos[filaOrigen])
        ]
