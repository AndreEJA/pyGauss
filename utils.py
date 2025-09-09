# utils.py
from fractions import Fraction

def pedir_matriz():
    """
    Pide m (ecuaciones) y n (incógnitas), y luego la matriz aumentada m x (n+1).
    Admite fracciones como '1/4', '-3/2', '5'.
    """
    while True:
        try:
            m = int(input("Ingrese el número de ecuaciones (m): "))
            n = int(input("Ingrese el número de incógnitas (n): "))
            if m <= 0 or n <= 0:
                print("m y n deben ser enteros positivos.\n")
                continue
            break
        except ValueError:
            print("Entrada inválida. Intente de nuevo.\n")

    print("\nIngrese los coeficientes de la matriz aumentada (use fracciones si desea, p.ej. 1/4):")
    matriz = []
    for i in range(m):
        fila = []
        for j in range(n + 1):
            while True:
                try:
                    s = input(f"  Valor en posición [{i+1},{j+1}]: ").strip()
                    fila.append(Fraction(s))
                    break
                except Exception:
                    print("  Valor inválido. Use enteros, decimales o fracciones como 3/4.")
        matriz.append(fila)

    return matriz

def preguntar_mostrar_pasos() -> bool:
    """
    Pregunta si se desean ver los pasos. Por defecto 's'.
    """
    s = input("\n¿Desea ver los pasos del procedimiento? [s/N]: ").strip().lower()
    return (s == "" or s.startswith("s"))
