from models.claseMatriz import Matriz

class SolucionadorGauss:
    """Clase para resolver sistemas de ecuaciones lineales usando el método de eliminación de Gauss"""
    def __init__(self, matriz: Matriz):
        self.matriz = matriz
        self.n = matriz.filas

    def triangularSuperior(self):
        """
        Convierte la matriz aumentada en una triangular superior usando pivoteo.
        Esta es la versión corregida que asegura que el pivote en la diagonal no sea cero.
        """
        for k in range(self.n):
            #1. pivoteo: asegurar que el elemento en la diagonal (pivote) no sea cero.
            if self.matriz.datos[k][k] == 0:
                #bscar una fila 'i' debajo de la actual 'k' para intercambiar
                encontrado = False
                for i in range(k + 1, self.n):
                    if self.matriz.datos[i][k] != 0:
                        self.matriz.intercambiarFilas(k, i)
                        encontrado = True
                        break
                #si no se encuentra fila para intercambiar, el sistema no tiene solución única
                if not encontrado:
                    raise ValueError("El sistema no tiene solución única (matriz singular).")
            
            #2. eliminación: hacer ceros los elementos debajo del pivote
            pivote_valor = self.matriz.datos[k][k]
            for i in range(k + 1, self.n):
                if self.matriz.datos[i][k] != 0: # Solo operar si no es ya cero
                    factor = -self.matriz.datos[i][k] / pivote_valor
                    self.matriz.combinarFilas(filaDestino=i, filaOrigen=k, factor=factor)

    def sustitucionRegresiva(self):
        """
        Resuelve la matriz triangular superior y devuelve la solución.
        Esta lógica ahora es correcta porque triangularSuperior() funciona como debe.
        """
        x = [0] * self.n
        #recorrer de abajo hacia arriba (desde la última ecuación a la primera)
        for i in reversed(range(self.n)):
            suma = sum(self.matriz.datos[i][j] * x[j] for j in range(i + 1, self.n))
            
            #verificar si el pivote en la diagonal es cero después de la eliminación
            if self.matriz.datos[i][i] == 0:
                raise ValueError("El sistema es inconsistente o tiene infinitas soluciones.")
                
            x[i] = (self.matriz.datos[i][-1] - suma) / self.matriz.datos[i][i]
        return x

    def resolver(self):
        """Ejecuta todo el proceso de Gauss y retorna la solución"""
        print("\n--- Iniciando Eliminación Gaussiana ---")
        self.triangularSuperior()
        print("\nMatriz en forma triangular superior:")
        print(self.matriz)
        print("--- Iniciando Sustitución Regresiva ---\n")
        return self.sustitucionRegresiva()
