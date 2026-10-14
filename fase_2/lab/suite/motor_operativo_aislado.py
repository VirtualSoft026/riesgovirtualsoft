"""
Ejecuta test_motor_operativo.py (raíz del repo) en un entorno hermético, como exige
fase_2/Docs/03-plan-migracion/hoja-de-ruta.md §0 paso 3: "con un entorno de prueba que no use
credenciales reales ni servicios de producción".

Controles de seguridad que aplica antes de importar motor_operativo:
  1. Variables MSTR_* forzadas a vacío: load_dotenv() no sobrescribe variables ya definidas, así que
     las credenciales reales del .env NUNCA llegan al proceso de prueba.
  2. Red bloqueada a nivel de socket (connect, create_connection, getaddrinfo): ninguna llamada a
     Firebase o MicroStrategy puede salir.
  3. Sin bytecode: no se crea __pycache__ dentro del repositorio.

Además de la suite existente, agrega un contrato de seguridad del motor (H-P4 y manejo de
credenciales). No modifica ningún archivo del repositorio.

Uso: python motor_operativo_aislado.py <raiz_del_repo>
Salida: líneas de unittest y una línea final `MOTOR_RESULT {json}`. Código 0 = todo en verde,
1 = fallas, 3 = dependencias faltantes (omitida).
"""
import importlib.util
import json
import os
import socket
import sys
import unittest

sys.dont_write_bytecode = True

MSTR_VARS = (
    "MSTR_BASE_URL", "MSTR_PROJECT_NAME", "MSTR_PROJECT_ID",
    "MSTR_REPORT_ID", "MSTR_USERNAME", "MSTR_PASSWORD",
)
for _var in MSTR_VARS:
    os.environ[_var] = ""


class RedBloqueada(RuntimeError):
    """Se lanza cuando el código bajo prueba intenta abrir una conexión de red."""


INTENTOS_RED = []


def _bloquear(*args, **kwargs):
    destino = args[1] if len(args) > 1 else (args[0] if args else "?")
    INTENTOS_RED.append(repr(destino)[:120])
    raise RedBloqueada(f"[BLOQUEO-RED] intento de conexión a {destino!r}")


socket.socket.connect = _bloquear
socket.socket.connect_ex = _bloquear
socket.create_connection = _bloquear
socket.getaddrinfo = _bloquear


def emitir(resultado, codigo):
    print("MOTOR_RESULT " + json.dumps(resultado, ensure_ascii=False))
    sys.stdout.flush()
    sys.exit(codigo)


def main():
    if len(sys.argv) < 2:
        print("Uso: python motor_operativo_aislado.py <raiz_del_repo>")
        sys.exit(2)

    repo = os.path.abspath(sys.argv[1])
    if not os.path.isfile(os.path.join(repo, "test_motor_operativo.py")):
        emitir({"estado": "OMITIDA", "motivo": f"No existe test_motor_operativo.py en {repo}"}, 3)

    faltantes = [m for m in ("requests", "pandas", "dotenv") if importlib.util.find_spec(m) is None]
    if faltantes:
        emitir({
            "estado": "OMITIDA",
            "motivo": "Faltan dependencias de requirements.txt: " + ", ".join(faltantes),
        }, 3)

    sys.path.insert(0, repo)

    class ContratoSeguridadMotor(unittest.TestCase):
        """Contrato de seguridad de motor_operativo.py (no reemplaza a test_motor_operativo.py)."""

        def test_importar_no_usa_red(self):
            """H-P4: importar motor_operativo no debe hacer I/O de red (corregido 2026-10-14)."""
            antes = len(INTENTOS_RED)
            importlib.import_module("motor_operativo")
            self.assertEqual(len(INTENTOS_RED), antes,
                             f"El import intentó conectarse: {INTENTOS_RED[antes:]}")

        def test_credenciales_reales_no_se_cargan(self):
            """Las variables MSTR_* del .env real no deben sobrescribir el entorno aislado."""
            motor = importlib.import_module("motor_operativo")
            for var in MSTR_VARS:
                self.assertEqual(os.environ.get(var), "", f"{var} quedó con un valor del .env real")
            self.assertEqual(motor.MSTR_PASSWORD, "")
            self.assertEqual(motor.MSTR_USERNAME, "")

        def test_autenticacion_sin_credenciales_no_sale_a_red(self):
            """Sin URL/credenciales, authenticate() debe devolver False sin intentar conectarse."""
            motor = importlib.import_module("motor_operativo")
            antes = len(INTENTOS_RED)
            self.assertFalse(motor.MicroStrategyConnector().authenticate())
            self.assertEqual(len(INTENTOS_RED), antes)

    loader = unittest.defaultTestLoader
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(ContratoSeguridadMotor))
    try:
        suite.addTests(loader.loadTestsFromName("test_motor_operativo"))
    except Exception as error:  # el import del test puede fallar si el motor rompe al importarse
        emitir({"estado": "FALLA", "motivo": f"No se pudo cargar test_motor_operativo: {error}"}, 1)

    resultado = unittest.TextTestRunner(stream=sys.stdout, verbosity=2).run(suite)
    total = resultado.testsRun
    fallas = len(resultado.failures) + len(resultado.errors)
    emitir({
        "estado": "OK" if fallas == 0 else "FALLA",
        "ejecutadas": total,
        "pasan": total - fallas - len(resultado.skipped),
        "fallan": fallas,
        "omitidas": len(resultado.skipped),
        "intentos_de_red_bloqueados": INTENTOS_RED,
    }, 0 if fallas == 0 else 1)


if __name__ == "__main__":
    main()
