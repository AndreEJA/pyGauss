from models.claseMatriz import Matriz
from models.solucionadorGauss import SolucionadorGauss

def main():
    """Función principal que ejecuta el programa."""
    print("=== Resolución de Sistemas de Ecuaciones Lineales por Eliminación Gaussiana ===\n")

    # Tamaño de la matriz
    while True:
        try:
            n = int(input("Ingrese el número de ecuaciones: "))
            m = int(input("Ingrese el número de incógnitas: "))
            
            if n != m:
                print("\nError: Este programa solo resuelve sistemas cuadrados (mismo número de ecuaciones e incógnitas).\n")
                continue 
            if n <= 0:
                print("\nError: El número de ecuaciones debe ser positivo.\n")
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
        print("\nSolución del sistema:")
        for i, valor in enumerate(soluciones, start=1):
            print(f"  x{i} = {valor}")
    except Exception as e:
        print(f"\nNo se pudo resolver el sistema: {e}")

if __name__ == "__main__":
    main()
