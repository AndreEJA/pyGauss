from models.claseMatriz import Matriz
from models.solucionadorGauss import SolucionadorGauss

def main():
    """Función principal que ejecuta el programa."""
    print("=== Resolución de Sistemas de Ecuaciones Lineales por Eliminación Gaussiana ===\n")

    #tamaño de la matriz
    while True:
        try:
            n = int(input("Ingrese el número de ecuaciones (filas): "))
            m = int(input("Ingrese el número de incógnitas (columnas): "))
            if n <= 0 or m <= 0:
                print("\nError: El número de ecuaciones e incógnitas debe ser positivo.\n")
                continue
            break
        except ValueError:
            print("\nError: Por favor, ingrese un número entero válido.\n")

    matriz = Matriz(filas=n, columnas=m + 1)
    matriz.tomarDatos()

    #impresion
    print("\nMatriz aumentada ingresada:")
    print(matriz)

    solucionador = SolucionadorGauss(matriz)
    try:
        soluciones = solucionador.resolver()
        print("\nSolución Única Encontrada:")
        for i, valor in enumerate(soluciones, start=1):
            print(f"  x{i} = {valor}")
    except ValueError as e:
        print(f"\n{e}")
    except Exception as e:
        print(f"\nError inesperado: {e}")
if __name__ == "__main__":
    main()
