# main.py
from sistema_ecuaciones import SistemaEcuaciones
from utils import pedir_matriz, preguntar_mostrar_pasos

def main():
    print("=== Resolver sistemas de ecuaciones por Eliminación de Filas (Gauss-Jordan) ===\n")
    matriz = pedir_matriz()
    mostrar_pasos = preguntar_mostrar_pasos()

    sistema = SistemaEcuaciones(matriz_aumentada=matriz, registrar_pasos=mostrar_pasos)
    sistema.resolver(mostrar_pasos=mostrar_pasos)

if __name__ == "__main__":
    main()
