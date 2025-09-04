from fractions import Fraction
from models.claseMatriz import Matriz

class SolucionadorGauss:
    """Resuelve sistemas de ecuaciones (cuadrados o rectangulares) y detecta el tipo de solución."""

    def __init__(self, matriz: Matriz):
        self.matriz = matriz
        self.filas = matriz.filas
        self.columnas = matriz.columnas
        self.incognitas = self.columnas - 1

    def triangularSuperior(self):
        """Convierte la matriz a su forma escalonada por filas."""
        k = 0  #fila pivote
        pivoteCol = 0  #columna pivote
        while k < self.filas and pivoteCol < self.incognitas:
            iMax = k
            for i in range(k + 1, self.filas):
                if abs(self.matriz.datos[i][pivoteCol]) > abs(self.matriz.datos[iMax][pivoteCol]):
                    iMax = i
            
            if self.matriz.datos[iMax][pivoteCol] == 0:
                pivoteCol += 1
                continue
            
            self.matriz.intercambiarFilas(k, iMax)
            
            valorPivote = self.matriz.datos[k][pivoteCol]
            for i in range(k + 1, self.filas):
                factor = -self.matriz.datos[i][pivoteCol] / valorPivote
                self.matriz.combinarFilas(filaDestino=i, filaOrigen=k, factor=factor)
            
            k += 1
            pivoteCol += 1
            
        print("\nMatriz en forma escalonada:")
        print(self.matriz)

    def sustitucionRegresiva(self):
        """Resuelve el sistema. Se asume que ya se verificó que tiene solución única."""
        x = [Fraction(0)] * self.incognitas
        for i in reversed(range(self.filas)):
            pivote_col = -1
            for j in range(self.incognitas):
                if self.matriz.datos[i][j] != 0:
                    pivote_col = j
                    break
            
            if pivote_col != -1:
                suma = sum(self.matriz.datos[i][j] * x[j] for j in range(pivote_col + 1, self.incognitas))
                x[pivote_col] = (self.matriz.datos[i][-1] - suma) / self.matriz.datos[i][pivote_col]
        return x

    def resolver(self):
        """Orquesta el proceso completo: escalona, analiza y resuelve."""
        self.triangularSuperior()

        for i in range(self.filas):
            esFilaNula = all(self.matriz.datos[i][j] == 0 for j in range(self.incognitas))
            if esFilaNula and self.matriz.datos[i][-1] != 0:
                raise ValueError(f"El sistema es inconsistente (no tiene solución). La fila {i+1} muestra una contradicción del tipo 0 = {self.matriz.datos[i][-1]}.")
        
        numeroPivotes = 0
        for i in range(self.filas):
            if any(self.matriz.datos[i][j] != 0 for j in range(self.incognitas)):
                numeroPivotes += 1
        
        if numeroPivotes < self.incognitas:
            raise ValueError(f"El sistema tiene infinitas soluciones ({self.incognitas} incógnitas pero solo {numeroPivotes} ecuaciones independientes).")

        return self.sustitucionRegresiva()

