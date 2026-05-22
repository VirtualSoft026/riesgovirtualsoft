# DOCUMENTACIÓN TÉCNICA Y GUÍA DE MANTENIMIENTO
## Plataforma Risk Manager | Control Operativo - VirtualSoft

---

## 1. VISIÓN GENERAL DEL PROYECTO

### Nombre del Proyecto
**Risk Manager - Control Operativo** (RiskOps VS)

### Objetivo Principal
Risk Manager es una plataforma web premium de control operativo diseñada para centralizar, optimizar y auditar en tiempo real las operaciones diarias del equipo de Riesgo en VirtualSoft. Su propósito fundamental es eliminar la dependencia de registros dispersos mediante una interfaz unificada que administra tareas asignadas por SETs operacionales, parsea horarios semanales y teletrabajo de archivos de Excel nativos en el servidor, gestiona solicitudes y aprobaciones de permisos, realiza backups de cierres de turnos en base de datos centralizada y genera reportes automáticos exportables en formato PDF.

### Funcionalidades Principales
1. **Control de Acceso y Roles**: Gestión robusta de usuarios en dos niveles de privilegios (Gestores y Supervisores) implementada con Firebase Auth para el inicio de sesión y Firebase Realtime Database para la aprobación manual de accesos.
2. **Restricción de Pantalla (Mobile Blocker)**: Capa de seguridad visual que bloquea el acceso en pantallas menores o iguales a 768 píxeles de ancho (dispositivos móviles y tablets) exigiendo el uso exclusivo de computadoras de escritorio.
3. **Árbol Operativo de Tareas por SET**: Mapeo inteligente y dinámico de las responsabilidades del equipo a través del parseo directo de un libro de Excel (`Tareas de Riesgo.xlsx`) usando la librería SheetJS, permitiendo filtrar tareas por SET específico.
4. **Estados y Notas Técnicas Obligatorias**: Los gestores pueden registrar el estado de cada tarea (Pendiente, En Proceso, Finalizada y No Realizada) con la obligatoriedad de justificar técnicamente cada acción antes de guardar el progreso.
5. **Módulo de Excepciones Justificadas**: Integración de una ventana modal especializada para justificar tareas "No Realizadas" mediante motivos preestablecidos (*Falta de Accesos*, *Sistema Caído*, *Falta de Tiempo*, *Reasignada*, *Otro*) y detalle descriptivo forzoso.
6. **KPI Dinámico de Turno**: Anillo de porcentaje interactivo SVG que evalúa en tiempo real el progreso de tareas completadas y justificadas frente al total de tareas asignadas para el turno.
7. **Biblioteca Interactiva de Procesos (Documentación)**: Buscador inteligente de manuales de políticas PDF y tutoriales multimedia MP4. El sistema analiza automáticamente el nombre de la tarea seleccionada y le sugiere al gestor el instructivo de manera destacada.
8. **Horario Semanal Integrado**: Parsea dinámicamente el archivo `Horario 2026.xlsx`. Aplica privacidad avanzada: los Gestores solo ven su propio horario diario, mientras que el Supervisor tiene el panel global unificado de todo el personal con badges visuales para cada estado de turno.
9. **Cronograma de Teletrabajo**: Parsea el archivo `Teletrabajo.xlsx` en tiempo real y categoriza la asistencia como "Home Office" o "Presencial" con un sistema inteligente de coincidencia fonética y de palabras para asociar nombres.
10. **Solicitud de Permisos Automatizada**: Formulario de justificaciones de ausencias (vacaciones, citas médicas, etc.) que se registra en tiempo real en la base de datos de Firebase y notifica por correo electrónico al supervisor empleando la API de FormSubmit.
11. **Consola de Aprobaciones del Supervisor**: Panel exclusivo de administración para Supervisores/Administradores desde donde aprueban o rechazan el registro de nuevos usuarios en la plataforma y autorizan las solicitudes de permisos pendientes.
12. **Historial de Turnos y Generador de PDFs**: Respaldo global y seguro de todos los reportes de finalización de turnos en Firebase, permitiendo al supervisor auditar las bitácoras y exportar reportes de gestión individuales a formato PDF usando la librería `jsPDF`.
13. **Perfil del Gestor y Cambio de Contraseña**: Visualización dinámica de la fotografía oficial del gestor a partir del reconocimiento de nombres en el directorio del proyecto y restablecimiento seguro de claves directo en la infraestructura de Firebase.

### Tecnologías Utilizadas
* **Estructura y Lógica Frontend**: HTML5 Semántico, Javascript moderno (ES6+), Inter Font (Google Fonts), Boxicons v2.1.4.
* **Diseño y Estética**: CSS3 Vanilla Premium con variables personalizadas, arquitectura Glassmorphic en modo oscuro y claro, animaciones fluidas de fondos de partículas (`float blobs`), y layouts responsive.
* **Librerías de Parseo e Integración**:
  * **SheetJS (xlsx.full.min.js)**: Utilizado para leer, estructurar y renderizar en tablas dinámicas HTML los datos binarios de los libros de Excel (`Tareas de Riesgo.xlsx`, `Horario 2026.xlsx`, `Teletrabajo.xlsx`).
  * **jsPDF (jspdf.umd.min.js)**: Empleado para la compilación, paginación y descarga en PDF de las bitácoras operativas del equipo.
* **Base de Datos y Autenticación**:
  * **Firebase Auth**: Validación segura de identidad del personal.
  * **Firebase Realtime Database**: Almacenamiento en la nube sin esquema de usuarios, históricos de permisos y bitácoras de cierres de turnos.
* **Backend de Desarrollo Local**: Python 3 con `http.server` y `socketserver`, implementando un API REST y servidor de archivos sin caché local para desarrollo rápido en puerto 8080.
* **Despliegue y Automatización**: Script batch de Windows para agregar cambios a Git, realizar commit con timestamp dinámico y realizar push a la nube para despliegue en GitHub Pages de forma automatizada.

### Flujo General de Funcionamiento
```mermaid
graph TD
    A[Inicio de Aplicación] --> B{¿Usuario Autenticado?}
    B -- No --> C[login.html / login.js]
    C --> D[Ingreso Credenciales / Registro Gestor]
    D --> E{Aprobado por Admin}
    E -- Sí --> F[Autenticación Firebase]
    E -- No --> G[Mostrar Mensaje Pendiente / Rechazo]
    B -- Sí --> H[index.html / app.js]
    H --> I[Cargar Datos de Excel: Tareas, Horario, Teletrabajo]
    H --> J[Escuchar Eventos Firebase: Permisos, Turnos, Aprobaciones]
    
    I --> K[Renderizar Dashboard Principal]
    K --> L[Gestor selecciona su SET de Tareas]
    L --> M[Gestor gestiona Tarea: Notas Técnicas y Estado]
    M --> N[Guardar Progreso en Caché Local y Actualizar KPI]
    
    K --> O[Finalizar Turno]
    O --> P[Guardar Histórico en Realtime Database y Enviar Correo a Supervisor]
    P --> Q[Limpiar Sesión y Redirigir a Login]
```

---

## 2. ESTRUCTURA COMPLETA DEL PROYECTO

El proyecto se encuentra organizado en una estructura limpia y optimizada para la Web, donde los archivos principales se encuentran en la raíz del proyecto para facilitar el despliegue automático en servicios estáticos como GitHub Pages.

```
Pagina Web de Riesgo VS/
├── index.html                   # Dashboard Operativo Principal (HTML)
├── styles.css                   # Sistema de Diseño y Estilos de la Plataforma (CSS)
├── app.js                       # Lógica Operativa de Tareas, Excels y Firebase (JS)
├── login.html                   # Página de Inicio de Sesión, Registro y Recuperación
├── login.css                    # Estilos Específicos para la Interfaz de Login
├── login.js                     # Controlador de Autenticación con Firebase Auth
├── firebase-config.js           # Credenciales y Configuración de Firebase
├── backend.py                   # Servidor de Desarrollo Local y API en Python
├── read_excel.py                # Script de prueba e inspección de archivos XLSX
├── database.json                # Base de datos simulada en formato JSON para backend local
├── Subir_Cambios.bat            # Script de Automatización de Git y Despliegue
├── Tareas Riesgo/               # Directorio de tareas
│   └── Tareas de Riesgo.xlsx    # Libro de tareas y procedimientos por SET
├── Horario/                     # Directorio de programación
│   └── Horario 2026.xlsx        # Horarios del equipo de Riesgos
├── Teletrabajo/                 # Directorio de cronograma de trabajo presencial/virtual
│   └── Teletrabajo.xlsx         # Asignación de días presenciales y de Home Office
├── Procesos/                    # Biblioteca de Procedimientos (PDFs y Multimedia)
│   ├── Instructivo de revisión de apuestas casino.pdf
│   ├── Instructivo de validación de GGR Casino.pdf
│   ├── Política Procedimiento De Aprobación De Retiros.pdf
│   ├── Procedimiento Identificación de jineteo.pdf
│   ├── Proceso de Eliminación de Cuentas - Implementaciones.pdf
│   ├── VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf
│   ├── Revisión de Eventos Deportivos.mp4
│   ├── Revisión de Eventos.mp4
│   └── Validación SEON.mp4
└── assets/
    └── src/
        └── img/                 # Repositorio de recursos multimedia estáticos
            ├── logo.svg         # Logotipo corporativo de la aplicación
            ├── Alexander Villada.png
            ├── Camilo Espinosa.png
            ├── Daniel Benavidez.png
            ├── Josue Alvarez.png
            ├── Juan Jose Diaz.png
            ├── Maria Sanchez.png
            ├── Marilyn Jimenez.png
            ├── Oriana Borja.png
            ├── Samuel Cruz.png
            ├── Sara Santamaria.png
            ├── Sebastian Arango.png
            ├── Sebastian Hincapie.png
            └── Yefferson Giraldo.png
```

---

## 3. CÓDIGO FUENTE DOCUMENTADO

A continuación se adjuntan los códigos fuente completos de la plataforma, acompañados de comentarios exhaustivos sobre su lógica interna, variables críticas y arquitectura.

---

### A. firebase-config.js
Este archivo gestiona las credenciales de Firebase en el cliente. Inicializa la conexión con la nube, configurando el acceso a Firebase Auth y al Realtime Database.

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBsS-jH21LLPqcX-d4fYY5Qvq2jOFXs6fc",
  authDomain: "riskops-75637.firebaseapp.com",
  projectId: "riskops-75637",
  storageBucket: "riskops-75637.firebasestorage.app",
  messagingSenderId: "874205588056",
  appId: "1:874205588056:web:95eb04536fd4586e26b82d",
  databaseURL: "https://riskops-75637-default-rtdb.firebaseio.com"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

```

#### Explicación de Bloques Críticos de `firebase-config.js`:
* **Líneas 1-9 (`firebaseConfig`)**: Define las claves públicas de acceso a los servicios de Firebase de RiskOps. Estas credenciales permiten conectar de forma directa la aplicación web con la infraestructura en la nube sin necesidad de un backend intermedio para autenticar llamadas.
* **Líneas 12-14**: Verifica si la aplicación de Firebase ya ha sido inicializada previamente por el navegador (para prevenir errores de doble inicialización al recargar componentes) y la inicializa.
* **Línea 15 (`database`)**: Exporta el objeto de acceso directo a Firebase Realtime Database para ser consumido globalmente por los controladores `login.js` y `app.js`.

---

### B. backend.py
Este es el servidor API y de archivos local escrito en Python puro. Proporciona una simulación local del backend y una API REST para persistir la información cuando no se cuenta con acceso directo a Internet o para entornos de desarrollo seguro.

```python
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse

PORT = 8080
DB_FILE = "database.json"

# Initialize DB
if not os.path.exists(DB_FILE):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump({"users": [], "permissions": []}, f)

def read_db():
    with open(DB_FILE, "r", encoding="utf-8") as f:
        db = json.load(f)
    
    # Auto-inyectar cuenta administradora maestra si no existe
    if not any(u.get("email", "").lower() == "maria.sanchez@virtualsoft.tech" for u in db.get("users", [])):
        if "users" not in db: db["users"] = []
        db["users"].append({
            "name": "Maria Sanchez (Admin)",
            "email": "maria.sanchez@virtualsoft.tech",
            "password": "admin123",
            "shift": "Master",
            "role": "Admin",
            "approved": True
        })
        write_db(db)
        
    return db

def write_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching for all files to ensure latest JS/CSS loads
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            db = read_db()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if parsed.path == "/api/users":
                self.wfile.write(json.dumps(db.get("users", [])).encode('utf-8'))
            elif parsed.path == "/api/permissions":
                self.wfile.write(json.dumps(db.get("permissions", [])).encode('utf-8'))
            elif parsed.path == "/api/documents":
                # Leer dinámicamente los archivos de la carpeta "Procesos"
                try:
                    files = [f for f in os.listdir("Procesos") if os.path.isfile(os.path.join("Procesos", f))]
                except:
                    files = []
                self.wfile.write(json.dumps(files).encode('utf-8'))
            else:
                self.wfile.write(b"{}")
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except:
                data = {}

            db = read_db()
            
            if parsed.path == "/api/users":
                if "users" not in db: db["users"] = []
                db["users"].append(data)
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/users/approve":
                for u in db.get("users", []):
                    if u.get("email") == data.get("email"):
                        u["approved"] = True
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/users/promote":
                for u in db.get("users", []):
                    if u.get("email", "").lower() == data.get("email", "").lower():
                        if "role" in data: u["role"] = data["role"]
                        if "password" in data: u["password"] = data["password"]
                        if "approved" in data: u["approved"] = data["approved"]
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/permissions":
                if "permissions" not in db: db["permissions"] = []
                db["permissions"].append(data)
                write_db(db)
                self.send_response(200)
            elif parsed.path == "/api/permissions/status":
                for p in db.get("permissions", []):
                    if p.get("id") == data.get("id"):
                        p["status"] = data.get("status")
                write_db(db)
                self.send_response(200)
            else:
                self.send_response(404)
            
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"success": true}')
        else:
            self.send_response(405)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

Handler = APIHandler

# Allow quick restart of the server on the same port
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Backend Server running at port {PORT}")
    httpd.serve_forever()

```

#### Explicación de Bloques Críticos de `backend.py`:
* **Líneas 11-13**: Inicialización de la base de datos simulada en formato JSON (`database.json`) si no existe en el disco duro, creando las claves principales `users` y `permissions`.
* **Líneas 19-30 (`read_db()`)**: Mecanismo de inyección automática para la cuenta administradora maestra (`maria.sanchez@virtualsoft.tech` con contraseña `admin123`). Esto garantiza que la dueña del sistema siempre pueda entrar, incluso si se formatea la base de datos local.
* **Clase `APIHandler` (Línea 38)**: Hereda de `SimpleHTTPRequestHandler` y sobreescribe métodos clave:
  * **`end_headers()` (Línea 39)**: Envía cabeceras HTTP que deshabilitan por completo la caché del navegador para asegurar que cada actualización de archivos CSS y JS se cargue instantáneamente durante el desarrollo.
  * **`do_GET()` (Línea 46)**: Intercepta rutas de API bajo `/api/` para entregar información de usuarios, permisos e incluso lee dinámicamente los archivos presentes en el directorio local `Procesos/` para poblar el listado de documentos de la biblioteca.
  * **`do_POST()` (Línea 71)**: Implementa controladores de creación de usuarios, aprobación de accesos (`/api/users/approve`), cambio de roles y edición de contraseñas (`/api/users/promote`), así como el envío y actualización de estados de permisos (`/api/permissions/status`).
  * **`do_OPTIONS()` (Línea 125)**: Habilita el control de CORS (Cross-Origin Resource Sharing) permitiendo que cualquier puerto de origen consulte la API local durante las pruebas de desarrollo.

---

### C. read_excel.py
Script interno en Python que demuestra el parseo manual de archivos `.xlsx` extrayendo el contenido XML nativo comprimido en la estructura zip del libro de Excel. Esto permite depurar la lectura de permisos sin depender del navegador.

```python
import csv
import zipfile
import xml.etree.ElementTree as ET

def read_xlsx(path):
    # .xlsx is just a zip file
    with zipfile.ZipFile(path, 'r') as z:
        # Get shared strings
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            with z.open('xl/sharedStrings.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for si in root.findall('ns:si', ns):
                    t = si.find('ns:t', ns)
                    strings.append(t.text if t is not None else "")
                
        # Read first sheet
        with z.open('xl/worksheets/sheet1.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            rows = root.findall('.//ns:row', ns)
            for row in rows[:5]:
                row_data = []
                for cell in row.findall('ns:c', ns):
                    v = cell.find('ns:v', ns)
                    if v is not None:
                        val = v.text
                        if cell.get('t') == 's':
                            val = strings[int(val)]
                        row_data.append(val)
                print(row_data)

try:
    read_xlsx('Permisos/Permisos Gestores.xlsx')
except Exception as e:
    print("Error:", e)

```

#### Explicación de Bloques Críticos de `read_excel.py`:
* **Línea 7 (`ZipFile`)**: Abre el archivo `.xlsx` como el contenedor comprimido Zip que realmente es por estándar OpenXML.
* **Líneas 9-17**: Extrae y decodifica la tabla de cadenas de texto compartidas (`sharedStrings.xml`), la cual asocia índices numéricos de celdas con sus respectivos textos literales para optimizar el peso del archivo de Excel.
* **Líneas 20-34**: Parsea mediante árboles de elementos XML (`ElementTree`) el contenido de la primera hoja (`sheet1.xml`), emparejando los valores de celda calculados y las cadenas de texto correspondientes para imprimir las primeras 5 filas por consola.

---

### D. Subir_Cambios.bat
Archivo script automatizado para la consola de Windows que realiza el despliegue automático del proyecto hacia el repositorio remoto de GitHub para actualizar la plataforma en producción.

```batch
@echo off

title Actualizador de Pagina Web de Riesgo



:: Ruta de Git

set "GIT_BIN=%USERPROFILE%\AppData\Local\Programs\Git\cmd\git.exe"



:: Si no existe en la ruta de AppData, usar el comando global

if not exist "%GIT_BIN%" (

    set "GIT_BIN=git"

)



echo ============================================================

echo        ACTUALIZADOR AUTOMATICO DE DATOS (RIESGO VS)

echo ============================================================

echo.

echo Buscando cambios locales en Horario, Teletrabajo o procesos...

echo.



"%GIT_BIN%" status -s



echo.

echo ============================================================

echo Guardando y preparando los archivos modificados...

"%GIT_BIN%" add .



:: Crear un mensaje de commit automatico con fecha y hora

set "FECHA=%date%"

set "HORA=%time%"

set "COMMIT_MSG=Actualizacion automatica de datos - %FECHA% %HORA%"



echo.

echo Creando el paquete de actualizacion...

"%GIT_BIN%" commit -m "%COMMIT_MSG%"



echo.

echo Subiendo los datos a GitHub (Internet)...

"%GIT_BIN%" push origin main



echo.

echo ============================================================

echo            PROCESO COMPLETADO CON EXITO!

echo.

echo Los cambios ya estan subiendose a la nube.

echo Por favor, espera 1 minuto y refresca la web (Ctrl + F5).

echo ============================================================

echo.

pause


```

#### Explicación de Bloques Críticos de `Subir_Cambios.bat`:
* **Líneas 5-10**: Localiza dinámicamente el ejecutable de Git en la ruta predeterminada de instalación del usuario en AppData o utiliza la variable de entorno global del sistema en caso de que Git no esté registrado localmente.
* **Líneas 24 (`git add .`)**: Prepara todos los archivos modificados en el espacio de trabajo, incluyendo documentos en `Procesos/` u hojas de Excel actualizadas.
* **Líneas 27-33 (`git commit`)**: Define automáticamente un mensaje de confirmación que captura la fecha y la hora exactas de la computadora que ejecuta el script, creando un punto de restauración preciso.
* **Línea 37 (`git push`)**: Sube los cambios directamente a la rama principal `main` en GitHub, lo que activa de forma automática las GitHub Pages para desplegar la versión actualizada de la web a los usuarios.

---

### E. login.html
Página de presentación y control de inicio de sesión de la plataforma. Diseñada con un estilo premium, animaciones dinámicas de esferas flotantes, y un panel de visualización inteligente que bloquea el acceso en pantallas de celulares.

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Manager | Iniciar Sesión</title>
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Boxicons for UI icons -->
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="login.css">
</head>
<body class="login-body">
    <!-- Mobile Blocker -->
    <div id="mobileBlocker">
        <i class='bx bx-desktop'></i>
        <h2>Acceso Restringido</h2>
        <p>Esta plataforma ha sido diseñada exclusivamente para uso en computadoras de escritorio.</p>
        <p style="margin-top: 10px; font-size: 14px;">Por favor, ingresa desde tu PC o Laptop para continuar.</p>
    </div>

    <!-- Animated background elements -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <div class="login-container glass-panel">
        <!-- Panel de Inicio de Sesión -->
        <div id="loginPanel" class="auth-panel active-panel">
            <div class="login-header">
                <img src="assets/src/img/logo.svg" alt="Risk Manager Logo" class="logo-icon" style="width: 55px; height: auto;">
                <h1 class="logo-text" style="font-size: 32px; margin-top: 10px;">Risk <span>Manager</span></h1>
                <p class="login-subtitle">Iniciar Sesión</p>
            </div>

            <form id="loginForm" class="login-form">
                <div class="input-group">
                    <i class='bx bx-envelope'></i>
                    <input type="email" id="loginEmail" placeholder="Correo Electrónico" required>
                </div>
                
                <div class="input-group">
                    <i class='bx bx-lock-alt'></i>
                    <input type="password" id="loginPassword" placeholder="Contraseña" required>
                    <i class='bx bx-show toggle-password' style="position: absolute; right: 14px; left: auto; cursor: pointer;"></i>
                </div>

                <div style="text-align: right; margin-bottom: 15px;">
                    <a href="#" class="auth-link" onclick="switchPanel('forgotPanel')">¿Olvidaste tu contraseña?</a>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 5px; font-size: 16px; padding: 12px;">
                    Ingresar
                </button>
                <p id="loginError" class="login-error-msg" style="display: none; color: var(--danger); text-align: center; margin-top: 10px;"></p>
            </form>

            <div class="login-footer" style="margin-top: 20px; border-top: 1px solid var(--glass-border); padding-top: 15px;">
                <p style="color: var(--text-secondary);">¿No tienes cuenta? <a href="#" class="auth-link" onclick="switchPanel('registerPanel')">Regístrate aquí</a></p>
            </div>
        </div>

        <!-- Panel de Registro -->
        <div id="registerPanel" class="auth-panel" style="display: none;">
            <div class="login-header">
                <i class='bx bx-user-plus logo-icon' style="font-size: 48px;"></i>
                <h1 class="logo-text" style="font-size: 24px; margin-top: 10px;">Crear Cuenta</h1>
                <p class="login-subtitle">Registro de Gestor</p>
            </div>

            <form id="registerForm" class="login-form">
                <div class="input-group">
                    <i class='bx bx-user'></i>
                    <input type="text" id="regName" placeholder="Nombre Completo" required>
                </div>

                <div class="input-group">
                    <i class='bx bx-envelope'></i>
                    <input type="email" id="regEmail" placeholder="Correo Electrónico" required>
                </div>

                <div class="input-group">
                    <i class='bx bx-lock-alt'></i>
                    <input type="password" id="regPassword" placeholder="Contraseña" required>
                    <i class='bx bx-show toggle-password' style="position: absolute; right: 14px; left: auto; cursor: pointer;"></i>
                </div>

                <div class="input-group">
                    <i class='bx bx-lock-alt'></i>
                    <input type="password" id="regConfirmPassword" placeholder="Confirmar Contraseña" required>
                    <i class='bx bx-show toggle-password' style="position: absolute; right: 14px; left: auto; cursor: pointer;"></i>
                </div>

                <div class="input-group">
                    <i class='bx bx-briefcase'></i>
                    <select id="regRole" required>
                        <option value="" disabled selected>Rol en el Sistema</option>
                        <option value="Gestor">Gestor</option>
                        <option value="Supervisor">Supervisor</option>
                    </select>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 20px; font-size: 16px; padding: 12px;">
                    Registrarse
                </button>
                <p id="registerError" class="login-error-msg" style="display: none; color: var(--danger); text-align: center; margin-top: 10px;"></p>
                <p id="registerSuccess" class="login-error-msg" style="display: none; color: var(--success); text-align: center; margin-top: 10px;"></p>
            </form>

            <div class="login-footer" style="margin-top: 20px; border-top: 1px solid var(--glass-border); padding-top: 15px;">
                <p style="color: var(--text-secondary);">¿Ya tienes cuenta? <a href="#" class="auth-link" onclick="switchPanel('loginPanel')">Volver al Login</a></p>
            </div>
        </div>

        <!-- Panel de Olvido de Contraseña -->
        <div id="forgotPanel" class="auth-panel" style="display: none;">
            <div class="login-header">
                <i class='bx bx-key logo-icon' style="font-size: 48px;"></i>
                <h1 class="logo-text" style="font-size: 24px; margin-top: 10px;">Recuperar</h1>
                <p class="login-subtitle">Enviaremos instrucciones a tu correo</p>
            </div>

            <form id="forgotForm" action="https://formsubmit.co/maria.sanchez@virtualsoft.tech" method="POST" class="login-form">
                <input type="hidden" name="_subject" value="Solicitud de Restablecimiento de Contraseña">
                <input type="hidden" name="_captcha" value="false">
                
                <div class="input-group">
                    <i class='bx bx-envelope'></i>
                    <input type="email" name="Correo_Solicitante" id="forgotEmail" placeholder="Ingresa tu correo" required>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 20px; font-size: 16px; padding: 12px;">
                    Enviar Enlace
                </button>
                <p id="forgotMessage" class="login-error-msg" style="display: none; text-align: center; margin-top: 15px; font-weight: 500;"></p>
            </form>

            <div class="login-footer" style="margin-top: 20px; border-top: 1px solid var(--glass-border); padding-top: 15px;">
                <a href="#" class="auth-link" onclick="switchPanel('loginPanel')"><i class='bx bx-arrow-back'></i> Volver al Login</a>
            </div>
        </div>
    </div>

    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
    <script src="firebase-config.js?v=45"></script>
    <script src="login.js?v=46"></script>
</body>
</html>

```

#### Explicación de Bloques Críticos de `login.html`:
* **Líneas 17-23 (`#mobileBlocker`)**: Estructura de bloqueo móvil. Si la resolución de pantalla es detectada como teléfono por las media queries de CSS, este contenedor oculta el resto de la interfaz y despliega un panel restrictivo.
* **Líneas 26-27 (`.blob`)**: Divisiones decorativas con fondos de color acentuado que se desplazan de manera infinita para dar un aspecto estético premium y fluido.
* **Líneas 29-144 (`.login-container`)**: Panel unificado "glassmorphic" con desenfoque de fondo en el cual conviven tres vistas de interacción dinámica activadas por JavaScript:
  * **`#loginPanel`**: Formulario de acceso con inputs interactivos de correo, contraseña, selector de visibilidad y botón de submit.
  * **`#registerPanel`**: Formulario de solicitud de registro con campos de nombre completo, correo, contraseña, confirmación y rol solicitado (Gestor o Supervisor).
  * **`#forgotPanel`**: Formulario de envío seguro de restablecimiento de contraseñas. Redirige la solicitud mediante POST hacia FormSubmit para enviar una notificación directa al supervisor del sistema.

---

### F. login.css
Archivo de hojas de estilo especializado para la interfaz de acceso. Complementa el diseño global de la plataforma, implementando el desenfoque del panel translúcido y las animaciones de fondo.

```css
/* Extend from styles.css */

.login-body {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: var(--bg-primary);
    overflow: hidden;
    position: relative;
}

/* Blobs for animated background */
.blob {
    position: absolute;
    filter: blur(80px);
    z-index: 0;
    opacity: 0.6;
    animation: float 10s ease-in-out infinite;
}

.blob-1 {
    width: 400px;
    height: 400px;
    background: var(--accent-primary);
    border-radius: 50%;
    top: -100px;
    left: -100px;
}

.blob-2 {
    width: 300px;
    height: 300px;
    background: var(--success);
    border-radius: 50%;
    bottom: -50px;
    right: -50px;
    animation-delay: -5s;
}

@keyframes float {
    0% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(30px, 50px) scale(1.1); }
    100% { transform: translate(0, 0) scale(1); }
}

.login-container {
    width: 100%;
    max-width: 420px;
    padding: 40px;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 30px;
    /* Extra blur for login */
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 15px 50px rgba(0,0,0,0.5);
}

.login-header {
    text-align: center;
}

.login-subtitle {
    color: var(--text-secondary);
    font-size: 14px;
    margin-top: 5px;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.input-group {
    position: relative;
    display: flex;
    align-items: center;
}

.input-group i {
    position: absolute;
    left: 14px;
    color: var(--text-secondary);
    font-size: 20px;
}

.input-group input, 
.input-group select {
    width: 100%;
    padding: 14px 14px 14px 45px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    transition: all 0.3s;
    appearance: none; /* Required for custom select */
}

/* Add custom arrow to select */
.input-group select {
    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
    background-repeat: no-repeat;
    background-position: right 14px center;
    background-size: 16px;
}
.input-group select option {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.input-group input:focus,
.input-group select:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    background: rgba(0, 0, 0, 0.4);
}

.login-footer {
    text-align: center;
    color: var(--text-secondary);
    font-size: 12px;
    margin-top: 20px;
}

```

#### Explicación de Bloques Críticos de `login.css`:
* **Líneas 14-45 (`.blob` y `@keyframes float`)**: Define la física del fondo animado de la aplicación. Aplica un filtro de desenfoque (`filter: blur(80px)`) muy alto para las esferas de colores primario y verde, desplazándolas en coordenadas cartesianas X/Y y escalas dinámicas de manera infinita.
* **Líneas 47-59 (`.login-container`)**: Define el panel translúcido principal usando desenfoque de filtro en el navegador (`backdrop-filter: blur(20px)`) para emular el vidrio esmerilado con una sombra profunda para contraste.
* **Líneas 90-121**: Estiliza de manera personalizada los campos de formulario e inyecta dinámicamente mediante SVG codificado en base64 una flecha personalizada para el campo selector (`select`) que encaja con el diseño en modo oscuro.

---

### G. login.js
Controlador lógico de la autenticación. Gestiona las interacciones de los formularios en la pantalla de inicio de sesión, conectando el navegador con Firebase Auth en tiempo real.

```javascript
// Helper function to switch panels
function switchPanel(panelId) {
    document.querySelectorAll('.auth-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    document.getElementById(panelId).style.display = 'block';
    
    // Clear forms and errors when switching
    document.querySelectorAll('.login-form').forEach(form => form.reset());
    document.querySelectorAll('.login-error-msg').forEach(msg => {
        msg.style.display = 'none';
        msg.textContent = '';
    });
}

// Alert if opened as file
if (window.location.protocol === 'file:') {
    alert("¡ATENCIÓN! Estás abriendo la plataforma directamente como un archivo local (file:///).\n\nPor seguridad, el sistema de envío de correos (FormSubmit) bloquea estos envíos.\nDebes abrir la plataforma usando un servidor web local (ej. http://localhost:8080).");
}

document.addEventListener('DOMContentLoaded', () => {
    // Ya no usamos localStorage.getItem('riskOps_usersData') aquí.
    // La base de datos es ahora el backend.

    // Toggle Password Visibility
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('bx-show');
                this.classList.add('bx-hide');
            } else {
                input.type = 'password';
                this.classList.remove('bx-hide');
                this.classList.add('bx-show');
            }
        });
    });

    // --- 1. REGISTER LOGIC ---
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerError.style.display = 'none';
            registerSuccess.style.display = 'none';

            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const role = document.getElementById('regRole').value;

            if (password !== confirmPassword) {
                registerError.textContent = "Las contraseñas no coinciden.";
                registerError.style.display = 'block';
                return;
            }

            // Validar que se ingrese al menos nombre y apellido
            const nameWords = name.split(/\s+/).filter(w => w.length >= 2);
            if (nameWords.length < 2) {
                registerError.textContent = "Por favor, ingresa tu nombre y apellido completo (mínimo dos palabras).";
                registerError.style.display = 'block';
                return;
            }

            // Cambiar estado visual del botón
            const btn = registerForm.querySelector('button[type="submit"]');
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Registrando...";
            btn.disabled = true;

            // Forzar permisos de Admin de forma invisible para la dueña de la plataforma
            let finalRole = role;
            if (email.toLowerCase() === 'maria.sanchez@virtualsoft.tech') {
                finalRole = 'Admin';
            }

            try {
                // 1. Create user in Firebase Auth
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // 2. Save user profile in Realtime Database under users/${uid} (no password saved)
                const newUser = {
                    name: name,
                    email: email,
                    shift: "Por Asignar", // El turno se asigna por Excel
                    role: finalRole,
                    approved: finalRole === 'Admin', // Solo los Admin se auto-aprueban
                    registrationDate: new Date().toISOString()
                };
                
                await database.ref('users/' + user.uid).set(newUser);

                // Enviar notificación al supervisor si no es auto-aprobado
                if (!newUser.approved) {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = 'https://formsubmit.co/maria.sanchez@virtualsoft.tech';
                    form.target = '_blank';
                    
                    const fields = {
                        "Nombre": name,
                        "Correo": email,
                        "Rol_Solicitado": role,
                        "Mensaje": "Hay un nuevo usuario pendiente de aprobación en la plataforma Risk Manager.",
                        "_subject": `Nuevo Registro Pendiente: ${name}`,
                        "_captcha": "false",
                        "_next": window.location.href
                    };
                    
                    for (const key in fields) {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = fields[key];
                        form.appendChild(input);
                    }
                    
                    document.body.appendChild(form);
                    form.submit();
                    document.body.removeChild(form);
                }

                registerSuccess.textContent = "¡Cuenta creada exitosamente! Redirigiendo al login...";
                registerSuccess.style.display = 'block';

                setTimeout(() => {
                    switchPanel('loginPanel');
                }, 2000);

            } catch(e) {
                console.error("Error Firebase al registrar:", e);
                let errMsg = "Error al crear la cuenta. Inténtalo de nuevo.";
                if (e.code === 'auth/email-already-in-use') {
                    errMsg = "Este correo ya está registrado.";
                } else if (e.code === 'auth/invalid-email') {
                    errMsg = "El correo no tiene un formato válido.";
                } else if (e.code === 'auth/weak-password') {
                    errMsg = "La contraseña debe tener al menos 6 caracteres.";
                }
                registerError.textContent = errMsg;
                registerError.style.display = 'block';
            } finally {
                btn.innerHTML = prevText;
                btn.disabled = false;
            }
        });
    }

    // --- 2. LOGIN LOGIC ---
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.style.display = 'none';
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            const btn = loginForm.querySelector('button[type="submit"]');
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Entrando...";
            btn.disabled = true;

            try {
                let userCredential;
                try {
                    userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                } catch (authError) {
                    // Auto-bootstrapping para la cuenta administradora inicial de Maria Sanchez
                    if (email.toLowerCase() === 'maria.sanchez@virtualsoft.tech' && password === 'admin123' && (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password')) {
                        try {
                            userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                        } catch (createError) {
                            throw authError;
                        }
                        
                        await database.ref('users/' + userCredential.user.uid).set({
                            name: "Maria Sanchez",
                            email: "maria.sanchez@virtualsoft.tech",
                            role: "Admin",
                            approved: true,
                            shift: "Master"
                        });
                    } else {
                        throw authError;
                    }
                }

                const user = userCredential.user;

                // Obtener perfil desde Realtime Database usando su UID de autenticación
                const snapshot = await database.ref('users/' + user.uid).once('value');
                let dbUser = snapshot.val();

                if (!dbUser) {
                    if (email.toLowerCase() === 'maria.sanchez@virtualsoft.tech') {
                        dbUser = {
                            name: "Maria Sanchez",
                            email: "maria.sanchez@virtualsoft.tech",
                            role: "Admin",
                            approved: true,
                            shift: "Master"
                        };
                        await database.ref('users/' + user.uid).set(dbUser);
                    } else {
                        throw { code: 'user-data-missing' };
                    }
                }

                if (dbUser.approved === 'Rechazado') {
                    loginError.innerHTML = `Tu solicitud de cuenta ha sido rechazada.<br><small>Motivo: ${dbUser.rejectionReason || 'No especificado'}</small>`;
                    loginError.style.display = 'block';
                    await firebase.auth().signOut();
                    return;
                }

                if (dbUser.approved === false) {
                    loginError.textContent = "Tu cuenta está pendiente de aprobación por un supervisor.";
                    loginError.style.display = 'block';
                    await firebase.auth().signOut();
                    return;
                }

                // Configurar sesión local
                const sessionData = {
                    name: dbUser.name,
                    email: dbUser.email,
                    shift: dbUser.shift || "Por Asignar",
                    role: dbUser.role || "Gestor",
                    loginTime: new Date().toISOString(),
                    uid: user.uid
                };

                localStorage.setItem('riskOps_currentUser', JSON.stringify(sessionData));
                
                // Redirigir al dashboard
                window.location.href = 'index.html';

            } catch(e) {
                console.error("Error al iniciar sesión:", e);
                let errMsg = "Correo o contraseña incorrectos. Si no tienes cuenta, regístrate.";
                if (e.code === 'auth/invalid-email') {
                    errMsg = "El correo no tiene un formato válido.";
                } else if (e.code === 'auth/user-disabled') {
                    errMsg = "Esta cuenta ha sido inhabilitada.";
                }
                loginError.textContent = errMsg;
                loginError.style.display = 'block';
            } finally {
                btn.innerHTML = prevText;
                btn.disabled = false;
            }
        });
    }

    // --- 3. FORGOT PASSWORD LOGIC ---
    const forgotForm = document.getElementById('forgotForm');
    const forgotMessage = document.getElementById('forgotMessage');

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            
            const btn = forgotForm.querySelector('button[type="submit"]');
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Enviando...";
            btn.disabled = true;

            try {
                await firebase.auth().sendPasswordResetEmail(email);
            } catch (error) {
                console.warn("Password reset request logged:", error);
                // Si es un error de formato de email, sí podemos alertar
                if (error.code === 'auth/invalid-email') {
                    forgotMessage.style.color = 'var(--danger)';
                    forgotMessage.textContent = "El correo ingresado no tiene un formato válido.";
                    forgotMessage.style.display = 'block';
                    btn.innerHTML = prevText;
                    btn.disabled = false;
                    return;
                }
            }

            // Para mayor seguridad y evitar errores innecesarios, siempre mostramos un mensaje de éxito genérico
            forgotMessage.style.color = 'var(--success)';
            forgotMessage.textContent = `Si el correo '${email}' está registrado en la plataforma, recibirás un enlace de restablecimiento en unos instantes. Revisa tu bandeja de entrada o spam.`;
            forgotMessage.style.display = 'block';
            forgotForm.reset();
            btn.innerHTML = prevText;
            btn.disabled = false;
        });
    }
});

```

#### Explicación de Bloques Críticos de `login.js`:
* **Líneas 17-19**: Valida si el proyecto se abrió directamente como un archivo local (`file://`). De ser así, alerta al usuario que el sistema de recuperación por FormSubmit requiere un servidor local HTTP o el despliegue en línea para funcionar de forma segura.
* **Líneas 59-71 (Validación de Registro)**: Implementa validaciones forzosas en el cliente. Asegura que las contraseñas coincidan y que el gestor ingrese su nombre y apellido de forma completa (mínimo dos palabras separadas por espacios) para mantener la integridad de la base de datos de personal.
* **Líneas 79-83 (Auto-elevación de Privilegios)**: Regla especial de seguridad. Si el correo de registro corresponde al de la dueña de la plataforma (`maria.sanchez@virtualsoft.tech`), el sistema eleva de forma invisible el rol a "Admin" y auto-aprueba la cuenta en Firebase Realtime Database.
* **Líneas 102-129 (Notificación por FormSubmit)**: Crea programáticamente un formulario HTTP POST oculto y lo envía por debajo en una ventana paralela para alertar vía correo electrónico al supervisor sobre la existencia del nuevo usuario pendiente de aprobación.
* **Líneas 179-194 (Auto-bootstrapping Admin)**: En caso de que la base de datos de Firebase Auth esté vacía y la cuenta maestra de la dueña del sistema aún no esté registrada, el controlador detecta el intento de login con las credenciales maestras predeterminadas y crea la cuenta automáticamente en Firebase con privilegios completos de administrador.
* **Líneas 220-232 (Validación de Aprobación)**: Comprueba el estado de aprobación del usuario. Si un supervisor lo rechazó o si se encuentra en estado pendiente de aprobación, bloquea el inicio de sesión, despliega el error explicativo e interrumpe la sesión activa.

---

### H. index.html
El esqueleto estructural de la plataforma Risk Manager. Contiene la barra de navegación del Sidebar, el Header superior con reloj activo y notificaciones en tiempo real, las ventanas modales de excepciones y perfil, y las diferentes vistas que componen la lógica de negocio de la plataforma.

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Manager | Control Operativo</title>
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Boxicons for UI icons -->
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    <!-- SheetJS for Excel parsing -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
    <!-- jsPDF for PDF generation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <link rel="stylesheet" href="styles.css?v=83">
</head>
<body>
    <!-- Mobile Blocker -->
    <div id="mobileBlocker">
        <i class='bx bx-desktop'></i>
        <h2>Acceso Restringido</h2>
        <p>Esta plataforma ha sido diseñada exclusivamente para uso en computadoras de escritorio.</p>
        <p style="margin-top: 10px; font-size: 14px;">Por favor, ingresa desde tu PC o Laptop para continuar.</p>
    </div>

    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar glass-panel">
            <div class="sidebar-header">
                <img src="assets/src/img/logo.svg" alt="Risk Manager Logo" class="logo-icon" style="width: 35px; height: auto;">
                <h1 class="logo-text">Risk <span>Manager</span></h1>
            </div>
            
            <nav class="sidebar-nav">
                <a href="#" class="nav-item active" id="navWorkspace"><i class='bx bx-grid-alt'></i> Mis Tareas</a>
                <a href="#" class="nav-item" id="navHorario"><i class='bx bx-calendar'></i> Horario</a>
                <a href="#" class="nav-item" id="navTeletrabajo"><i class='bx bx-home-alt'></i> Teletrabajo</a>
                <a href="#" class="nav-item" id="navDocs"><i class='bx bx-folder-open'></i> Documentación</a>
                <a href="#" class="nav-item" id="navPermisos"><i class='bx bx-check-shield'></i> Historial de permisos</a>
                <a href="#" class="nav-item" id="navTurnos" style="display: none;"><i class='bx bx-history'></i> Historial de turnos</a>
                <a href="#" class="nav-item" id="navAprobaciones" style="display: none;"><i class='bx bx-user-check'></i> Aprobaciones</a>
                <a href="#" class="nav-item" id="navMonitoreo" style="display: none;"><i class='bx bx-pulse'></i> Monitoreo</a>
                <a href="#" class="nav-item" id="navSoporte"><i class='bx bx-help-circle'></i> Soporte</a>
            </nav>

            <div class="sidebar-footer" style="padding: 20px; border-top: 1px solid var(--glass-border); margin-top: auto;">
                <button id="endShiftBtn" class="btn btn-danger" onclick="handleEndShift()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class='bx bx-log-out-circle'></i> Finalizar Turno
                </button>
                <div style="font-size: 9px; color: var(--text-secondary); text-align: center; margin-top: 10px; opacity: 0.5;">
                    Build: 20/05 19:45 (v90)
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Header -->
            <header class="top-header glass-panel">
                <div class="header-left">
                    <div class="shift-info">
                        <span class="shift-badge">Cargando...</span>
                        <div class="clock" id="liveClock">00:00:00</div>
                    </div>
                </div>
                <div class="header-right">
                    <button class="btn btn-icon" id="themeToggleBtn"><i class='bx bx-moon'></i></button>
                    
                    <!-- Notification Bell with Dropdown -->
                    <div>
                        <button class="btn btn-icon" id="notificationBtn" style="position:relative;" onclick="toggleNotifications()">
                            <i class='bx bx-bell'></i>
                            <span class="notification-badge" id="notificationCount" style="display:none; position:absolute; top:-2px; right:-2px; background:var(--danger); color:white; font-size:10px; padding:2px 5px; border-radius:10px;">0</span>
                        </button>
                    </div>
                    <div class="user-profile" onclick="openProfileModal()" style="cursor: pointer;">
                        <img src="https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff" alt="User Avatar" class="avatar">
                        <div class="user-details">
                            <span class="user-name">Usuario</span>
                            <span class="user-role">Cargando...</span>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Dashboard Workspace -->
            <div id="view-workspace" class="view-panel active-view">
                <div class="workspace-grid">
                
                <!-- Left Panel: SETs Tree -->
                <section class="panel glass-panel">
                    <div class="panel-title">
                        <i class='bx bx-list-ul'></i> Procesos (SETs)
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; display: block;">Selecciona tu SET a trabajar:</label>
                        <select id="activeSetSelect" class="modern-input" style="padding: 8px;">
                            <option value="Todos">Mostrar Todos</option>
                        </select>
                    </div>

                    <div class="tree-container">
                        <div style="padding: 20px; color: var(--text-secondary); text-align: center;">Cargando tareas...</div>
                    </div>
                </section>

                <!-- Center Panel: Task Detail -->
                <section class="panel detail-panel glass-panel">
                    <div class="detail-header">
                        <h2 class="panel-title" id="currentTaskTitle">Selecciona una Tarea</h2>
                        <button class="btn btn-outline" id="helpBtn">
                            <i class='bx bx-book-open'></i> Instructivo
                        </button>
                    </div>

                    <div class="task-controls">
                        <label>Estado de la Tarea:</label>
                        <div class="status-buttons">
                            <button class="btn-status pending active"><i class='bx bx-time'></i> Pendiente</button>
                            <button class="btn-status in-progress"><i class='bx bx-loader-alt bx-spin-hover'></i> En Proceso</button>
                            <button class="btn-status completed"><i class='bx bx-check-circle'></i> Finalizada</button>
                            <button class="btn-status not-done" onclick="openExceptionModal()"><i class='bx bx-x-circle'></i> No Realizada</button>
                        </div>
                    </div>

                    <div class="task-form">
                        <label>Notas Técnicas:</label>
                        <textarea id="taskObservation" placeholder="Ingresa observaciones de la gestión..." class="modern-input"></textarea>
                        
                        <div class="action-bar" style="margin-top: 15px;">
                            <button class="btn btn-primary" id="saveTaskBtn">Guardar Progreso</button>
                        </div>
                    </div>
                </section>

                <!-- Right Panel: Context & KPIs -->
                <section class="panel right-panel glass-panel">
                    <h2 class="panel-title"><i class='bx bx-bar-chart-alt-2'></i> Progreso del Turno</h2>
                    
                    <div class="kpi-card">
                        <!-- KPI se inyecta dinámicamente -->
                    </div>

                    <div class="documentation-shortcut">
                        <h3>Acceso Rápido Documentos</h3>
                        <div id="quickDocsList">
                             <p style="font-size: 12px; color: var(--text-secondary);">Cargando accesos...</p>
                        </div>
                    </div>
                </section>
                </div>
            </div>

            <!-- Vista: Horario -->
            <div id="view-horario" class="view-panel" style="display: none; padding: 20px;">
                <h2 class="panel-title" style="margin-bottom: 20px;"><i class='bx bx-calendar'></i> Horario Semanal</h2>
                <div class="glass-panel" style="padding: 20px; overflow-x: auto; position: relative;">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Datos leídos desde 'Horario/Horario 2026.xlsx'</p>
                    
                    <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                        <label style="color: var(--text-secondary); font-size: 14px;">Seleccionar Semana:</label>
                        <select id="weekSelector" class="modern-input" style="padding: 8px; width: auto; min-width: 250px; background: var(--bg-dark);">
                            <option value="">Cargando semanas...</option>
                        </select>
                    </div>

                    <table class="modern-table" style="width: 100%; border-collapse: collapse; text-align: center; min-width: 800px;">
                        <thead id="scheduleTableHead"></thead>
                        <tbody id="scheduleTableBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Vista: Teletrabajo -->
            <div id="view-teletrabajo" class="view-panel" style="display: none; padding: 20px;">
                <h2 class="panel-title" style="margin-bottom: 20px;"><i class='bx bx-home-alt'></i> Cronograma de Teletrabajo</h2>
                <div class="glass-panel" style="padding: 20px; overflow-x: auto;">
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">Datos leídos desde 'Teletrabajo/Teletrabajo.xlsx'</p>
                    
                    <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                        <label style="color: var(--text-secondary); font-size: 14px;">Seleccionar Semana:</label>
                        <select id="teletrabajoWeekSelector" class="modern-input" style="padding: 8px; width: auto; min-width: 250px; background: var(--bg-dark);">
                            <option value="">Cargando semanas...</option>
                        </select>
                    </div>

                    <table class="modern-table" style="width: 100%; border-collapse: collapse; text-align: center; min-width: 800px;">
                        <thead id="teletrabajoTableHead"></thead>
                        <tbody id="teletrabajoTableBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Vista: Documentación -->
            <div id="view-docs" class="view-panel" style="display: none; padding: 20px;">
                <h2 class="panel-title" style="margin-bottom: 20px;"><i class='bx bx-folder-open'></i> Biblioteca de Procesos</h2>
                <div class="docs-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;"></div>
            </div>

            <!-- Vista: Permisos -->
            <div id="view-permisos" class="view-panel" style="display: none; padding: 20px;">
                <h2 class="panel-title" style="margin-bottom: 20px;"><i class='bx bx-check-shield'></i> Solicitud de Permisos</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;" id="permisosLayout">
                    <div class="glass-panel" style="padding: 20px;" id="crearPermisoPanel">
                        <h3>Crear Nueva Solicitud</h3>
                        <form id="permisosForm" action="https://formsubmit.co/maria.sanchez@virtualsoft.tech" method="POST" class="task-form" style="margin-top: 15px;">
                            <input type="hidden" name="_subject" value="Nueva Solicitud de Permiso - Gestor Riesgo">
                            <input type="hidden" name="_captcha" value="false">
                            <label>Nombre del Gestor</label>
                            <input type="text" name="Gestor" class="modern-input" id="permisoGestorName" readonly required style="min-height: 40px; margin-bottom: 10px;">
                            <label>Tipo de Permiso</label>
                            <select name="Tipo_Permiso" id="tipoPermisoSelect" class="modern-input" required style="min-height: 40px; margin-bottom: 10px;">
                                <option value="Vacaciones">Vacaciones</option>
                                <option value="Falta Justificada">Falta Justificada</option>
                                <option value="Llegada Tarde">Llegada Tarde</option>
                                <option value="Calamidad">Calamidad</option>
                                <option value="Cita Medica">Cita Médica</option>
                                <option value="Otro">Otro</option>
                            </select>
                            <div id="otroPermisoContainer" style="display: none; margin-bottom: 10px;">
                                <label>Especifique</label>
                                <input type="text" name="Especificacion_Otro" id="otroPermisoInput" class="modern-input" style="min-height: 40px;">
                            </div>
                            <label>Fecha del Permiso</label>
                            <input type="date" name="Fecha" class="modern-input" required style="min-height: 40px; margin-bottom: 10px;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                                <div><label>Hora Inicio</label><input type="time" name="Hora_Inicio" class="modern-input" required style="min-height: 40px; width: 100%;"></div>
                                <div><label>Hora Fin</label><input type="time" name="Hora_Fin" class="modern-input" required style="min-height: 40px; width: 100%;"></div>
                            </div>
                            <label>Motivo y Justificación</label>
                            <textarea name="Justificacion" class="modern-input" required style="min-height: 100px;"></textarea>
                            <button type="submit" class="btn btn-primary" style="margin-top: 15px;"><i class='bx bx-send'></i> Enviar a Supervisor</button>
                        </form>
                    </div>
                    <div class="glass-panel" style="padding: 20px;">
                        <h3>Histórico de Permisos</h3>
                        <div id="historicoPermisosList" style="margin-top: 20px; overflow-y: auto; max-height: 500px;"></div>
                    </div>
                </div>
            </div>

            <!-- Vista: Aprobaciones (Admin) -->
            <div id="view-aprobaciones" class="view-panel" style="display: none; padding: 20px;">
                <h2 class="panel-title" style="margin-bottom: 20px; color: var(--warning);"><i class='bx bx-user-check'></i> Gestión de Usuarios</h2>
                <div class="glass-panel" style="padding: 20px; border: 1px solid var(--warning); overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Nombre</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Email</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Rol</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">F. Solicitud</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">F. Aprobación</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="pendingUsersTableBody"></tbody>
                    </table>
                </div>

                <h2 class="panel-title" style="margin-top: 30px; margin-bottom: 20px; color: var(--accent-primary);"><i class='bx bx-time-five'></i> Permisos Pendientes</h2>
                <div class="glass-panel" style="padding: 20px; border: 1px solid var(--accent-primary); overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Gestor</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Tipo</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Fecha</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="pendingPermissionsTableBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Vista: Historial de Turnos -->
            <div id="view-turnos" class="view-panel" style="display: none; padding: 20px;">
                <h2 class="panel-title" style="margin-bottom: 20px; color: var(--success);"><i class='bx bx-history'></i> Historial de Turnos Global</h2>
                
                <!-- Filtros para historial de turnos -->
                <div class="glass-panel" style="padding: 15px; margin-bottom: 20px; display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap; border: 1px solid var(--glass-border);">
                    <div style="flex: 1; min-width: 200px;">
                        <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; display: block; font-weight: 500;">Filtrar por Gestor:</label>
                        <input type="text" id="filterGestorInput" placeholder="Nombre del gestor..." class="modern-input" style="min-height: 40px; padding: 10px; resize: none;">
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; display: block; font-weight: 500;">Filtrar por Fecha:</label>
                        <input type="date" id="filterFechaInput" class="modern-input" style="min-height: 40px; padding: 10px; resize: none;">
                    </div>
                    <div>
                        <button class="btn btn-outline" id="clearFiltersBtn" style="height: 40px; padding: 0 15px; display: flex; align-items: center; gap: 8px;"><i class='bx bx-filter-alt'></i> Limpiar Filtros</button>
                    </div>
                </div>

                <div class="glass-panel" style="padding: 20px; border: 1px solid var(--success); overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Gestor</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">SET</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Inicio</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Fin</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: left;">Reporte</th>
                                <th style="padding: 12px; color: var(--accent-primary); text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="shiftReportsTableBody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Vista: Monitoreo Realtime -->
            <div id="view-monitoreo" class="view-panel" style="display: none; padding: 20px; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 class="panel-title" style="margin: 0;"><i class='bx bx-pulse'></i> Monitoreo</h2>
                    <div class="pulse-live">
                        <div class="pulse-live-dot"></div>
                        En Vivo
                    </div>
                </div>

                <!-- Stat Cards -->
                <div class="stats-grid" style="margin-bottom: 20px;">
                    <!-- Total Activos -->
                    <div class="stat-widget glass-panel">
                        <div class="stat-widget-details">
                            <h3 id="statsGestoresTitle">Gestores Activos</h3>
                            <div class="number" id="statsGestores">0 / 0</div>
                        </div>
                        <div class="stat-widget-icon">
                            <i class='bx bx-group'></i>
                        </div>
                    </div>

                    <!-- KPI Promedio -->
                    <div class="stat-widget glass-panel">
                        <div class="stat-widget-details">
                            <h3>KPI Promedio General</h3>
                            <div class="number" id="statsKpi">0%</div>
                        </div>
                        <div class="stat-widget-icon">
                            <i class='bx bx-line-chart'></i>
                        </div>
                    </div>
                </div>

                <!-- Filter Row -->
                <div class="filter-section glass-panel" style="margin-bottom: 20px;">
                    <div class="filter-group">
                        <select id="monitoreoSearchInput" class="filter-select">
                            <option value="">Todos los Gestores</option>
                        </select>

                        <select id="filterShiftSelect" class="filter-select">
                            <option value="">Todos los Turnos</option>
                            <option value="Mañana">Turno Mañana</option>
                            <option value="Tarde">Turno Tarde</option>
                            <option value="Noche">Turno Noche</option>
                            <option value="Master">Turno Master</option>
                        </select>

                        <select id="filterStatusSelect" class="filter-select">
                            <option value="">Todos los Estados</option>
                            <option value="online">En Línea</option>
                            <option value="offline">Inactivos</option>
                        </select>
                    </div>
                    
                    <button class="btn btn-outline" id="clearMonitoreoFiltersBtn" style="height: 40px; padding: 0 15px; display: flex; align-items: center; gap: 8px; width: auto;">
                        <i class='bx bx-filter-alt'></i> Limpiar Filtros
                    </button>
                </div>

                <!-- Grid layout of active managers -->
                <div class="monitoreo-grid" id="monitoreoGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; padding-bottom: 40px;">
                    <!-- Renderizado dinámico -->
                </div>
            </div>

        </main>
    </div>

    <!-- Exception Modal -->
    <div id="exceptionModal" class="modal-overlay">
        <div class="modal glass-panel">
            <h2>Justificar Tarea No Realizada</h2>
            <select id="exceptionReason" class="modern-input" style="margin-bottom: 15px;">
                <option value="" disabled selected>Seleccione una razón</option>
                <option value="Falta de Accesos">Falta de Accesos</option>
                <option value="Sistema Caído">Sistema Caído</option>
                <option value="Falta de Tiempo">Falta de Tiempo</option>
                <option value="Reasignada">Reasignada por el Supervisor</option>
                <option value="Otro">Otro</option>
            </select>
            <textarea id="exceptionDetails" placeholder="Detalle el problema..." class="modern-input"></textarea>
            <div class="modal-actions" style="margin-top: 20px;">
                <button class="btn btn-outline" onclick="closeModal('exceptionModal')">Cancelar</button>
                <button class="btn btn-danger" onclick="confirmException()">Confirmar Excepción</button>
            </div>
        </div>
    </div>

    <!-- Profile Modal -->
    <div id="profileModal" class="modal-overlay">
        <div class="modal glass-panel" style="text-align: center;">
            <div style="margin-bottom: 20px;">
                <img id="modalProfileAvatar" src="" alt="Profile" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent-primary); box-shadow: 0 0 15px rgba(59,130,246,0.3);">
                <h2 id="modalProfileName" style="margin-top: 15px; margin-bottom: 5px; font-size: 24px;">Usuario</h2>
                <div id="modalProfileRole" style="color: var(--accent-primary); font-size: 14px; font-weight: 600; text-transform: uppercase;">Rol</div>
            </div>
            
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid var(--glass-border); text-align: left;">
                <label style="font-size: 13px; color: var(--text-secondary);"><i class='bx bx-lock-alt'></i> Cambiar Contraseña</label>
                <input type="password" id="newPasswordInput" class="modern-input" placeholder="Escribe la nueva contraseña" style="margin-top: 8px;">
            </div>
            <div class="modal-actions" style="margin-top: 20px;">
                <button class="btn btn-outline" onclick="closeModal('profileModal')">Cancelar</button>
                <button class="btn btn-primary" onclick="changePassword()">Guardar</button>
            </div>
            <p id="passwordChangeMsg" style="display: none; margin-top: 10px; font-size: 14px; text-align: center;"></p>
        </div>
    </div>

    <!-- Monitoreo Detail Modal -->
    <div id="monitoreoModal" class="modal-overlay">
        <div class="modal glass-panel" style="max-width: 600px; width: 90%;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 5px;">
                <img id="monitoreoModalAvatar" src="" alt="Avatar" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">
                <div>
                    <h2 id="monitoreoModalName" style="margin: 0; font-size: 20px; color: var(--text-primary);">Bitácora de Tareas</h2>
                    <div id="monitoreoModalInfo" style="font-size: 12px; color: var(--text-secondary);">Turno: Mañana | Activo hace poco</div>
                </div>
            </div>
            <hr style="border: 0; border-top: 1px solid var(--glass-border); margin: 15px 0;">
            <h3 style="font-size: 14px; color: var(--accent-primary); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;"><i class='bx bx-task'></i> Detalle de Gestión de Tareas</h3>
            
            <div style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;" id="monitoreoModalTasksList">
                <!-- Tareas del gestor se cargan dinámicamente -->
            </div>
            
            <div class="modal-actions" style="margin-top: 20px;">
                <button class="btn btn-outline" id="closeMonitoreoModalBtn" style="width: auto;">Cerrar</button>
            </div>
        </div>
    </div>



    <!-- Notifications Dropdown -->
    <div id="notificationDropdown" class="glass-panel" style="display: none; position: fixed; top: 80px; right: 20px; width: 320px; max-height: 400px; overflow-y: auto; z-index: 999999; padding: 15px; background: var(--bg-panel); border: 1px solid var(--accent-primary);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid var(--glass-border);">
            <h4 style="margin:0;"><i class='bx bx-bell'></i> Notificaciones</h4>
            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 11px; width: auto;" onclick="markAllAsRead()">Marcar leídas</button>
        </div>
        <div id="notificationList" style="display: flex; flex-direction: column; gap: 8px;"></div>
    </div>

    <!-- Firebase -->
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
    <script src="firebase-config.js?v=59"></script>
    <script src="app.js?v=89"></script>
</body>
</html>

```

#### Explicación de Bloques Críticos de `index.html`:
* **Líneas 13-16**: Carga de dependencias fundamentales del cliente desde servidores CDN de alta velocidad:
  * **`xlsx.full.min.js`**: Motor principal de SheetJS para procesar binarios de Excel de forma local en el navegador del cliente.
  * **`jspdf.umd.min.js`**: Generador nativo de archivos PDF en Javascript.
* **Líneas 30-55 (`aside.sidebar`)**: Barra lateral de navegación que define los enlaces dinámicos a las diferentes pestañas operativas de la plataforma. Integra elementos invisibles por defecto (`display: none`) para los accesos del supervisor tales como "Historial Turnos" e "Aprobaciones" para evitar intrusión.
* **Líneas 60-85 (`header.top-header`)**: Cabecera principal que aloja el reloj en tiempo real, el badge dinámico de turno operativo activo, el botón para alternar el tema visual, la campana inteligente de notificaciones con dropdown nativo y el avatar del usuario conectado.
* **Líneas 88-154 (`#view-workspace`)**: Módulo de control de tareas del Gestor. Integra el listado de selección de SET, el visor de árbol de tareas interactivo, el panel central de observaciones y guardado de notas, y la columna lateral derecha de KPI de progreso y atajos de biblioteca.
* **Líneas 156-194 (Vistas de Horario y Teletrabajo)**: Secciones del dashboard que integran los selectores de semana y las tablas HTML adaptativas que poblará SheetJS.
* **Líneas 203-242 (`#view-permisos`)**: Formulario interactivo de solicitud de permisos y contenedor del historial personal de solicitudes del gestor conectado.
* **Líneas 244-294 (Vistas Supervisor)**: Consolas avanzadas para la gestión administrativa de cuentas de usuarios, aprobación de permisos con retroalimentación y visor de reportes de turnos generales con descarga de bitácoras en PDF.
* **Líneas 298-337 (Ventanas Modales)**: Modales interactivos translúcidos posicionados de forma absoluta para reportar tareas no realizadas con detalles (excepciones) y para cambiar claves personales.

---

### I. styles.css
El motor estético del Risk Manager. Define la paleta de colores oscuros oscilando en tonos gris carbón y azul cobalto, el modo claro premium alternativo, las reglas de desenfoque de cristales del estilo "glassmorphism", sombras de relieve acentuadas, y tipografías optimizadas.

```css
:root, [data-theme="dark"] {
    /* Color Palette - Dark Premium Theme */
    --bg-primary: #0B0E14;
    --bg-secondary: #131720;
    --glass-bg: rgba(19, 23, 32, 0.65);
    --glass-border: rgba(255, 255, 255, 0.08);
    --text-primary: #F3F4F6;
    --text-secondary: #9CA3AF;
    --accent-primary: #3B82F6;
    --accent-hover: #2563EB;
    
    /* Semantic Colors */
    --success: #10B981;
    --success-bg: rgba(16, 185, 129, 0.15);
    --warning: #F59E0B;
    --warning-bg: rgba(245, 158, 11, 0.15);
    --danger: #EF4444;
    --danger-bg: rgba(239, 68, 68, 0.15);
    --pending: #6B7280;
    --pending-bg: rgba(107, 114, 128, 0.15);

    /* Spacing & Radii */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    
    /* Shadows */
    --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    --shadow-accent: 0 0 15px rgba(59, 130, 246, 0.3);
}

[data-theme="light"] {
    /* Color Palette - Light Premium Theme */
    --bg-primary: #F9FAFB;
    --bg-secondary: #F3F4F6;
    --glass-bg: rgba(255, 255, 255, 0.85);
    --glass-border: rgba(0, 0, 0, 0.08);
    --text-primary: #1F2937;
    --text-secondary: #4B5563;
    --accent-primary: #3B82F6;
    --accent-hover: #2563EB;
    
    /* Shadows */
    --shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
    --shadow-accent: 0 0 15px rgba(59, 130, 246, 0.3);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
}

body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    overflow-x: hidden;
    height: 100vh;
    display: flex;
}

/* Mobile Blocker */
#mobileBlocker {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: var(--bg-primary);
    z-index: 99999999;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 30px;
    color: var(--text-primary);
}

#mobileBlocker i {
    font-size: 80px;
    color: var(--danger);
    margin-bottom: 20px;
}

#mobileBlocker h2 {
    font-size: 28px;
    margin-bottom: 15px;
    background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

#mobileBlocker p {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.5;
}

@media (max-width: 768px) {
    #mobileBlocker {
        display: flex;
    }
    .app-container, .login-container {
        display: none !important;
    }
}

/* Typography elements */
h1, h2, h3 { color: var(--text-primary); font-weight: 600; }
a { text-decoration: none; color: inherit; }
.bx { color: inherit; }
[data-theme="dark"] .bx { color: var(--text-primary); }
[data-theme="dark"] .btn .bx { color: inherit; }

/* Layout Structure */
.app-container {
    display: flex;
    width: 100%;
    height: 100%;
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
}

/* Glassmorphism Utility */
.glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
}

/* Sidebar */
.sidebar {
    width: 260px;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-lg);
    flex-shrink: 0;
    transition: width 0.3s ease;
}

.sidebar-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: 40px;
}

.logo-icon {
    font-size: 28px;
    color: var(--accent-primary);
}

.logo-text {
    font-size: 22px;
    letter-spacing: -0.5px;
}

.logo-text span {
    color: var(--accent-primary);
}

.sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    flex-grow: 1;
}

.nav-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-weight: 500;
    transition: all 0.2s ease;
}

.nav-item i {
    font-size: 20px;
}

.nav-item:hover, .nav-item.active {
    background: var(--glass-border);
    color: var(--text-primary);
}

.nav-item.active {
    border-left: 4px solid var(--accent-primary);
    background: linear-gradient(90deg, rgba(59,130,246,0.1) 0%, transparent 100%);
}

.sidebar-footer {
    margin-top: auto;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: var(--radius-md);
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
}

.btn-primary { background: var(--accent-primary); color: white; }
.btn-primary:hover { background: var(--accent-hover); box-shadow: var(--shadow-accent); transform: translateY(-1px); }

.btn-danger { background: var(--danger-bg); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
.btn-danger:hover { background: var(--danger); color: white; transform: translateY(-1px); }

.btn-outline { background: transparent; border: 1px solid var(--glass-border); color: var(--text-primary); }
.btn-outline:hover { background: var(--glass-border); }

.btn-icon { width: 40px; height: 40px; border-radius: 50%; padding: 0; background: var(--glass-border); color: var(--text-primary); font-size: 20px; }
.btn-icon:hover { background: rgba(255,255,255,0.15); transform: scale(1.05); }

/* Main Content */
.main-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    overflow: hidden;
}

/* Top Header */
.top-header {
    height: 70px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--spacing-lg);
    border-radius: var(--radius-lg);
}

.header-left .shift-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.shift-badge {
    background: var(--glass-border);
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.clock {
    font-family: monospace;
    font-size: 20px;
    font-weight: 700;
    color: var(--accent-primary);
    text-shadow: 0 0 10px rgba(59,130,246,0.5);
}

.header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
}

.user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
}

.avatar {
    width: 55px !important;
    height: 55px !important;
    min-width: 55px !important;
    min-height: 55px !important;
    max-width: 55px !important;
    max-height: 55px !important;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--accent-primary);
    display: block;
}

.user-details {
    display: flex;
    flex-direction: column;
}

.user-name {
    font-weight: 600;
    font-size: 16px;
}

.user-role {
    font-size: 13px;
    color: var(--text-secondary);
}

/* Workspace Grid */
.workspace-grid {
    display: grid;
    grid-template-columns: 300px 1fr 320px;
    gap: var(--spacing-sm);
    flex-grow: 1;
    overflow: hidden;
}

.workspace-grid.no-right-panel {
    grid-template-columns: 300px 1fr;
}

.panel {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    overflow-y: auto;
}

/* Scrollbar styling */
.panel::-webkit-scrollbar { width: 6px; }
.panel::-webkit-scrollbar-track { background: transparent; }
.panel::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }
.panel::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); }

.panel-title {
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: var(--spacing-sm);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--glass-border);
}

/* Tree Structure */
.tree-container { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.tree-item { display: flex; flex-direction: column; gap: 4px; }

.tree-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    background: var(--glass-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s ease;
}
.tree-header:hover { background: rgba(255,255,255,0.1); }
.tree-header .bx { transition: transform 0.3s; }
.tree-header.open .bx { transform: rotate(90deg); }

.badge { margin-left: auto; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600; }
.badge.pending { background: var(--pending-bg); color: #9CA3AF; }
.badge.in-progress { background: rgba(59,130,246,0.15); color: #3B82F6; }
.badge.vacaciones-badge { background: var(--success-bg); color: var(--success); }
.badge.descanso-badge { background: rgba(107, 114, 128, 0.4); color: var(--text-secondary); }
.badge.familia-badge { background: rgba(249, 115, 22, 0.2); color: #f97316; }

.hover-highlight { transition: background-color 0.2s; }
.hover-highlight:hover td { background-color: rgba(255, 255, 255, 0.05) !important; }
[data-theme="light"] .hover-highlight:hover td { background-color: rgba(0, 0, 0, 0.05) !important; }
.hover-highlight:hover td:first-child { text-decoration: underline; color: var(--accent-primary) !important; }

.tree-children {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-left: 24px;
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: all 0.3s ease;
}
.tree-children.show { max-height: 500px; opacity: 1; padding-top: 4px; }

.task-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.task-item:hover { background: var(--glass-border); color: var(--text-primary); }
.task-item.active {
    background: rgba(59,130,246,0.05);
    border-color: rgba(59,130,246,0.2);
    color: var(--text-primary);
}

.task-status { margin-left: auto; width: 10px; height: 10px; border-radius: 50%; }
.status-pending { background: var(--pending); }
.status-completed { background: var(--success); box-shadow: 0 0 8px var(--success); }

/* Detail Panel */
.detail-header { display: flex; justify-content: space-between; align-items: center; }

.task-controls {
    background: rgba(0,0,0,0.2);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
}

.status-buttons { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-sm); }

.btn-status {
    flex: 1;
    padding: 12px;
    border: 1px solid var(--glass-border);
    background: transparent;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    font-weight: 500;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.btn-status i { font-size: 20px; }

.btn-status:hover { background: rgba(255,255,255,0.05); }

.btn-status.pending.active { background: var(--pending-bg); border-color: var(--pending); color: var(--text-primary); }
.btn-status.in-progress.active { background: rgba(59,130,246,0.15); border-color: var(--accent-primary); color: var(--accent-primary); }
.btn-status.completed.active { background: var(--success-bg); border-color: var(--success); color: var(--success); }
.btn-status.not-done.active { background: var(--danger-bg); border-color: var(--danger); color: var(--danger); }

.task-form { display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: var(--spacing-md); }
.task-form label { font-size: 14px; font-weight: 500; color: var(--text-secondary); }

.modern-input {
    width: 100%;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 12px;
    color: var(--text-primary);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    min-height: 100px;
    font-family: 'Inter', sans-serif;
    resize: vertical;
}

.modern-input:focus { border-color: var(--accent-primary); box-shadow: var(--shadow-accent); }
select.modern-input { min-height: auto; background-color: var(--bg-panel); color: var(--text-primary); }
select.modern-input option { background-color: #ffffff; color: #000000; }

/* Fix date and time input icons in dark mode */
[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator,
[data-theme="dark"] input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
}

.action-bar { display: flex; justify-content: flex-end; margin-top: var(--spacing-md); }

/* Right Panel (KPIs) */
.kpi-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    background: rgba(0,0,0,0.2);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);
}

.kpi-circle { width: 80px; height: 80px; }
.circular-chart { display: block; margin: 0 auto; max-width: 100%; max-height: 250px; }
.circle-bg { fill: none; stroke: var(--glass-border); stroke-width: 3.8; }
.circle { fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--success); transition: stroke-dasharray 1s ease-out; }
.percentage { fill: var(--text-primary); font-family: 'Inter'; font-size: 8px; font-weight: bold; text-anchor: middle; }

.kpi-stats p { margin-bottom: 4px; font-size: 14px; color: var(--text-secondary); }
.kpi-stats strong { color: var(--text-primary); font-size: 16px; margin-right: 4px; }

.documentation-shortcut { display: flex; flex-direction: column; gap: var(--spacing-sm); margin-top: 20px;}
.documentation-shortcut h3 { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }

.doc-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: var(--glass-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    transition: all 0.2s;
}
.doc-link:hover { background: rgba(255,255,255,0.1); transform: translateX(5px); color: var(--accent-primary); }

/* Modals */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(5px);
    display: none; justify-content: center; align-items: center;
    z-index: 1000; opacity: 0; transition: opacity 0.3s;
}

.modal-overlay.active { display: flex; opacity: 1; pointer-events: auto; }

.modal {
    width: 100%; max-width: 500px;
    padding: var(--spacing-lg);
    display: flex; flex-direction: column; gap: var(--spacing-md);
    transform: translateY(20px); transition: transform 0.3s;
}

.modal-overlay.active .modal { transform: translateY(0); }

.modal-title { font-size: 20px; color: var(--danger); display: flex; align-items: center; gap: 8px; }
.modal-desc { color: var(--text-secondary); font-size: 14px; margin-bottom: 8px; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); margin-top: var(--spacing-md); }
.modal-actions .btn { width: auto; }

/* Realtime Monitor Dashboard Styles */
.monitoreo-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-glass);
}

.monitoreo-card:hover {
    transform: translateY(-5px);
    border-color: var(--accent-primary);
    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.15);
}

.monitoreo-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, var(--accent-primary), var(--success));
    opacity: 0.8;
}

.monitoreo-user-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.monitoreo-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--accent-primary);
}

.monitoreo-details {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}

.monitoreo-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.monitoreo-meta {
    font-size: 11px;
    color: var(--text-secondary);
}

.status-indicator-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
    width: fit-content;
}

.status-online {
    background: rgba(16, 185, 129, 0.15);
    color: var(--success);
}

.status-offline {
    background: rgba(107, 114, 128, 0.15);
    color: var(--text-secondary);
}

.pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--success);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    animation: pulse-ring 1.6s infinite;
}

.pulse-dot.offline {
    background-color: var(--text-secondary);
    animation: none;
    box-shadow: none;
}

@keyframes pulse-ring {
    0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
    }
    100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
}

.progress-container {
    margin-top: var(--spacing-xs);
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.progress-label-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-secondary);
}

.progress-bar-bg {
    width: 100%;
    height: 8px;
    background: var(--glass-border);
    border-radius: 4px;
    overflow: hidden;
}

.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-primary), var(--success));
    border-radius: 4px;
    transition: width 0.5s ease-out;
}

.monitoreo-task-badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    text-transform: uppercase;
}

.monitoreo-task-badge.completed {
    background: var(--success-bg);
    color: var(--success);
}

.monitoreo-task-badge.in-progress {
    background: rgba(59, 130, 246, 0.15);
    color: var(--accent-primary);
}

.monitoreo-task-badge.not-done {
    background: var(--danger-bg);
    color: var(--danger);
}

.monitoreo-task-badge.pending {
    background: var(--pending-bg);
    color: #9CA3AF;
}

/* Stats Cards and Widgets for Realtime Monitoring inside SPA */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    width: 100%;
}

.stat-widget {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    position: relative;
    overflow: hidden;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.stat-widget::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4px;
    width: 100%;
    background: linear-gradient(90deg, var(--accent-primary), var(--success));
}

.stat-widget.warning::after {
    background: linear-gradient(90deg, var(--warning), var(--danger));
}

.stat-widget-details h3 {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 5px;
    margin-top: 0;
}

.stat-widget-details .number {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
}

.stat-widget-icon {
    font-size: 32px;
    color: var(--accent-primary);
    opacity: 0.8;
    background: rgba(59, 130, 246, 0.1);
    padding: 10px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.stat-widget.warning .stat-widget-icon {
    color: var(--warning);
    background: rgba(245, 158, 11, 0.1);
}

/* Filters section for Realtime Monitor */
.filter-section {
    display: flex;
    gap: 15px;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 15px 20px;
    border-radius: var(--radius-md);
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.filter-group {
    display: flex;
    gap: 15px;
    align-items: center;
    flex-wrap: wrap;
    flex-grow: 1;
}

.filter-input-wrapper {
    position: relative;
    flex-grow: 1;
    max-width: 350px;
    min-width: 200px;
}

.filter-input-wrapper i {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    font-size: 18px;
}

.filter-input-wrapper input {
    padding-left: 38px;
    height: 40px;
    width: 100%;
}

.filter-select {
    height: 40px;
    min-width: 160px;
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    padding: 0 10px;
    font-family: inherit;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
}

.filter-select:focus {
    border-color: var(--accent-primary);
}

/* Pulse live indicator */
.pulse-live {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: rgba(16, 185, 129, 0.15);
    color: var(--success);
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.pulse-live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--success);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    animation: pulse-ring 1.6s infinite;
}

```

#### Explicación de Bloques Críticos de `styles.css`:
* **Líneas 1-50 (Paletas de Colores e Identidad Visual)**: Centralización de la identidad visual del proyecto mediante variables CSS (`--bg-primary`, `--glass-bg`, etc.). Permite cambiar radicalmente los colores de toda la aplicación modificando un único bloque. Define la transición suave entre temas oscuros y claros premium.
* **Líneas 68-112 (Bloqueador de Dispositivos)**: Define los estilos de la pantalla bloqueadora móvil `#mobileBlocker`, usando la directiva `@media (max-width: 768px)` para activarla, ocultando el contenedor de la aplicación.
* **Líneas 131-138 (`.glass-panel`)**: Define el estilo Glassmorphism que le otorga a la plataforma su apariencia premium. Utiliza la regla `backdrop-filter: blur(12px)` para crear una dispersión de la luz sobre el fondo y bordes translúcidos con opacidad reducida.
* **Líneas 193-201 (`.nav-item.active`)**: Estilo premium para los elementos activos de la barra de navegación lateral. Aplica un borde izquierdo grueso con color azul acentuado y un gradiente sutil y elegante hacia la derecha.
* **Líneas 253-275 (`.clock`)**: Diseño digital del reloj del sistema superior. Usa fuente monoespaciada para evitar saltos horizontales de texto y aplica un efecto de resplandor mediante la regla `text-shadow: 0 0 10px rgba(59,130,246,0.5)`.
* **Líneas 496-504 (Anillo KPI)**: Estructura del anillo circular SVG que calcula el progreso mediante vectores de trazos dinámicos, aplicando una transición lineal fluida (`transition: stroke-dasharray 1s ease-out`).

---

### J. app.js
El cerebro lógico de Risk Manager. Contiene la autenticación de sesión, el motor de parseo e inyección de datos de archivos de Excel mediante SheetJS, el gestor de la biblioteca interactiva, el motor de actualización en tiempo real de Firebase para notificaciones, permisos y aprobaciones, y la compilación de reportes PDF interactivos con jsPDF.

```javascript
// Auth Check
const currentUserObj = localStorage.getItem('riskOps_currentUser');
if (!currentUserObj && !window.location.href.includes('login.html')) {
    window.location.href = 'login.html';
}

let currentUser = null;
try {
    currentUser = currentUserObj ? JSON.parse(currentUserObj) : null;
} catch(e) {
    localStorage.removeItem('riskOps_currentUser');
    window.location.href = 'login.html';
}
let globalScheduleRows = null;
let globalScheduleBlocks = null;
// Helper to remove accents and normalize names for comparison and file paths
function normalizeName(name) {
    if (!name) return "";
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

// Robust comparison: checks if all words of one name are present in the other
function namesMatch(name1, name2) {
    if (!name1 || !name2) return false;
    const n1 = normalizeName(name1);
    const n2 = normalizeName(name2);
    
    // Split into words and filter out very short ones (like 'de', 'la')
    const words1 = n1.split(/\s+/).filter(w => w.length > 2);
    const words2 = n2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return n1.includes(n2) || n2.includes(n1);

    // Check if all words of the shorter name are in the longer name
    const [shorter, longer] = words1.length <= words2.length ? [words1, n2] : [words2, n1];
    return shorter.every(word => longer.includes(word));
}

// Helpers for date calculations in schedules
function excelToJSDate(serial) {
    if(!serial || isNaN(serial)) return null;
    const epochUTC = Date.UTC(1899, 11, 30);
    return new Date(epochUTC + serial * 86400000);
}

function isSameDate(excelDate, jsDate) {
    if (!excelDate || !jsDate) return false;
    // Compare the UTC date from Excel (which is timezone-naive) with the browser's local date
    return excelDate.getUTCDate()   === jsDate.getDate() &&
           excelDate.getUTCMonth()  === jsDate.getMonth() &&
           excelDate.getUTCFullYear() === jsDate.getFullYear();
}

function getShiftCategory(shiftText) {
    if (!shiftText) return "";
    const clean = shiftText.trim().toLowerCase();
    
    // Exact or partial category matches
    if (clean.includes("manana") || clean.includes("mañana")) return "Mañana";
    if (clean.includes("tarde")) return "Tarde";
    if (clean.includes("noche")) return "Noche";
    if (clean.includes("master")) return "Master";
    
    // Parse time ranges (e.g. "8am - 4pm", "3pm - 11pm", "10pm - 6am")
    // Match the starting hour
    const match = clean.match(/^(\d+)\s*(am|pm)/i);
    if (match) {
        let hour = parseInt(match[1]);
        const ampm = match[2].toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        
        // Define classifications based on starting hour
        if (hour >= 6 && hour < 14) return "Mañana";
        if (hour >= 14 && hour < 22) return "Tarde";
        return "Noche";
    }
    
    return "";
}

function cleanText(text) {
    if (!text || typeof text !== 'string') return "";
    let cleaned = text.toLowerCase();
    cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    cleaned = cleaned.replace(/[^a-z0-9\s]/g, " ");
    cleaned = cleaned.split(/\s+/).join(" ").trim();
    return cleaned;
}

function normalizeTaskName(name) {
    const cleaned = cleanText(name);
    if (cleaned.includes("conciliacion de pasarelas")) {
        return "conciliacion de pasarelas";
    }
    if (cleaned.includes("revision de billetera") || cleaned.includes("billetera usuarios")) {
        return "revision de billetera usuarios pdv";
    }
    if (cleaned.includes("revision de eventos") || cleaned.includes("revision de evento")) {
        return "revision de eventos";
    }
    return cleaned;
}

function taskNamesMatch(cronTask, masterTask) {
    if (!cronTask || !masterTask) return false;
    const normCron = normalizeTaskName(cronTask);
    const normMaster = normalizeTaskName(masterTask);
    return normCron === normMaster || normMaster.includes(normCron) || normCron.includes(normMaster);
}

function setNamesMatch(set1, set2) {
    if (!set1 || !set2) return false;
    const s1 = cleanText(set1);
    const s2 = cleanText(set2);
    return s1 === s2 || s1.includes(s2) || s2.includes(s1);
}

const MONTHS_MAP = {
    "ene": 0, "enero": 0,
    "feb": 1, "febrero": 1,
    "mar": 2, "marzo": 2,
    "abr": 3, "abril": 3,
    "may": 4, "mayo": 4,
    "jun": 5, "junio": 5,
    "jul": 6, "julio": 6,
    "ago": 7, "agosto": 7,
    "sep": 8, "set": 8, "septiembre": 8,
    "oct": 9, "octubre": 9,
    "nov": 10, "noviembre": 10,
    "dic": 11, "diciembre": 11
};

function parseSheetRange(sheetName, year = 2026) {
    if (!sheetName) return null;
    let clean = sheetName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let m = clean.match(/Semana\s+\d+\s*-\s*(\d+)\s+(\w+)\s+al\s+(\d+)\s+(\w+)/i);
    if (m) {
        let startDay = parseInt(m[1], 10);
        let startMStr = m[2].substring(0, 3).toLowerCase();
        let endDay = parseInt(m[3], 10);
        let endMStr = m[4].substring(0, 3).toLowerCase();
        
        let startMonth = MONTHS_MAP[startMStr] !== undefined ? MONTHS_MAP[startMStr] : 0;
        let endMonth = MONTHS_MAP[endMStr] !== undefined ? MONTHS_MAP[endMStr] : 0;
        
        let startDate = new Date(year, startMonth, startDay, 0, 0, 0);
        let endDate = new Date(year, endMonth, endDay, 23, 59, 59);
        return { start: startDate, end: endDate };
    }
    
    m = clean.match(/Semana\s+\d+\s*-\s*(\d+)\s+al\s+(\d+)\s+(\w+)/i);
    if (m) {
        let startDay = parseInt(m[1], 10);
        let endDay = parseInt(m[2], 10);
        let mStr = m[3].substring(0, 3).toLowerCase();
        
        let month = MONTHS_MAP[mStr] !== undefined ? MONTHS_MAP[mStr] : 0;
        let startDate = new Date(year, month, startDay, 0, 0, 0);
        let endDate = new Date(year, month, endDay, 23, 59, 59);
        return { start: startDate, end: endDate };
    }
    
    return null;
}

function getWeekSheet(sheetNames, targetDate) {
    if (!sheetNames || sheetNames.length === 0) return null;
    const year = targetDate.getFullYear();
    for (let name of sheetNames) {
        let r = parseSheetRange(name, year);
        if (r) {
            if (targetDate >= r.start && targetDate <= r.end) {
                return name;
            }
        }
    }
    return sheetNames[sheetNames.length - 1];
}

function getCronogramaColumnsForToday(targetDate, shiftText, rows = []) {
    const day = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    let cols = { manana: [], tarde: [], sabado: [], domingo: [] };
    
    for (let rIdx = 0; rIdx < Math.min(5, rows.length); rIdx++) {
        const row = rows[rIdx];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || "").trim().toLowerCase();
            if (val.includes("mañana") && !val.includes("sabado") && !val.includes("sábado") && !val.includes("domingo") && cols.manana.length === 0) {
                if (c + 1 < row.length) cols.manana = [c, c + 1];
            }
            if (val.includes("tarde") && cols.tarde.length === 0) {
                if (c + 1 < row.length) cols.tarde = [c, c + 1];
            }
            if ((val.includes("sábado") || val.includes("sabado")) && cols.sabado.length === 0) {
                if (c + 1 < row.length) cols.sabado = [c, c + 1];
            }
            if (val.includes("domingo") && cols.domingo.length === 0) {
                if (c + 1 < row.length) cols.domingo = [c, c + 1];
            }
        }
    }
    
    // Fallback si no se encuentran
    if (cols.manana.length === 0) cols.manana = [1, 2];
    if (cols.tarde.length === 0) cols.tarde = [4, 5];
    if (cols.sabado.length === 0) cols.sabado = [7, 8];
    if (cols.domingo.length === 0) cols.domingo = [10, 11];

    if (day === 0) { // Sunday
        return [cols.domingo];
    } else if (day === 6) { // Saturday
        return [cols.sabado];
    } else { // Monday to Friday
        return [cols.manana, cols.tarde];
    }
}

let gestorCronogramaAssignments = null;

async function loadCronogramaAssignments(gestorName, gestorShift) {
    try {
        const url = encodeURI('Cronograma de Tareas/Cronograma Mayo.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fallo al cargar cronograma");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        
        const today = new Date();
        const sheetName = getWeekSheet(workbook.SheetNames, today);
        if (!sheetName) return;
        
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        const colGroups = getCronogramaColumnsForToday(today, gestorShift, rows);
        
        gestorCronogramaAssignments = [];
        
        for (let colGroup of colGroups) {
            const tCol = colGroup[0];
            const gCol = colGroup[1];
            
            let currentSet = "";
            for (let rIdx = 0; rIdx < rows.length; rIdx++) {
                const row = rows[rIdx];
                if (!row) continue;
                
                const taskVal = row[tCol];
                const gestorVal = row[gCol];
                
                if (taskVal !== undefined && taskVal !== null && String(taskVal).trim() !== "") {
                    const tStr = String(taskVal).trim();
                    const tStrLower = tStr.toLowerCase();
                    
                    if (tStrLower.startsWith("set ")) {
                        currentSet = tStr;
                    } else if (!tStrLower.includes("cronograma") && gestorVal !== "Gestor") {
                        if (gestorVal !== undefined && gestorVal !== null && namesMatch(String(gestorVal).trim(), gestorName)) {
                            gestorCronogramaAssignments.push({
                                set: currentSet || "Otros",
                                task: tStr
                            });
                        }
                    }
                }
            }
        }
        console.log("Cargadas asignaciones de cronograma para " + gestorName + ":", gestorCronogramaAssignments);
    } catch (e) {
        console.error("Error al cargar Cronograma de Tareas:", e);
        gestorCronogramaAssignments = [];
    }
}

function getScheduledGestoresCountForShift(shiftName, targetDate = new Date()) {
    if (!globalScheduleRows || !globalScheduleBlocks || globalScheduleBlocks.length === 0) {
        return 0;
    }
    
    let targetBlock = null;
    let targetColIndex = -1;
    
    for (let block of globalScheduleBlocks) {
        const dateRow = globalScheduleRows[block.startRow];
        for (let c = 1; c < dateRow.length; c++) {
            const serial = dateRow[c];
            if (serial && !isNaN(serial)) {
                const cellDate = excelToJSDate(serial);
                if (cellDate && isSameDate(cellDate, targetDate)) {
                    targetBlock = block;
                    targetColIndex = c;
                    break;
                }
            }
        }
        if (targetBlock) break;
    }
    
    if (!targetBlock) {
        targetBlock = globalScheduleBlocks[globalScheduleBlocks.length - 1];
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayRow = globalScheduleRows[targetBlock.startRow + 1];
        const targetDayName = dayNames[targetDate.getDay()];
        
        for (let c = 1; c < dayRow.length; c++) {
            const dayName = String(dayRow[c] || '').trim();
            if (normalizeName(dayName) === normalizeName(targetDayName)) {
                targetColIndex = c;
                break;
            }
        }
        
        if (targetColIndex === -1) {
            let jsDay = targetDate.getDay();
            targetColIndex = jsDay === 0 ? 7 : jsDay;
        }
    }
    
    let count = 0;
    const blockStartRow = targetBlock.startRow;
    for (let rIdx = blockStartRow + 2; rIdx < globalScheduleRows.length; rIdx++) {
        const r = globalScheduleRows[rIdx];
        if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
        
        const rawShift = r[targetColIndex] || 'Descansa';
        const category = getShiftCategory(rawShift);
        if (category === shiftName) {
            count++;
        }
    }
    
    return count;
}

function getShiftForDate(rows, allScheduleBlocks, gestorName, date) {
    if (!rows || rows.length === 0 || !allScheduleBlocks || allScheduleBlocks.length === 0) {
        return 'Por Asignar';
    }
    
    let targetBlock = null;
    let targetColIndex = -1;
    
    for (let block of allScheduleBlocks) {
        const dateRow = rows[block.startRow];
        for (let c = 1; c < dateRow.length; c++) {
            const serial = dateRow[c];
            if (serial && !isNaN(serial)) {
                const cellDate = excelToJSDate(serial);
                if (cellDate && isSameDate(cellDate, date)) {
                    targetBlock = block;
                    targetColIndex = c;
                    break;
                }
            }
        }
        if (targetBlock) break;
    }
    
    if (!targetBlock) {
        targetBlock = allScheduleBlocks[allScheduleBlocks.length - 1];
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayRow = rows[targetBlock.startRow + 1];
        const targetDayName = dayNames[date.getDay()];
        
        for (let c = 1; c < dayRow.length; c++) {
            const dayName = String(dayRow[c] || '').trim();
            if (normalizeName(dayName) === normalizeName(targetDayName)) {
                targetColIndex = c;
                break;
            }
        }
        
        if (targetColIndex === -1) {
            let jsDay = date.getDay();
            targetColIndex = jsDay === 0 ? 7 : jsDay;
        }
    }
    
    const blockStartRow = targetBlock.startRow;
    for (let rIdx = blockStartRow + 2; rIdx < rows.length; rIdx++) {
        const r = rows[rIdx];
        if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
        
        if (namesMatch(r[0], gestorName)) {
            return r[targetColIndex] || 'Descansa';
        }
    }
    
    return 'Por Asignar';
}

// Mapeo de URLs para documentos (especialmente videos pesados alojados en Google Drive)
const documentUrls = {
    "Revisión de Eventos Deportivos.mp4": "https://drive.google.com/file/d/1UqccsnUwTG6tgPcDYdUeLnf9XqvGzSoc/view?usp=sharing",
    "Revisión de Eventos.mp4": "https://drive.google.com/file/d/1SB9ePi1EOJU05hzOsxOyl7BeNvCN1hOh/view?usp=sharing",
    "Validación SEON.mp4": "https://drive.google.com/file/d/1JFf5basGD0gmrAVIy5AlMK1DBHYgE6JC/view?usp=sharing"
};

function getDocUrl(fileName) {
    if (documentUrls[fileName]) {
        return documentUrls[fileName];
    }
    return "Procesos/" + fileName;
}

let taskStateCache = {};
try {
    const cached = localStorage.getItem('riskOps_cache');
    if(cached) taskStateCache = JSON.parse(cached);
} catch(e) {}

let currentActiveTaskId = null;

// Live Clock Logic
function updateClock() {
    const clockElement = document.getElementById('liveClock');
    if (!clockElement) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock(); // Initial call

// Data source real
let allTasks = [];
let currentSelectedTask = null;

// Initialize Excel fetching
async function loadExcelTasks() {
    const container = document.querySelector('.tree-container');
    if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);"><i class="bx bx-loader-alt bx-spin"></i> Cargando Tareas...</div>';
    
    try {
        const url = encodeURI('Tareas Riesgo/Tareas de Riesgo.xlsx') + '?t=' + new Date().getTime();
        const response = await fetch(url);
        if(!response.ok) throw new Error("Error HTTP " + response.status);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Assign ID to all master tasks in json
        json.forEach((row, idx) => {
            row.id = idx;
        });
        
        let processedRows = [];
        
        if (currentUser && currentUser.role === 'Gestor') {
            // Resolve today's real shift from the parsed schedule (globalScheduleRows/globalScheduleBlocks)
            // This ensures the filter uses the actual shift for today, not a stale value from localStorage
            let resolvedShift = currentUser.shift || 'Por Asignar';
            if (globalScheduleRows && globalScheduleBlocks && globalScheduleBlocks.length > 0) {
                const todayShift = getShiftForDate(globalScheduleRows, globalScheduleBlocks, currentUser.name, new Date());
                if (todayShift && todayShift !== 'Por Asignar' && todayShift !== 'Descansa') {
                    resolvedShift = todayShift;
                }
            }
            // Load cronograma assignments using the resolved real shift
            await loadCronogramaAssignments(currentUser.name, resolvedShift);
            
            if (gestorCronogramaAssignments && gestorCronogramaAssignments.length > 0) {
                // Filter the master json rows
                const filteredMasterRows = json.filter(row => {
                    const set = row['Set '] || row['Set'] || 'Otros';
                    const taskName = row['Tarea'];
                    return gestorCronogramaAssignments.some(assign => 
                        taskNamesMatch(assign.task, taskName) && setNamesMatch(assign.set, set)
                    );
                });
                
                // Generate mock tasks for assignments that aren't in the master sheet
                const generatedMocks = [];
                let mockId = 10000;
                gestorCronogramaAssignments.forEach(assign => {
                    const hasMasterMatch = json.some(row => 
                        taskNamesMatch(assign.task, row['Tarea']) && setNamesMatch(assign.set, row['Set '] || row['Set'] || 'Otros')
                    );
                    
                    if (!hasMasterMatch) {
                        const mockRow = {
                            'Set ': assign.set,
                            'Tarea': assign.task,
                            'Detalle de Tarea': `Tarea de control rutinario: ${assign.task}. Realizar las verificaciones correspondientes según los lineamientos de Riesgo.`,
                            'Horario': 'Durante el turno',
                            'Día': 'Diario',
                            'Instrucciones': '1. Realizar la validación de la tarea de acuerdo con el procedimiento estándar.\n2. Registrar cualquier anomalía en los canales oficiales.\n3. Marcar como completada en esta plataforma al finalizar.',
                            'Documento / Video de Apoyo': '',
                            id: mockId++
                        };
                        generatedMocks.push(mockRow);
                    }
                });
                
                processedRows = [...filteredMasterRows, ...generatedMocks];
            } else {
                processedRows = [];
            }
        } else {
            // Admin/Supervisor or other roles see everything
            processedRows = json;
        }
        
        // Transform the data, group by Set
        const tasksBySet = {};
        allTasks = []; // Clear global allTasks
        
        processedRows.forEach((row, index) => {
            const set = row['Set '] || row['Set'] || 'Otros';
            const taskName = row['Tarea'];
            const taskId = row.id !== undefined ? row.id : index;
            
            if (!tasksBySet[set]) tasksBySet[set] = [];
            
            // Check for duplicates in the visual tree
            const isDuplicate = tasksBySet[set].some(t => t.name === taskName);
            
            if (!isDuplicate) {
                tasksBySet[set].push({
                    id: taskId,
                    name: taskName,
                    detail: row['Detalle de Tarea'],
                    time: row['Horario'],
                    day: row['Día']
                });
            }
            allTasks.push({ ...row, id: taskId });
        });
        
        // Populate Set Selector
        const select = document.getElementById('activeSetSelect');
        if(select) {
            select.innerHTML = '<option value="" disabled selected>Selecciona tu SET a trabajar...</option><option value="Todos">Mostrar Todos</option>';
            const setsKeys = Object.keys(tasksBySet).sort();
            setsKeys.forEach(set => {
                select.innerHTML += `<option value="${set}">${set}</option>`;
            });
            
            // Clone select to remove old event listeners
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);
            
            newSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if(val === 'Todos') {
                    renderTree(tasksBySet);
                } else {
                    const filtered = {};
                    filtered[val] = tasksBySet[val];
                    renderTree(filtered);
                }
            });

            if (setsKeys.length === 1) {
                newSelect.value = setsKeys[0];
                const filtered = {};
                filtered[setsKeys[0]] = tasksBySet[setsKeys[0]];
                renderTree(filtered);
            } else if (setsKeys.length === 0) {
                const container = document.querySelector('.tree-container');
                if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">No hay tareas asignadas en tu cronograma para el día de hoy.</div>';
            } else {
                // No renderizar todos por defecto, esperar selección
                const container = document.querySelector('.tree-container');
                if(container) container.innerHTML = '<div style="padding: 20px; color: var(--text-secondary); text-align: center;">Selecciona un SET en el menú desplegable para ver las tareas.</div>';
            }
        }
        
    } catch(err) {
        console.error("Error loading tasks:", err);
        const container = document.querySelector('.tree-container');
        if(container) container.innerHTML = `<div style="padding: 20px; color: var(--danger);"><i class="bx bx-error-circle"></i> Error cargando tareas: ${err.message}</div>`;
    }
}

// Initializar parseo del Horario Personal
async function loadSchedule() {
    try {
        const url = encodeURI('Horario/Horario 2026.xlsx') + '?t=' + Date.now();
        const response = await fetch(url);
        if(!response.ok) throw new Error("Fallo red");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        // Función helper para parsear fechas de Excel a JS
        function formatExcelDate(serial) {
            if(!serial || isNaN(serial)) return "";
            // Usar UTC para evitar problemas de zonas horarias e historia de DST
            const epochUTC = Date.UTC(1899, 11, 30);
            const d = new Date(epochUTC + serial * 86400000);
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            return `${d.getUTCDate()} ${monthNames[d.getUTCMonth()]}`;
        }
        
        let allScheduleBlocks = [];
        if (rows && rows.length > 2) {
            for(let rIdx = 0; rIdx < rows.length; rIdx++) {
                const testRow = rows[rIdx];
                if (!testRow || testRow.length < 2) continue;
                
                if (formatExcelDate(testRow[1]) !== "") {
                    const nextR = rows[rIdx+1];
                    if (nextR && nextR.length > 1 && (nextR[1] === 'Lunes' || nextR[1] === 'Martes')) {
                        // Encontramos un bloque, vamos a ver la fecha inicial y final
                        let firstDate = formatExcelDate(testRow[1]);
                        let lastDate = firstDate;
                        for(let c = 1; c < testRow.length; c++) {
                            if(formatExcelDate(testRow[c])) lastDate = formatExcelDate(testRow[c]);
                        }
                        
                        allScheduleBlocks.push({
                            startRow: rIdx,
                            label: `Semana del ${firstDate} al ${lastDate}`
                        });
                        rIdx++; // Saltar la fila de días
                    }
                }
            }
        }

        globalScheduleRows = rows;
        globalScheduleBlocks = allScheduleBlocks;
        
        if (allScheduleBlocks.length === 0) return; // No hay datos válidos

        const tableHead = document.getElementById('scheduleTableHead');
        const tableBody = document.getElementById('scheduleTableBody');
        
        if(tableHead && tableBody && rows.length > 2) {
            
            const weekSelector = document.getElementById('weekSelector');
            
            // Encontrar el bloque correspondiente a hoy
            let defaultBlockRow = null;
            const today = new Date();
            for (let block of allScheduleBlocks) {
                const dateRow = rows[block.startRow];
                for (let c = 1; c < dateRow.length; c++) {
                    const serial = dateRow[c];
                    if (serial && !isNaN(serial)) {
                        const cellDate = excelToJSDate(serial);
                        if (cellDate && isSameDate(cellDate, today)) {
                            defaultBlockRow = block.startRow;
                            break;
                        }
                    }
                }
                if (defaultBlockRow !== null) break;
            }
            
            if (defaultBlockRow === null) {
                defaultBlockRow = allScheduleBlocks[allScheduleBlocks.length - 1].startRow;
            }
            
            if (weekSelector) {
                weekSelector.innerHTML = '';
                allScheduleBlocks.forEach(block => {
                    weekSelector.innerHTML += `<option value="${block.startRow}">${block.label}</option>`;
                });
                
                weekSelector.value = defaultBlockRow;
                
                weekSelector.addEventListener('change', (e) => {
                    renderScheduleBlock(parseInt(e.target.value));
                });
            }
            
            // Renderizar el bloque inicial
            renderScheduleBlock(defaultBlockRow);
            
            function renderScheduleBlock(blockStartRow) {
                const dateRow = rows[blockStartRow];
                const dayRow = rows[blockStartRow + 1];
                
                let numCols = 0;
                for(let i=1; i<dateRow.length; i++) {
                    if(formatExcelDate(dateRow[i])) numCols = i;
                }
                if(numCols === 0) numCols = 7; // fallback
                
                let headHTML = '<tr style="border-bottom: 1px solid var(--glass-border);">';
                headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadSchedule()' title='Refrescar Horario'></i></th>`;
                for(let i = 1; i <= numCols; i++) {
                    const dayName = dayRow[i] || `Día ${i}`;
                    const dateParsed = formatExcelDate(dateRow[i]);
                    const subText = dateParsed ? `<br><span style="font-size: 11px; font-weight: normal; color: var(--text-secondary);">${dateParsed}</span>` : '';
                    headHTML += `<th style="padding: 12px; color: var(--accent-primary); text-align: center;">${dayName}${subText}</th>`;
                }
                headHTML += '</tr>';
                tableHead.innerHTML = headHTML;
                
                tableBody.innerHTML = '';
                for(let rowIndex = blockStartRow + 2; rowIndex < rows.length; rowIndex++) {
                    const r = rows[rowIndex];
                    if (!r || !r[0] || String(r[0]).trim() === '' || String(r[0]).trim().toUpperCase() === 'GESTOR') break;
                    
                    let isCurrentUser = (currentUser && namesMatch(r[0], currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) continue;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let trHTML = `<tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">`;
                    trHTML += `<td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${r[0]}</td>`;
                    
                    // Encontrar el turno para mostrar en el badge principal (corresponde a hoy)
                    let badgeShift = getShiftForDate(rows, allScheduleBlocks, r[0], new Date());
                    
                    for(let i = 1; i <= numCols; i++) {
                        const shift = r[i] || 'Descansa';
                        
                        let badgeClass = 'pending';
                        const sLower = normalizeName(shift);
                        if(/\d\s*(am|pm)/i.test(shift)) badgeClass = 'in-progress';
                        else if(sLower.includes('vacacion')) badgeClass = 'vacaciones-badge';
                        else if(sLower.includes('descansa')) badgeClass = 'descanso-badge';
                        else if(sLower.includes('familia')) badgeClass = 'familia-badge';
                        
                        trHTML += `<td style="padding: 12px; text-align: center; white-space: nowrap;"><span class="badge ${badgeClass}">${shift}</span></td>`;
                    }
                    
                    if (isCurrentUser && badgeShift) {
                        const userRoleEl = document.getElementById('userRole');
                        if (userRoleEl) userRoleEl.textContent = `${currentUser.role} | Turno: ${badgeShift}`;
                        const headerShiftBadge = document.querySelector('.shift-badge');
                        if (headerShiftBadge) headerShiftBadge.textContent = `TURNO: ${badgeShift}`;
                        
                        // Guardar el turno en currentUser y sincronizar a Firebase
                        if (currentUser.shift !== badgeShift) {
                            currentUser.shift = badgeShift;
                            localStorage.setItem('riskOps_currentUser', JSON.stringify(currentUser));
                            syncActiveSessionToFirebase();
                            loadExcelTasks();
                        }
                    }
                    trHTML += '</tr>';
                    tableBody.innerHTML += trHTML;
                }
            }
        }
        updateGlobalStats();
    } catch(e) {
        console.log("No se pudo cargar el horario", e);
    }
}

function loadTeletrabajo() {
    fetch('Teletrabajo/Teletrabajo.xlsx?v=' + Date.now())
        .then(res => {
            if(!res.ok) throw new Error("No se encontró el archivo de Teletrabajo");
            return res.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1, defval: ""});
            
            let allBlocks = [];
            
            for(let r = 0; r < rows.length; r++) {
                for(let c = 0; c < rows[r].length; c++) {
                    // Bloque mejorado: busca etiquetas claras de calendario
                    const cellVal = String(rows[r][c]).trim();
                    const lowCell = cellVal.toLowerCase();
                    if(lowCell.includes('semana') || lowCell.includes('teletrabajo') || /^\d{1,2}\/\d{1,2}/.test(cellVal)) {
                        let block = {
                            label: cellVal,
                            startRow: r,
                            colIndex: c,
                            data: []
                        };
                        
                        // Buscamos filas debajo de este título que tengan nombres
                        for(let i = r + 1; i < rows.length; i++) {
                            const gestor = rows[i] ? rows[i][c] : null;
                            const dia = rows[i] ? rows[i][c+1] : null;
                            
                            if(!gestor || String(gestor).trim() === '') break;
                            if(String(gestor).trim().toUpperCase() === 'GESTOR') continue; 
                            
                            block.data.push({
                                gestor: String(gestor).trim(),
                                dia: String(dia || '').trim()
                            });
                        }
                        
                        if(block.data.length > 0) allBlocks.push(block);
                    }
                }
            }
            
            if(allBlocks.length === 0) return;
            
            const weekSelector = document.getElementById('teletrabajoWeekSelector');
            const tableHead = document.getElementById('teletrabajoTableHead');
            const tableBody = document.getElementById('teletrabajoTableBody');
            
            if(weekSelector) {
                weekSelector.innerHTML = '';
                allBlocks.forEach((block, idx) => {
                    weekSelector.innerHTML += `<option value="${idx}">${block.label}</option>`;
                });
                
                // Mostrar siempre la última semana disponible al inicio
                let defaultBlockIdx = allBlocks.length - 1;
                
                weekSelector.value = defaultBlockIdx;
                
                weekSelector.addEventListener('change', (e) => {
                    renderTeletrabajoBlock(allBlocks[e.target.value]);
                });
                
                renderTeletrabajoBlock(allBlocks[defaultBlockIdx]);
            }
            
            function renderTeletrabajoBlock(block) {
                tableHead.innerHTML = `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding: 12px; color: var(--accent-primary); text-align: left; position: sticky; left: 0; background: var(--bg-panel); z-index: 2;">GESTOR <i class='bx bx-refresh' style='cursor:pointer; margin-left:5px;' onclick='loadTeletrabajo()' title='Refrescar Teletrabajo'></i></th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">DÍA</th>
                        <th style="padding: 12px; color: var(--accent-primary); text-align: center;">MODALIDAD</th>
                    </tr>
                `;
                
                tableBody.innerHTML = '';
                block.data.forEach(row => {
                    let isCurrentUser = (currentUser && namesMatch(row.gestor, currentUser.name));
                    
                    if (currentUser && currentUser.role === 'Gestor' && !isCurrentUser) return;

                    let bgClass = isCurrentUser ? 'rgba(59,130,246,0.1)' : 'transparent';
                    
                    let isTeletrabajo = row.dia && row.dia.toLowerCase() !== 'nan';
                    let estadoHtml = isTeletrabajo ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">HOME OFFICE</span>` : `<span class="badge pending">PRESENCIAL</span>`;
                    
                    tableBody.innerHTML += `
                        <tr class="hover-highlight" style="border-bottom: 1px solid var(--glass-border); background: ${bgClass};">
                            <td style="padding: 12px; font-weight: 600; text-align: left; color: ${isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)'}; position: sticky; left: 0; background: ${isCurrentUser ? 'var(--bg-dark)' : 'var(--bg-panel)'}; z-index: 1;">${row.gestor}</td>
                            <td style="padding: 12px; text-align: center;">${isTeletrabajo ? row.dia : '-'}</td>
                            <td style="padding: 12px; text-align: center;">${estadoHtml}</td>
                        </tr>
                    `;
                });
            }
        })
        .catch(err => {
            console.error("Error cargando Teletrabajo:", err);
            const tb = document.getElementById('teletrabajoTableBody');
            if(tb) tb.innerHTML = `<tr><td colspan="3" style="padding: 20px; color: var(--danger); text-align: center;">No se pudo cargar Teletrabajo.xlsx o no existe.</td></tr>`;
        });
}

// Cargar Histórico de Permisos desde Firebase
async function loadPermisos() {
    try {
        const snapshot = await database.ref('permissions').once('value');
        const historicoContainer = document.getElementById('historicoPermisosList');
        if(!historicoContainer) return;
        
        historicoContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            let permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
            
            // Filtro de privacidad: Gestor solo ve lo suyo. Admin ve todo.
            if (currentUser && currentUser.role !== 'Admin' && currentUser.role !== 'Supervisor') {
                permisos = permisos.filter(p => p.gestor === currentUser.name);
            }
            
            // Ordenar por ID descendente (más nuevos primero)
            permisos.sort((a,b) => b.id - a.id);
            
            if (permisos.length === 0) {
                historicoContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos en el historial.</p>';
                return;
            }
            
            permisos.forEach(p => {
                let icon = 'bx-time';
                let badgeClass = 'pending';
                if(p.status === 'Aprobado') { badgeClass = 'in-progress'; icon = 'bx-check-double'; }
                if(p.status === 'Rechazado') { badgeClass = 'not-done'; icon = 'bx-x'; }
                
                let rejectionHtml = p.rejectionReason ? `<br><small style="color:var(--danger)">Razón: ${p.rejectionReason}</small>` : '';

                historicoContainer.innerHTML += `
                    <div class="tree-item" style="margin-top: 10px;">
                        <div class="tree-header">
                            <i class='bx ${icon}'></i>
                            <div style="display:flex; flex-direction:column;">
                                <span>${p.tipo}</span>
                                <small style="font-size:11px; opacity:0.7">${p.gestor} | ${p.fecha} (${p.horaInicio} a ${p.horaFin})${rejectionHtml}</small>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-left: auto;">${p.status}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            historicoContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay permisos registrados.</p>';
        }
    } catch(e) {
        console.error("No se pudo cargar permisos desde Firebase", e);
    }
}

function renderTree(tasksBySet) {
    const container = document.querySelector('.tree-container');
    if(!container) return;
    
    container.innerHTML = ''; // clear mock
    
    // Sort keys logically
    const sets = Object.keys(tasksBySet).sort();
    const shouldAutoExpand = sets.length === 1;
    
    sets.forEach(set => {
        const setDiv = document.createElement('div');
        setDiv.className = 'tree-item';
        
        const total = tasksBySet[set].length;
        const headerClass = shouldAutoExpand ? 'tree-header open' : 'tree-header';
        const childrenClass = shouldAutoExpand ? 'tree-children show' : 'tree-children';
        
        setDiv.innerHTML = `
            <div class="${headerClass}" onclick="toggleTree(this)">
                <i class='bx bx-chevron-right'></i>
                <span>${set}</span>
                <span class="badge pending">${total} Tareas</span>
            </div>
            <div class="${childrenClass}">
                ${tasksBySet[set].map(task => {
                    let statusClass = 'status-pending';
                    if (taskStateCache[task.id]) {
                        const statusText = taskStateCache[task.id].status;
                        if (statusText === 'Finalizada') statusClass = 'status-completed';
                        else if (statusText === 'En Proceso') statusClass = 'status-in-progress';
                        else if (statusText === 'No Realizada') statusClass = 'status-not-done';
                    }
                    return `
                    <div class="task-item" onclick="selectTask(${task.id})">
                        <i class='bx bx-file-blank'></i> ${task.name}
                        <div class="task-status ${statusClass}"></div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(setDiv);
    });
    
    // Update KPI whenever tree is rendered
    updateKPI();
}

function syncActiveSessionToFirebase() {
    if (!currentUser || currentUser.role !== 'Gestor') return;
    const uid = currentUser.uid;
    if (!uid) return;

    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    const finalized = completedTasks + notDoneTasks;

    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }

    const sessionRef = database.ref('active_sessions/' + uid);
    
    // Read existing session first to preserve the original loginTime.
    // Using update() instead of set() so we only overwrite what we need.
    // For loginTime: only write it if the node doesn't have one yet (first login of the day).
    sessionRef.once('value').then(snap => {
        const existing = snap.val();
        // Preserve the loginTime from Firebase if it already exists, otherwise use the one from localStorage
        const loginTime = (existing && existing.loginTime) ? existing.loginTime : (currentUser.loginTime || new Date().toISOString());
        
        sessionRef.set({
            name: currentUser.name,
            email: currentUser.email,
            shift: currentUser.shift || 'Por Asignar',
            loginTime: loginTime,
            lastActive: Date.now(),
            totalTasks: totalTasks,
            finalizedTasks: finalized,
            percentage: percentage,
            tasks: taskStateCache || {}
        }).catch(e => console.error("Error syncing active session to Firebase:", e));
    }).catch(e => console.error("Error reading session from Firebase:", e));
}

function updateKPI() {
    const totalTasks = document.querySelectorAll('.task-item').length;
    const completedTasks = document.querySelectorAll('.task-item .status-completed').length;
    const notDoneTasks = document.querySelectorAll('.task-item .status-not-done').length;
    
    // Finalizadas = completed + not-done
    const finalized = completedTasks + notDoneTasks; 
    const pending = totalTasks - finalized;
    
    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((finalized / totalTasks) * 100);
    }
    
    const kpiContainer = document.querySelector('.kpi-card');
    if (kpiContainer) {
        kpiContainer.innerHTML = `
            <div class="kpi-circle">
                <svg viewBox="0 0 36 36" class="circular-chart" style="width: 100%; height: 100%;">
                    <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke: var(--glass-border); stroke-width: 3.8;"/>
                    <path class="circle" stroke-dasharray="${percentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style="fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--success); transition: stroke-dasharray 1s ease-out;"/>
                    <text x="18" y="20.35" class="percentage" style="fill: var(--text-primary); font-family: 'Inter'; font-size: 8px; font-weight: bold; text-anchor: middle;">${percentage}%</text>
                </svg>
            </div>
            <div class="kpi-stats">
                <p><strong>${totalTasks}</strong> Tareas Asignadas</p>
                <p><strong>${finalized}</strong> Finalizadas</p>
                <p><strong>${pending}</strong> Pendientes</p>
            </div>
        `;
    }

    // Sincronizar sesión activa si es gestor
    if (currentUser && currentUser.role === 'Gestor') {
        syncActiveSessionToFirebase();
    }
}

function toggleTree(element) {
    element.classList.toggle('open');
    const childrenContainer = element.nextElementSibling;
    if (childrenContainer) {
        childrenContainer.classList.toggle('show');
    }
}

// Renderizar documentos en el panel de accesos rápidos
function renderQuickDocs(selectedTaskName) {
    const container = document.getElementById('quickDocsList');
    if (!container) return;

    const archivos = [
        "Instructivo de revisión de apuestas casino.pdf",
        "Instructivo de validación de GGR Casino.pdf",
        "Política Procedimiento De Aprobación De Retiros.pdf",
        "Procedimiento Identificación de jineteo.pdf",
        "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
        "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
        "Revisión de Eventos Deportivos.mp4",
        "Revisión de Eventos.mp4",
        "Validación SEON.mp4"
    ];

    let matchedDoc = null;
    if (selectedTaskName) {
        const taskNameLower = selectedTaskName.toLowerCase();
        if (taskNameLower.includes('ggr')) matchedDoc = "Instructivo de validación de GGR Casino.pdf";
        else if (taskNameLower.includes('apuesta')) matchedDoc = "Instructivo de revisión de apuestas casino.pdf";
        else if (taskNameLower.includes('retiro')) matchedDoc = "Política Procedimiento De Aprobación De Retiros.pdf";
        else if (taskNameLower.includes('jineteo') || taskNameLower.includes('jineteo')) matchedDoc = "Procedimiento Identificación de jineteo.pdf";
        else if (taskNameLower.includes('eliminaci')) matchedDoc = "Proceso de Eliminación de Cuentas - Implementaciones.pdf";
        else if (taskNameLower.includes('bonos')) matchedDoc = "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf";
        else if (taskNameLower.includes('deportiv')) matchedDoc = "Revisión de Eventos Deportivos.mp4";
        else if (taskNameLower.includes('evento')) matchedDoc = "Revisión de Eventos.mp4";
        else if (taskNameLower.includes('seon')) matchedDoc = "Validación SEON.mp4";
    }

    container.innerHTML = '';

    // Si hay un documento que coincide, mostrarlo destacado arriba
    if (matchedDoc) {
        const isVideo = matchedDoc.toLowerCase().endsWith('.mp4');
        const isWord = matchedDoc.toLowerCase().endsWith('.docx') || matchedDoc.toLowerCase().endsWith('.doc');
        const isExcel = matchedDoc.toLowerCase().endsWith('.xlsx') || matchedDoc.toLowerCase().endsWith('.xls');
        
        let icon = 'bx-file-pdf';
        let color = '#FF5A5A'; // PDF red
        
        if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
        else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
        else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

        container.innerHTML += `
            <div style="margin-bottom: 12px; background: rgba(0, 180, 216, 0.1); padding: 10px; border-radius: var(--radius-md); border: 1px dashed var(--accent-primary);">
                <span style="font-size: 10px; color: var(--accent-primary); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                    <i class='bx bxs-star'></i> Sugerido para esta tarea
                </span>
                <a href="${getDocUrl(matchedDoc)}" target="_blank" class="doc-link" style="background: transparent; padding: 0; display: flex; align-items: center; gap: 10px;">
                    <i class='bx ${icon}' style="font-size: 20px; color: ${color};"></i>
                    <span style="color: var(--text-primary); font-weight: 500; font-size: 13px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${matchedDoc.replace(/\.[^/.]+$/, "")}</span>
                </a>
            </div>
            <div style="height: 1px; background: var(--glass-border); margin: 10px 0;"></div>
        `;
    }

    // Listar todos los demás documentos
    archivos.forEach(file => {
        if (file === matchedDoc) return; // Omitir el destacado ya listado

        const isVideo = file.toLowerCase().endsWith('.mp4');
        const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
        const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
        
        let icon = 'bx-file-pdf';
        let color = '#FF5A5A'; // PDF red
        
        if (isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
        else if (isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
        else if (isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

        container.innerHTML += `
            <a href="${getDocUrl(file)}" target="_blank" class="doc-link" style="margin-bottom: 8px;">
                <i class='bx ${icon}' style="font-size: 18px; color: ${color};"></i>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">${file.replace(/\.[^/.]+$/, "")}</span>
            </a>
        `;
    });
}

// Global scope logic for onclick elements
window.selectTask = function(taskId) {
    currentActiveTaskId = taskId;
    // Remove active
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('active'));
    // Add active
    const eventTarget = window.event && window.event.currentTarget;
    if(eventTarget) eventTarget.classList.add('active');
    
    const task = allTasks.find(t => t.id === taskId);
    if(task) {
        const titleElement = document.getElementById('currentTaskTitle');
        if (titleElement) titleElement.textContent = task['Tarea'];
        currentSelectedTask = task;
        
        // Renderizar accesos rápidos destacando el documento de esta tarea
        renderQuickDocs(task['Tarea']);
        
        // Populate instructions text area if we want to
        const textArea = document.getElementById('taskObservation');
        
        if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Supervisor')) {
            if (textArea) {
                // Show task detail and instructions for admin/supervisor review
                let detailText = `Detalle: ${task['Detalle de Tarea'] || 'Sin detalle'}\n\n`;
                detailText += `Horario: ${task['Horario'] || 'No especificado'}\n`;
                detailText += `Día: ${task['Día'] || 'No especificado'}\n\n`;
                detailText += `Instrucciones:\n${task['Instrucciones'] || 'Sin instrucciones'}`;
                textArea.value = detailText;
            }
        } else {
            if(textArea) {
               textArea.value = task['Detalle de Tarea'] || "";
            }

            // Restore from cache if exists
            document.querySelectorAll('.btn-status').forEach(el => el.classList.remove('active'));
            if(taskStateCache[taskId]) {
                if(textArea) textArea.value = taskStateCache[taskId].observation;
                
                const cachedStatus = taskStateCache[taskId].status;
                let found = false;
                document.querySelectorAll('.btn-status').forEach(el => {
                    if(el.textContent.trim() === cachedStatus) {
                        el.classList.add('active');
                        found = true;
                    }
                });
                if(!found) document.querySelector('.btn-status.pending').classList.add('active');
            } else {
                if(textArea) textArea.value = ""; // Limpiar nota de otras tareas
                document.querySelector('.btn-status.pending').classList.add('active');
            }
        }
    }
}

// Task Status Buttons Interaction
async function initApp() {
    // Carga de Excel Inicial
    try {
        await loadSchedule();
    } catch(e) {
        console.error("Error al cargar el horario en la inicialización:", e);
    }
    
    try {
        await loadExcelTasks();
    } catch(e) {
        console.error("Error al cargar las tareas en la inicialización:", e);
    }
    
    loadTeletrabajo();
    loadPermisos();
    renderQuickDocs(null);

    // Theme logic
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        const savedTheme = localStorage.getItem('riskOps_theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        themeToggleBtn.innerHTML = savedTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
        
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('riskOps_theme', newTheme);
            themeToggleBtn.innerHTML = newTheme === 'dark' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
        });
    }

    // Populate user UI
    if (currentUser) {
        const userNameEl = document.querySelector('.user-name');
        const roleEl = document.querySelector('.user-role');
        const shiftBadgeEl = document.querySelector('.shift-badge');
        
        if (userNameEl) userNameEl.textContent = currentUser.name;
        if (roleEl) roleEl.textContent = currentUser.role;
        if (shiftBadgeEl) shiftBadgeEl.textContent = 'Turno ' + currentUser.shift;
        
        const avatarEl = document.querySelector('.avatar');
        if (avatarEl && currentUser.name) {
            const availableAvatars = [
                "Alexander Villada.png",
                "Camilo Espinosa.png",
                "Daniel Benavidez.png",
                "Josue Alvarez.png",
                "Juan Jose Diaz.png",
                "Maria Sanchez.png",
                "Marilyn Jimenez.png",
                "Oriana Borja.png",
                "Samuel Cruz.png",
                "Sara Santamaria.png",
                "Sebastian Arango.png",
                "Sebastian Hincapie.png",
                "Yefferson Giraldo.png"
            ];
            
            const fullName = currentUser.name.trim();
            // Buscar una imagen que coincida con el nombre registrado
            let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
            console.log("DEBUG_AVATAR: fullName =", fullName, "matchedAvatar =", matchedAvatar);
            
            if (matchedAvatar) {
                avatarEl.src = `assets/src/img/${matchedAvatar}`;
                // Fallback por si la imagen se borra o falla
                avatarEl.onerror = function() {
                    this.onerror = null;
                    this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
                };
            } else {
                avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
            }
        }

        if (currentUser.role === 'Gestor') {
            syncActiveSessionToFirebase();
            setInterval(syncActiveSessionToFirebase, 30000);
        }

        // Setup programmatical sidebar ordering for roles
        setupSidebar();

        // Show Aprobaciones tab for Supervisor/Admin
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const navAprobaciones = document.getElementById('navAprobaciones');
            const navTurnos = document.getElementById('navTurnos');
            const navMonitoreo = document.getElementById('navMonitoreo');
            const navWorkspace = document.getElementById('navWorkspace');
            const viewWorkspace = document.getElementById('view-workspace');
            const viewAprobaciones = document.getElementById('view-aprobaciones');
            const viewTurnos = document.getElementById('view-turnos');
            const permissionForm = document.getElementById('permissionForm');
            const endShiftBtn = document.getElementById('endShiftBtn');

            if(navAprobaciones) navAprobaciones.style.display = 'flex';
            if(navTurnos) navTurnos.style.display = 'flex';
            if(navMonitoreo) navMonitoreo.style.display = 'flex';
            if(navWorkspace) navWorkspace.style.display = 'flex'; // Keep Mis Tareas visible
            
            // Ocultar el panel de Progreso del Turno / Documentos de Acceso Rápido en Mis Tareas para Admin o Supervisor
            const rightPanel = document.querySelector('.right-panel');
            if (rightPanel) rightPanel.style.display = 'none';
            const workspaceGrid = document.querySelector('.workspace-grid');
            if (workspaceGrid) workspaceGrid.classList.add('no-right-panel');

            // Restringir el panel de tareas para Admin/Supervisor (solo lectura)
            const taskControls = document.querySelector('.task-controls');
            if (taskControls) taskControls.style.display = 'none';
            const actionBar = document.querySelector('.action-bar');
            if (actionBar) actionBar.style.display = 'none';
            const taskObservation = document.getElementById('taskObservation');
            if (taskObservation) {
                taskObservation.readOnly = true;
                taskObservation.placeholder = "Detalles de la tarea...";
            }

            // Forzar vista de Monitoreo Realtime como inicial
            const viewMonitoreo = document.getElementById('view-monitoreo');
            if (viewMonitoreo && navMonitoreo) {
                document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');
                viewMonitoreo.style.display = 'block';
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                navMonitoreo.classList.add('active');
            }

            // Iniciar sincronización en tiempo real para Monitoreo
            startActiveSessionsListener();
            populateGestoresDropdown();

            // Listeners for Monitoreo filters
            const searchInput = document.getElementById('monitoreoSearchInput');
            const shiftSelect = document.getElementById('filterShiftSelect');
            const statusSelect = document.getElementById('filterStatusSelect');
            const clearMonitoreoFiltersBtn = document.getElementById('clearMonitoreoFiltersBtn');

            if (searchInput) searchInput.addEventListener('change', renderActiveSessionsDashboard);
            if (shiftSelect) shiftSelect.addEventListener('change', renderActiveSessionsDashboard);
            if (statusSelect) statusSelect.addEventListener('change', renderActiveSessionsDashboard);

            if (clearMonitoreoFiltersBtn) {
                clearMonitoreoFiltersBtn.addEventListener('click', () => {
                    if (searchInput) searchInput.value = '';
                    if (shiftSelect) shiftSelect.value = '';
                    if (statusSelect) statusSelect.value = '';
                    renderActiveSessionsDashboard();
                });
            }

            // Close Monitoreo modal listeners
            const closeBtn = document.getElementById('closeMonitoreoModalBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    const modal = document.getElementById('monitoreoModal');
                    if (modal) modal.classList.remove('active');
                });
            }
            const modalOverlay = document.getElementById('monitoreoModal');
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        modalOverlay.classList.remove('active');
                    }
                });
            }
            
            // Ocultar formulario de pedir permiso
            const crearPermisoPanel = document.getElementById('crearPermisoPanel');
            const permisosLayout = document.getElementById('permisosLayout');
            if(crearPermisoPanel) crearPermisoPanel.style.display = 'none';
            if(permisosLayout) permisosLayout.style.gridTemplateColumns = '1fr';
            if(permissionForm) permissionForm.style.display = 'none';
            
            // Cambiar Finalizar Turno por Cerrar Sesión
            if(endShiftBtn) {
                endShiftBtn.innerHTML = "<i class='bx bx-log-out'></i> Cerrar Sesión";
                endShiftBtn.onclick = function(e) {
                    e.preventDefault();
                    if(confirm("¿Seguro que deseas cerrar sesión?")) {
                        localStorage.removeItem('riskOps_currentUser');
                        firebase.auth().signOut().catch(err => console.error(err));
                        window.location.href = 'login.html';
                    }
                };
            }
            
            // Ocultar el badge del turno para Admin/Supervisor
            const headerShiftBadgeAdmin = document.querySelector('.shift-badge');
            if (headerShiftBadgeAdmin) headerShiftBadgeAdmin.style.display = 'none';

            renderPendingUsers();
            
            const notifList = document.getElementById('notificationList');
            const notifCount = document.getElementById('notificationCount');

            database.ref('permissions').on('value', (snapshot) => {
                let unreadCount = 0;
                let notifsHtml = '';
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const perms = Object.keys(data).map(k => ({...data[k], fb_id: k}));
                    const pending = perms.filter(p => p.status === 'Pendiente');
                    pending.sort((a,b) => b.id - a.id);
                    
                    pending.forEach(p => {
                        if (p.notified_admin === false) unreadCount++;
                        let bg = p.notified_admin === false ? 'rgba(59,130,246,0.1)' : 'transparent';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navAprobaciones').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx bx-time' style="color: var(--warning); font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Nuevo Permiso Solicitado</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${p.gestor} - ${p.tipo}</div>
                                </div>
                            </div>
                        `;
                    });
                }
                
                if (notifsHtml === '') {
                    notifList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
                } else {
                    notifList.innerHTML = notifsHtml;
                }
                
                if (unreadCount > 0) {
                    notifCount.textContent = unreadCount;
                    notifCount.style.display = 'block';
                } else {
                    notifCount.style.display = 'none';
                }
            });
            
        } else {
            // Escuchar notificaciones en tiempo real para el Gestor
            const notifList = document.getElementById('notificationList');
            const notifCount = document.getElementById('notificationCount');

            database.ref('permissions').orderByChild('gestor').equalTo(currentUser.name).on('value', (snapshot) => {
                let unreadCount = 0;
                let notifsHtml = '';
                
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const perms = Object.keys(data).map(k => ({...data[k], fb_id: k}));
                    // Solo finalizados
                    const finished = perms.filter(p => p.status !== 'Pendiente');
                    finished.sort((a,b) => b.id - a.id);
                    
                    finished.forEach(p => {
                        if (p.notified === false) unreadCount++;
                        let bg = p.notified === false ? 'rgba(59,130,246,0.1)' : 'transparent';
                        let iconColor = p.status === 'Aprobado' ? 'var(--success)' : 'var(--danger)';
                        let icon = p.status === 'Aprobado' ? 'bx-check-double' : 'bx-x';
                        let reasonHtml = p.rejectionReason ? `<div style="font-size:11px; color:var(--danger); margin-top:2px;">Razón: ${p.rejectionReason}</div>` : '';
                        
                        notifsHtml += `
                            <div style="background: ${bg}; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); display: flex; gap: 10px; align-items: start; cursor: pointer; transition: background 0.2s;" onclick="document.getElementById('navPermisos').click(); document.getElementById('notificationDropdown').style.display = 'none';">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px; margin-top: 2px;"></i>
                                <div style="flex-grow: 1;">
                                    <div style="font-size: 12px; font-weight: 500; color: var(--text-primary);">Permiso ${p.status}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary);">${p.fecha} (${p.horaInicio} a ${p.horaFin})</div>
                                    ${reasonHtml}
                                </div>
                            </div>
                        `;
                    });
                }
                
                if (notifsHtml === '') {
                    notifList.innerHTML = '<p style="font-size: 12px; color: var(--text-secondary); text-align: center; padding: 10px;">No tienes notificaciones nuevas.</p>';
                } else {
                    notifList.innerHTML = notifsHtml;
                }
                
                if (unreadCount > 0) {
                    notifCount.textContent = unreadCount;
                    notifCount.style.display = 'block';
                } else {
                    notifCount.style.display = 'none';
                }
            });
        }
    }

    const statusBtns = document.querySelectorAll('.btn-status');
    statusBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Only toggle if it's not the 'No Realizada', as it opens a modal
            if(!this.classList.contains('not-done')) {
                statusBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Help Button (Instructivo)
    const helpBtn = document.getElementById('helpBtn');
    if(helpBtn) {
        helpBtn.addEventListener('click', () => {
            if(!currentSelectedTask) {
                alert("Selecciona una tarea primero.");
                return;
            }
            
            const taskName = (currentSelectedTask['Tarea'] || currentSelectedTask.name || '').toLowerCase();
            const archivos = [
                "Instructivo de revisión de apuestas casino.pdf",
                "Instructivo de validación de GGR Casino.pdf",
                "Política Procedimiento De Aprobación De Retiros.pdf",
                "Procedimiento Identificación de jineteo.pdf",
                "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
                "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
                "Revisión de Eventos Deportivos.mp4",
                "Revisión de Eventos.mp4",
                "Validación SEON.mp4"
            ];
            
            let matchedDoc = null;
            if (taskName.includes('ggr')) matchedDoc = "Instructivo de validación de GGR Casino.pdf";
            else if (taskName.includes('apuesta')) matchedDoc = "Instructivo de revisión de apuestas casino.pdf";
            else if (taskName.includes('retiro')) matchedDoc = "Política Procedimiento De Aprobación De Retiros.pdf";
            else if (taskName.includes('jineteo')) matchedDoc = "Procedimiento Identificación de jineteo.pdf";
            else if (taskName.includes('eliminaci')) matchedDoc = "Proceso de Eliminación de Cuentas - Implementaciones.pdf";
            else if (taskName.includes('bonos')) matchedDoc = "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf";
            else if (taskName.includes('deportiv')) matchedDoc = "Revisión de Eventos Deportivos.mp4";
            else if (taskName.includes('evento')) matchedDoc = "Revisión de Eventos.mp4";
            else if (taskName.includes('seon')) matchedDoc = "Validación SEON.mp4";
            
            if (matchedDoc) {
                window.open(getDocUrl(matchedDoc), "_blank");
            } else {
                alert("No se encontró un documento específico para esta tarea. Por favor, búscalo en la pestaña Documentación.");
            }
        });
    }

    // Listeners para filtros de historial de turnos
    const filterGestorInput = document.getElementById('filterGestorInput');
    const filterFechaInput = document.getElementById('filterFechaInput');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (filterGestorInput) filterGestorInput.addEventListener('input', applyShiftReportsFilters);
    if (filterFechaInput) filterFechaInput.addEventListener('change', applyShiftReportsFilters);
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (filterGestorInput) filterGestorInput.value = '';
            if (filterFechaInput) filterFechaInput.value = '';
            applyShiftReportsFilters();
        });
    }

    // Navegación de Vistas (Tabs)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Evitar redirigir erróneamente en el botón soporte real
            if(item.id === 'navSoporte' || item.textContent.includes('Soporte')) {
                alert("Redirigiendo al IT HelpDesk...");
                return;
            }

            // UI
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Ocultar todas las vistas
            document.querySelectorAll('.view-panel').forEach(v => v.style.display = 'none');

            // Mostrar la correcta
            if (item.id === 'navWorkspace') {
                document.getElementById('view-workspace').style.display = 'block';
            } else if (item.id === 'navHorario') {
                document.getElementById('view-horario').style.display = 'block';
            } else if (item.id === 'navTeletrabajo') {
                document.getElementById('view-teletrabajo').style.display = 'block';
            } else if (item.id === 'navDocs') {
                document.getElementById('view-docs').style.display = 'block';
            } else if (item.id === 'navPermisos') {
                document.getElementById('view-permisos').style.display = 'block';
            } else if (item.id === 'navTurnos') {
                document.getElementById('view-turnos').style.display = 'block';
                renderShiftReports();
            } else if (item.id === 'navAprobaciones') {
                document.getElementById('view-aprobaciones').style.display = 'block';
                renderPendingUsers();
                renderPendingPermissions();
            } else if (item.id === 'navMonitoreo') {
                const viewMonitoreo = document.getElementById('view-monitoreo');
                if (viewMonitoreo) viewMonitoreo.style.display = 'block';
                renderActiveSessionsDashboard();
                updateGlobalStats();
            }
        });
    });

    // Inyectar documentos reales de la carpeta "Procesos" en el Módulo de Docs
    const docsGrid = document.querySelector('.docs-grid');
    if(docsGrid) {
        const archivos = [
            "Instructivo de revisión de apuestas casino.pdf",
            "Instructivo de validación de GGR Casino.pdf",
            "Política Procedimiento De Aprobación De Retiros.pdf",
            "Procedimiento Identificación de jineteo.pdf",
            "Proceso de Eliminación de Cuentas - Implementaciones.pdf",
            "VALIDACIÓN DE ABUSO DE BONOS EN CAMPAÑAS DE CRM.pdf",
            "Revisión de Eventos Deportivos.mp4",
            "Revisión de Eventos.mp4",
            "Validación SEON.mp4"
        ];

        archivos.forEach(file => {
            const isVideo = file.toLowerCase().endsWith('.mp4');
            const isWord = file.toLowerCase().endsWith('.docx') || file.toLowerCase().endsWith('.doc');
            const isExcel = file.toLowerCase().endsWith('.xlsx') || file.toLowerCase().endsWith('.xls');
            
            let icon = 'bx-file-pdf';
            let color = '#FF5A5A'; // PDF red
            
            if(isVideo) { icon = 'bx-video'; color = '#3B82F6'; }
            else if(isWord) { icon = 'bx-file-blank'; color = '#2563EB'; } // Word blue
            else if(isExcel) { icon = 'bx-table'; color = '#10B981'; } // Excel green

            docsGrid.innerHTML += `
                <a href="${getDocUrl(file)}" target="_blank" class="glass-panel" style="padding: 20px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; transition: transform 0.2s;">
                    <i class='bx ${icon}' style="font-size: 40px; color: ${color};"></i>
                    <span style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${file.replace(/\.[^/.]+$/, "")}</span>
                </a>
            `;
        });
    }

    // Poblar nombre en form de permisos y manejar envío por AJAX
    if(currentUser) {
        const pName = document.getElementById('permisoGestorName');
        if(pName) pName.value = currentUser.name;
    }
    
    // Botón de guardar progreso en tarea
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if(saveTaskBtn) {
        saveTaskBtn.addEventListener('click', () => {
            const selectedStatusBtn = document.querySelector('.btn-status.active');
            
            // Validación obligatoria para todas las tareas
            const obsField = document.getElementById('taskObservation');
            if(!obsField || !obsField.value.trim()) {
                alert("OBLIGATORIO: Debes detallar la gestión realizada en las Notas Técnicas antes de guardar.");
                return;
            }

            const btn = saveTaskBtn;
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Guardando...";
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = "<i class='bx bx-check'></i> Guardado Exitosamente";
                btn.classList.add('btn-success');
                
                // Actualizar estado visual de la tarea activa en el árbol
                const activeTask = document.querySelector('.task-item.active .task-status');
                const selectedStatusBtn = document.querySelector('.btn-status.active');
                
                if(activeTask && selectedStatusBtn) {
                    // Limpiar clases anteriores
                    activeTask.classList.remove('status-pending', 'status-completed', 'status-not-done', 'status-in-progress');
                    
                    if(selectedStatusBtn.classList.contains('completed')) {
                        activeTask.classList.add('status-completed');
                    } else if(selectedStatusBtn.classList.contains('in-progress')) {
                        activeTask.classList.add('status-in-progress');
                    } else if(selectedStatusBtn.classList.contains('not-done')) {
                        activeTask.classList.add('status-not-done');
                    } else {
                        activeTask.classList.add('status-pending');
                    }
                    
                    // Save to cache
                    const obsValue = document.getElementById('taskObservation') ? document.getElementById('taskObservation').value : '';
                    if(currentActiveTaskId !== null) {
                        taskStateCache[currentActiveTaskId] = {
                            name: currentSelectedTask ? currentSelectedTask['Tarea'] : 'Tarea ' + currentActiveTaskId,
                            status: selectedStatusBtn.textContent.trim(),
                            observation: obsValue
                        };
                        localStorage.setItem('riskOps_cache', JSON.stringify(taskStateCache));
                    }
                    
                    updateKPI();
                }

                setTimeout(() => {
                    btn.innerHTML = prevText;
                    btn.disabled = false;
                    btn.classList.remove('btn-success');
                }, 2000);
            }, 800);
        });
    }

    const pForm = document.getElementById('permisosForm');
    
    // Toggle para la opción "Otro"
    const pSelect = document.getElementById('tipoPermisoSelect');
    const pOtroCont = document.getElementById('otroPermisoContainer');
    const pOtroInp = document.getElementById('otroPermisoInput');
    if(pSelect && pOtroCont && pOtroInp) {
        pSelect.addEventListener('change', (e) => {
            if(e.target.value === 'Otro') {
                pOtroCont.style.display = 'block';
                pOtroInp.required = true;
            } else {
                pOtroCont.style.display = 'none';
                pOtroInp.required = false;
                pOtroInp.value = '';
            }
        });
    }

    if(pForm) {
        pForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Evitar recarga
            
            const formData = new FormData(pForm);
            formData.append("_cc", "sara.santamaria@virtualsoft.tech");
            
            const tipo = formData.get("Tipo_Permiso");
            const especifico = formData.get("Especificacion_Otro");
            const finalTipo = tipo === 'Otro' ? `Otro (${especifico})` : tipo;

            const newPermiso = {
                id: Date.now(),
                gestor: formData.get("Gestor"),
                tipo: finalTipo,
                fecha: formData.get("Fecha"),
                horaInicio: formData.get("Hora_Inicio"),
                horaFin: formData.get("Hora_Fin"),
                motivo: formData.get("Justificacion"),
                status: 'Pendiente',
                notified: false,
                notified_admin: false
            };
            
            const btn = pForm.querySelector('button[type="submit"]');
            const prevText = btn.innerHTML;
            btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Enviando solicitud...";
            btn.disabled = true;

            try {
                await database.ref('permissions').push(newPermiso);
            } catch(e) {
                console.error("Error Firebase local", e);
            }

            fetch(pForm.action, {
                method: pForm.method,
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if(response.ok) {
                    alert('¡Permiso solicitado exitosamente! Está pendiente de aprobación.');
                    pForm.reset();
                    if(currentUser) pForm.querySelector('#permisoGestorName').value = currentUser.name;
                    loadPermisos(); // Refresh local permissions UI if they are an admin looking at it
                } else {
                    alert('Hubo un error contactando el servidor de correos.');
                }
            }).catch(err => {
                alert('No hay Internet. Se simula envío exitoso.');
            }).finally(() => {
                btn.innerHTML = prevText;
                btn.disabled = false;
            });
        });
    }
}

// Lógica explícita para el botón (llamado desde onclick en html)
function handleEndShift() {
    if(confirm("¿Estás seguro que deseas finalizar tu turno actual? Se enviará un resumen al supervisor.")) {
        
        let currentUser = null;
        try { currentUser = JSON.parse(localStorage.getItem('riskOps_currentUser')); } catch(e) {}
        
        if (currentUser) {
            // Build task report
            const setSelect = document.getElementById('activeSetSelect');
            if(setSelect && setSelect.value === 'Todos') {
                alert("OBLIGATORIO: Debes seleccionar el SET específico en el que trabajaste antes de finalizar el turno (Arriba a la derecha).");
                return;
            }

            const formData = new FormData();
            
            // Format login time
            const loginDate = new Date(currentUser.loginTime);
            
            formData.append("Usuario", currentUser.name);
            formData.append("Rol", currentUser.role);
            formData.append("Reporte", "CIERRE DE TURNO Y RESUMEN DE TAREAS");
            formData.append("Hora_Inicio_Turno", loginDate.toLocaleString());
            formData.append("Hora_Fin_Turno", new Date().toLocaleString());
            
            if(setSelect) {
                formData.append("SET_Principal_Trabajado", setSelect.value);
            }
            
            formData.append("_subject", `Reporte de Turno: ${currentUser.name}`);
            formData.append("_captcha", "false");
            formData.append("_cc", "sara.santamaria@virtualsoft.tech");
            
            // Build task report
            let report = "";
            let keys = Object.keys(taskStateCache);
            if(keys.length === 0) {
                report = "El gestor no marcó ninguna tarea explícitamente durante este turno.";
            } else {
                keys.forEach(id => {
                    let t = taskStateCache[id];
                    report += `\n[ ${t.status.toUpperCase()} ] - ${t.name}\nObservación: ${t.observation || 'N/A'}\n`;
                });
            }
            formData.append("Resumen_de_Tareas", report);
            
            // Reemplazar texto del botón para feedback visual
            const btn = document.getElementById('endShiftBtn');
            const prevHtml = btn ? btn.innerHTML : '';
            if(btn) {
                btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Notificando...";
                btn.disabled = true;
            }

            // --- RESPALDO SEGURO EN FIREBASE ---
            const shiftReportObject = {
                gestor: currentUser.name,
                rol: currentUser.role,
                horaInicio: loginDate.toLocaleString(),
                horaFin: new Date().toLocaleString(),
                setTrabajado: setSelect ? setSelect.value : 'N/A',
                reporte: report,
                timestamp: Date.now()
            };

            // Intentamos guardar en firebase pero no bloqueamos el flujo si hay error
            database.ref('shift_reports').push(shiftReportObject).catch(e => console.error("Firebase backup failed", e));

            // Eliminar sesión activa de Firebase
            if (currentUser.uid) {
                database.ref('active_sessions/' + currentUser.uid).remove().catch(e => console.error("Error removing active session on shift end:", e));
            }

            // Antes de enviar, limpiamos la sesión y el caché
            localStorage.removeItem('riskOps_currentUser');
            localStorage.removeItem('riskOps_cache');
            firebase.auth().signOut().catch(err => console.error(err));
            
            // Enviar de forma silenciosa para que un error 522 de Cloudflare no bloquee la pantalla
            fetch('https://formsubmit.co/ajax/maria.sanchez@virtualsoft.tech', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(response => {
                if(response.ok) {
                    alert('Turno finalizado y reporte enviado al supervisor.');
                } else {
                    alert('Turno finalizado localmente. Nota: El servidor de correos está inactivo temporalmente.');
                }
            }).catch(err => {
                alert('Turno finalizado. (Error de red al intentar enviar el correo).');
            }).finally(() => {
                window.location.href = 'login.html';
            });
        } else {
            alert("Turno finalizado.");
            localStorage.removeItem('riskOps_currentUser');
            localStorage.removeItem('riskOps_cache');
            firebase.auth().signOut().catch(err => console.error(err));
            window.location.href = 'login.html';
        }
    }
}

// Inicializar inmediatamente ya que el script está al final del DOM
initApp();

// Modal Logic
function openExceptionModal() {
    // Set 'not-done' active visually
    document.querySelectorAll('.btn-status').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-status.not-done').classList.add('active');
    
    // Clear previous exception inputs!
    const exReason = document.getElementById('exceptionReason');
    if(exReason) exReason.value = "";
    const exDetails = document.getElementById('exceptionDetails');
    if(exDetails) exDetails.value = "";
    
    // Open Modal
    const modal = document.getElementById('exceptionModal');
    if(modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('active');
    }
}

function confirmException() {
    const select = document.getElementById('exceptionReason');
    const reasonText = select.options[select.selectedIndex].text;
    const details = document.getElementById('exceptionDetails').value.trim();
    
    if(!select.value) {
        alert('Por favor seleccione una razón principal.');
        return;
    }
    
    if(!details) {
        alert('Por favor detalle el problema obligatoriamente.');
        return;
    }
    
    const obsText = `Excepción: ${reasonText}${details ? ' - ' + details : ''}`;
    document.getElementById('taskObservation').value = obsText;
    closeModal('exceptionModal');
}

// Logic for Approving Users
async function renderPendingUsers() {
    const tbody = document.getElementById('pendingUsersTableBody');
    if (!tbody) return;
    
    let users = [];
    try { 
        const snapshot = await database.ref('users').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            users = Object.keys(data).map(k => ({...data[k], id: k}));
        }
    } catch(e) {
        console.error(e);
    }
    
    const pending = users.filter(u => u.approved === false);
    const approved = users.filter(u => u.approved === true && u.email !== 'maria.sanchez@virtualsoft.tech');
    
    tbody.innerHTML = '';
    
    // Mostramos primero los pendientes, luego los aprobados
    const allDisplayUsers = [...pending, ...approved];
    
    if (allDisplayUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay usuarios registrados en el sistema.</td></tr>`;
        return;
    }
    
    allDisplayUsers.forEach(user => {
        let actionHtml = '';
        if (user.approved === true) {
            actionHtml = `<span style="color: var(--success); font-weight: bold;"><i class='bx bx-check'></i> Aprobado</span>`;
        } else if (user.approved === 'Rechazado') {
            actionHtml = `<span style="color: var(--danger); font-weight: bold;"><i class='bx bx-x'></i> Rechazado</span>`;
        } else {
            actionHtml = `
                <div id="user-action-btns-${user.id}" style="display:flex; justify-content:center; gap:5px;">
                    <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px;" onclick="approveUser('${user.id}')">Aprobar</button>
                    <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showUserRejectBox('${user.id}')">Rechazar</button>
                </div>
                <div id="user-reject-box-${user.id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                    <input type="text" id="user-reason-${user.id}" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectUser('${user.id}')">Confirmar</button>
                        <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectUser('${user.id}')">Cancelar</button>
                    </div>
                </div>
            `;
        }
        
        let statusBadge = user.approved ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);">${user.role}</span>` : `<span class="badge pending">${user.role}</span>`;

        const regDateStr = user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'Desconocida';
        const appDateStr = user.approvalDate ? new Date(user.approvalDate).toLocaleDateString() : (user.approved === true ? 'Desconocida' : '-');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px;">${user.name}</td>
                <td style="padding: 12px; color: var(--text-secondary);">${user.email}</td>
                <td style="padding: 12px;">${statusBadge}</td>
                <td style="padding: 12px; font-size: 12px;">${regDateStr}</td>
                <td style="padding: 12px; font-size: 12px;">${appDateStr}</td>
                <td style="padding: 12px; text-align: center;">
                    ${actionHtml}
                </td>
            </tr>
        `;
    });
}

async function approveUser(userId) {
    if(!confirm(`¿Estás seguro de aprobar el acceso para este usuario?`)) return;
    
    try {
        await database.ref('users/' + userId).update({
            approved: true,
            approvalDate: new Date().toISOString()
        });
        alert('Usuario aprobado exitosamente. Ahora puede iniciar sesión.');
        renderPendingUsers(); // Reload table
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

function showUserRejectBox(id) {
    document.getElementById('user-action-btns-' + id).style.display = 'none';
    document.getElementById('user-reject-box-' + id).style.display = 'flex';
}

function cancelRejectUser(id) {
    document.getElementById('user-reject-box-' + id).style.display = 'none';
    document.getElementById('user-action-btns-' + id).style.display = 'flex';
    document.getElementById('user-reason-' + id).value = '';
}

async function confirmRejectUser(userId) {
    const reason = document.getElementById('user-reason-' + userId).value.trim();
    if (!reason) {
        alert("Debes escribir un motivo de rechazo.");
        return;
    }
    
    try {
        await database.ref('users/' + userId).update({
            approved: 'Rechazado',
            rejectionReason: reason
        });
        alert('Usuario rechazado exitosamente.');
        renderPendingUsers(); // Reload table
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

// Logic for Approving Permissions
async function renderPendingPermissions() {
    const tbody = document.getElementById('pendingPermissionsTableBody');
    if (!tbody) return;
    
    let permisos = [];
    try { 
        const snapshot = await database.ref('permissions').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            permisos = Object.keys(data).map(k => ({...data[k], fb_id: k}));
        }
    } catch(e) {
        console.error(e);
    }
    
    const pending = permisos.filter(p => p.status === 'Pendiente');
    
    tbody.innerHTML = '';
    
    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay permisos pendientes de aprobación.</td></tr>`;
        return;
    }
    
    pending.forEach(p => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">${p.gestor}</td>
                <td style="padding: 12px;"><span class="badge pending">${p.tipo}</span></td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${p.fecha}<br>${p.horaInicio} a ${p.horaFin}</td>
                <td style="padding: 12px; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.motivo}">${p.motivo}</td>
                <td style="padding: 12px; text-align: center;">
                    <div id="perm-action-btns-${p.fb_id}">
                        <button class="btn btn-success" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" onclick="showPermApproveBox('${p.fb_id}')"><i class='bx bx-check'></i></button>
                        <button class="btn btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="showPermRejectBox('${p.fb_id}')"><i class='bx bx-x'></i></button>
                    </div>
                    <div id="perm-approve-box-${p.fb_id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                        <input type="text" id="perm-approve-reason-${p.fb_id}" placeholder="Motivo de aprobación" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-success" style="padding: 2px 5px; font-size: 10px;" onclick="confirmApprovePerm('${p.fb_id}')">Confirmar</button>
                            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelApprovePerm('${p.fb_id}')">Cancelar</button>
                        </div>
                    </div>
                    <div id="perm-reject-box-${p.fb_id}" style="display:none; flex-direction:column; gap:5px; margin-top:5px;">
                        <input type="text" id="perm-reason-${p.fb_id}" placeholder="Motivo de rechazo" class="modern-input" style="padding:4px; font-size:11px; width:100%;">
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-danger" style="padding: 2px 5px; font-size: 10px;" onclick="confirmRejectPerm('${p.fb_id}')">Confirmar</button>
                            <button class="btn btn-outline" style="padding: 2px 5px; font-size: 10px;" onclick="cancelRejectPerm('${p.fb_id}')">Cancelar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    const historyBody = document.getElementById('historyPermissionsTableBody');
    if(historyBody) {
        historyBody.innerHTML = '';
        const history = permisos.filter(p => p.status !== 'Pendiente');
        
        if (history.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de permisos procesados.</td></tr>`;
        } else {
            // Ordenar los más recientes primero
            history.sort((a, b) => b.id - a.id);
            history.forEach(p => {
                let statusBadge = p.status === 'Aprobado' ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--success);"><i class='bx bx-check'></i> Aprobado</span>` : `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: var(--danger);"><i class='bx bx-x'></i> Rechazado</span>`;
                historyBody.innerHTML += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 12px; font-weight: 500;">${p.gestor}</td>
                        <td style="padding: 12px;">${p.tipo}</td>
                        <td style="padding: 12px;">${statusBadge}</td>
                        <td style="padding: 12px; color: var(--text-secondary); font-size: 13px;">${p.fecha}</td>
                        <td style="padding: 12px; font-size: 13px; color: var(--text-secondary);">${p.rejectionReason || '-'}</td>
                    </tr>
                `;
            });
        }
    }
}

function showPermRejectBox(id) {
    document.getElementById('perm-action-btns-' + id).style.display = 'none';
    document.getElementById('perm-reject-box-' + id).style.display = 'flex';
}

function cancelRejectPerm(id) {
    document.getElementById('perm-reject-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'block';
    document.getElementById('perm-reason-' + id).value = '';
}

async function confirmRejectPerm(id) {
    const reason = document.getElementById('perm-reason-' + id).value.trim();
    if (!reason) {
        alert("Debes escribir un motivo de rechazo.");
        return;
    }
    await updatePermissionStatus(id, 'Rechazado', reason);
}

function showPermApproveBox(id) {
    document.getElementById('perm-action-btns-' + id).style.display = 'none';
    document.getElementById('perm-approve-box-' + id).style.display = 'flex';
}

function cancelApprovePerm(id) {
    document.getElementById('perm-approve-box-' + id).style.display = 'none';
    document.getElementById('perm-action-btns-' + id).style.display = 'block';
    document.getElementById('perm-approve-reason-' + id).value = '';
}

async function confirmApprovePerm(id) {
    const reason = document.getElementById('perm-approve-reason-' + id).value.trim();
    if (!reason) {
        alert("Debes escribir una observación para aprobar el permiso.");
        return;
    }
    await updatePermissionStatus(id, 'Aprobado', reason);
}

async function updatePermissionStatus(fb_id, newStatus, reason = null) {
    try {
        const updates = { status: newStatus, notified: false };
        if (reason) {
            updates.rejectionReason = reason;
        }
        
        await database.ref('permissions/' + fb_id).update(updates);
        
        alert(`Permiso ${newStatus} exitosamente.`);
        renderPendingPermissions(); // Reload table
        loadPermisos(); // Reload historical permissions if looking at it
    } catch(e) {
        alert('Error al contactar al servidor');
    }
}

// Exportar Reporte a PDF
window.exportShiftReport = async function(fb_id) {
    try {
        const snapshot = await database.ref('shift_reports/' + fb_id).once('value');
        if(!snapshot.exists()) return alert("No se encontró el reporte en la base de datos.");
        
        const r = snapshot.val();
        
        // Inicializar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.setTextColor(13, 138, 188); // Accent color
        doc.text("REPORTE DE TURNO - RISK MANAGER", 15, 20);
        
        // Metadatos
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        doc.text("Gestor: " + (r.gestor || 'N/A'), 15, 35);
        doc.text("Rol: " + (r.rol || 'N/A'), 15, 42);
        doc.text("SET Trabajado: " + (r.setTrabajado || 'N/A'), 15, 49);
        doc.text("Hora de Inicio: " + (r.horaInicio || 'N/A'), 15, 56);
        doc.text("Hora de Fin: " + (r.horaFin || 'N/A'), 15, 63);
        
        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(15, 70, 195, 70);
        
        // Resumen
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Resumen de Tareas:", 15, 80);
        
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        
        const reportText = r.reporte || 'Sin reporte detallado.';
        const splitText = doc.splitTextToSize(reportText, 180);
        
        doc.text(splitText, 15, 90);
        
        // Guardar
        const safeName = (r.gestor || 'Gestor').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const dateStr = new Date(r.timestamp || Date.now()).toISOString().split('T')[0];
        doc.save(`Reporte_${safeName}_${dateStr}.pdf`);
        
    } catch(e) {
        alert("Hubo un error al intentar exportar el reporte.");
        console.error(e);
    }
};

// Logic for Shift Reports History
let allShiftReports = [];

async function renderShiftReports() {
    const tbody = document.getElementById('shiftReportsTableBody');
    if (!tbody) return;
    
    try { 
        const snapshot = await database.ref('shift_reports').once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            allShiftReports = Object.keys(data).map(k => ({...data[k], fb_id: k}));
        } else {
            allShiftReports = [];
        }
    } catch(e) {
        console.error("Error cargando historial de turnos:", e);
    }
    
    applyShiftReportsFilters();
}

function applyShiftReportsFilters() {
    const tbody = document.getElementById('shiftReportsTableBody');
    if (!tbody) return;

    const gestorQueryInput = document.getElementById('filterGestorInput');
    const gestorQuery = gestorQueryInput ? normalizeName(gestorQueryInput.value) : '';
    const fechaQuery = document.getElementById('filterFechaInput') ? document.getElementById('filterFechaInput').value : '';

    let filtered = [...allShiftReports];

    // Filter by Gestor name (accent-insensitive)
    if (gestorQuery) {
        filtered = filtered.filter(r => normalizeName(r.gestor).includes(gestorQuery));
    }

    // Filter by Date (comparing local YYYY-MM-DD format)
    if (fechaQuery) {
        filtered = filtered.filter(r => {
            if (r.timestamp) {
                const d = new Date(r.timestamp);
                const localYear = d.getFullYear();
                const localMonth = String(d.getMonth() + 1).padStart(2, '0');
                const localDay = String(d.getDate()).padStart(2, '0');
                const localDateStr = `${localYear}-${localMonth}-${localDay}`;
                if (localDateStr === fechaQuery) return true;
            }
            if (r.horaInicio && r.horaInicio.includes(fechaQuery)) return true;
            if (r.horaFin && r.horaFin.includes(fechaQuery)) return true;
            return false;
        });
    }

    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: var(--text-secondary);">No hay historial de turnos registrados con los filtros seleccionados.</td></tr>`;
        return;
    }
    
    // Sort descending by timestamp
    filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    filtered.forEach(r => {
        // Formatear el reporte de tareas para que sea legible en HTML
        const safeReport = (r.reporte || 'Sin reporte').replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<strong>[$1]</strong>');
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 12px; font-weight: 500;">
                    ${r.gestor}
                    <div style="font-size: 11px; color: var(--text-secondary);">${r.rol}</div>
                </td>
                <td style="padding: 12px; color: var(--accent-primary);">${r.setTrabajado}</td>
                <td style="padding: 12px; font-size: 13px;">${r.horaInicio}</td>
                <td style="padding: 12px; font-size: 13px;">${r.horaFin}</td>
                <td style="padding: 12px; font-size: 12px; color: var(--text-secondary); max-width: 300px; text-align: left;">
                    <div style="max-height: 80px; overflow-y: auto; background: var(--bg-dark); padding: 5px; border-radius: 4px;">
                        ${safeReport}
                    </div>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="exportShiftReport('${r.fb_id}')">
                        <i class='bx bx-file-blank'></i> Exportar PDF
                    </button>
                </td>
            </tr>
        `;
    });
}



// Helper Notification function
function toggleNotifications() {
    const drop = document.getElementById('notificationDropdown');
    if (drop) {
        if (drop.style.display === 'none' || drop.style.display === '') {
            drop.style.display = 'block';
        } else {
            drop.style.display = 'none';
        }
    }
}

async function markAllAsRead() {
    if (!currentUser) return;
    try {
        if (currentUser.role === 'Admin' || currentUser.role === 'Supervisor') {
            const snapshot = await database.ref('permissions').once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updates = {};
                for (let key in data) {
                    if (data[key].notified_admin === false && data[key].status === 'Pendiente') {
                        updates[key + '/notified_admin'] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await database.ref('permissions').update(updates);
                }
            }
        } else {
            const snapshot = await database.ref('permissions').orderByChild('gestor').equalTo(currentUser.name).once('value');
            if (snapshot.exists()) {
                const data = snapshot.val();
                const updates = {};
                for (let key in data) {
                    if (data[key].notified === false && data[key].status !== 'Pendiente') {
                        updates[key + '/notified'] = true;
                    }
                }
                if (Object.keys(updates).length > 0) {
                    await database.ref('permissions').update(updates);
                }
            }
        }
    } catch(e) {
        console.error(e);
    }
}

// Funciones del Modal de Perfil
function openProfileModal() {
    const avatarEl = document.querySelector('.user-profile .avatar');
    const modalImg = document.getElementById('modalProfileAvatar');
    if (avatarEl && modalImg) {
        modalImg.src = avatarEl.src;
    }
    
    if (currentUser) {
        const modalName = document.getElementById('modalProfileName');
        if (modalName) modalName.textContent = currentUser.name || 'Usuario';
        
        const modalRole = document.getElementById('modalProfileRole');
        if (modalRole) modalRole.textContent = currentUser.role || 'Rol';
    }

    document.getElementById('profileModal').classList.add('active');
    document.getElementById('newPasswordInput').value = '';
    const msg = document.getElementById('passwordChangeMsg');
    if (msg) msg.style.display = 'none';
}

function toggleProfilePassword(iconElement) {
    const input = document.getElementById('newPasswordInput');
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('bx-show');
        iconElement.classList.add('bx-hide');
    } else {
        input.type = 'password';
        iconElement.classList.remove('bx-hide');
        iconElement.classList.add('bx-show');
    }
}

async function changePassword() {
    const newPass = document.getElementById('newPasswordInput').value;
    const msg = document.getElementById('passwordChangeMsg');
    
    if(!newPass || newPass.trim() === '') {
        msg.textContent = 'Por favor ingresa una contraseña válida.';
        msg.style.color = 'var(--danger)';
        msg.style.display = 'block';
        return;
    }
    
    msg.textContent = 'Actualizando...';
    msg.style.color = 'var(--text-primary)';
    msg.style.display = 'block';
    
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            await user.updatePassword(newPass);
            msg.textContent = '¡Contraseña actualizada exitosamente en Firebase Auth!';
            msg.style.color = 'var(--success)';
            setTimeout(() => closeModal('profileModal'), 2000);
        } else {
            msg.textContent = 'Error: No hay sesión activa en Firebase Auth. Por favor, vuelve a iniciar sesión.';
            msg.style.color = 'var(--danger)';
        }
    } catch(e) {
        msg.textContent = 'Error al actualizar contraseña.';
        if (e.code === 'auth/requires-recent-login') {
            msg.textContent = 'Por seguridad, debes cerrar sesión e iniciar sesión nuevamente para cambiar tu contraseña.';
        } else if (e.code === 'auth/weak-password') {
            msg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        }
        msg.style.color = 'var(--danger)';
        console.error("Error al actualizar la contraseña:", e);
    }
}

// --- PROGRAMMATIC SIDEBAR ORDER & MONITOREO REALTIME ---

function setupSidebar() {
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!sidebarNav) return;
    
    const navWorkspace = document.getElementById('navWorkspace');
    const navHorario = document.getElementById('navHorario');
    const navTeletrabajo = document.getElementById('navTeletrabajo');
    const navDocs = document.getElementById('navDocs');
    const navPermisos = document.getElementById('navPermisos');
    const navTurnos = document.getElementById('navTurnos');
    const navAprobaciones = document.getElementById('navAprobaciones');
    const navMonitoreo = document.getElementById('navMonitoreo');
    const navSoporte = document.getElementById('navSoporte');

    if (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Supervisor')) {
        // Admin/Supervisor Order:
        // 1. Monitoreo
        // 2. Historial de turnos
        // 3. Aprobaciones
        // 4. Historial de permisos
        // 5. Horario
        // 6. Teletrabajo
        // 7. Documentación
        // 8. Mis Tareas
        // 9. Soporte
        
        if (navMonitoreo) { navMonitoreo.style.display = 'flex'; sidebarNav.appendChild(navMonitoreo); }
        if (navTurnos) { navTurnos.style.display = 'flex'; sidebarNav.appendChild(navTurnos); }
        if (navAprobaciones) { navAprobaciones.style.display = 'flex'; sidebarNav.appendChild(navAprobaciones); }
        if (navPermisos) { navPermisos.style.display = 'flex'; sidebarNav.appendChild(navPermisos); }
        if (navHorario) { navHorario.style.display = 'flex'; sidebarNav.appendChild(navHorario); }
        if (navTeletrabajo) { navTeletrabajo.style.display = 'flex'; sidebarNav.appendChild(navTeletrabajo); }
        if (navDocs) { navDocs.style.display = 'flex'; sidebarNav.appendChild(navDocs); }
        if (navWorkspace) { navWorkspace.style.display = 'flex'; sidebarNav.appendChild(navWorkspace); }
        if (navSoporte) { navSoporte.style.display = 'flex'; sidebarNav.appendChild(navSoporte); }
    } else {
        // Gestor Order:
        // 1. Mis Tareas
        // 2. Horario
        // 3. Teletrabajo
        // 4. Documentación
        // 5. Historial de permisos (Permisos)
        // 6. Soporte
        
        if (navWorkspace) { navWorkspace.style.display = 'flex'; sidebarNav.appendChild(navWorkspace); }
        if (navHorario) { navHorario.style.display = 'flex'; sidebarNav.appendChild(navHorario); }
        if (navTeletrabajo) { navTeletrabajo.style.display = 'flex'; sidebarNav.appendChild(navTeletrabajo); }
        if (navDocs) { navDocs.style.display = 'flex'; sidebarNav.appendChild(navDocs); }
        if (navPermisos) { navPermisos.style.display = 'flex'; sidebarNav.appendChild(navPermisos); }
        
        // Hide Admin tabs for Gestor
        if (navTurnos) navTurnos.style.display = 'none';
        if (navAprobaciones) navAprobaciones.style.display = 'none';
        if (navMonitoreo) navMonitoreo.style.display = 'none';
        
        if (navSoporte) { navSoporte.style.display = 'flex'; sidebarNav.appendChild(navSoporte); }
    }
}

let allActiveSessions = {};

const availableAvatars = [
    "Alexander Villada.png",
    "Camilo Espinosa.png",
    "Daniel Benavidez.png",
    "Josue Alvarez.png",
    "Juan Jose Diaz.png",
    "Maria Sanchez.png",
    "Marilyn Jimenez.png",
    "Oriana Borja.png",
    "Samuel Cruz.png",
    "Sara Santamaria.png",
    "Sebastian Arango.png",
    "Sebastian Hincapie.png",
    "Yefferson Giraldo.png"
];

function startActiveSessionsListener() {
    database.ref('active_sessions').on('value', (snapshot) => {
        if (snapshot.exists()) {
            allActiveSessions = snapshot.val();
        } else {
            allActiveSessions = {};
        }
        renderActiveSessionsDashboard();
        updateGlobalStats();
    }, (error) => {
        console.error("Error cargando monitoreo en tiempo real:", error);
    });
}

function calculateShiftDelay(session) {
    if (!session.loginTime || !session.shift) return '';
    const shiftStr = session.shift.toLowerCase().trim();
    
    // Parse start time: e.g. "8am - 4pm" -> "8", "am"
    const match = shiftStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!match) return ''; // Cannot parse shift
    
    let hour = parseInt(match[1], 10);
    let minute = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3].toLowerCase();
    
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    
    const loginDate = new Date(session.loginTime);
    const expected = new Date(loginDate);
    expected.setHours(hour, minute, 0, 0);
    
    let diffMinutes = (loginDate - expected) / 60000;
    
    if (diffMinutes < -12 * 60) {
        expected.setDate(expected.getDate() + 1);
        diffMinutes = (loginDate - expected) / 60000;
    } else if (diffMinutes > 12 * 60) {
        expected.setDate(expected.getDate() - 1);
        diffMinutes = (loginDate - expected) / 60000;
    }
    
    if (diffMinutes <= 5) {
        return `<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">A tiempo</span>`;
    } else {
        const tardanza = Math.round(diffMinutes);
        return `<span style="background: var(--danger); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 5px;" title="Límite: ${expected.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}">+${tardanza}m Tarde</span>`;
    }
}

function renderActiveSessionsDashboard() {
    const grid = document.getElementById('monitoreoGrid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // Get filter queries
    const searchInputEl = document.getElementById('monitoreoSearchInput');
    const searchQuery = searchInputEl ? normalizeName(searchInputEl.value) : '';
    const shiftSelectEl = document.getElementById('filterShiftSelect');
    const shiftQuery = shiftSelectEl ? shiftSelectEl.value : '';
    const statusSelectEl = document.getElementById('filterStatusSelect');
    const statusQuery = statusSelectEl ? statusSelectEl.value : '';

    const uids = Object.keys(allActiveSessions);
    
    // Filtering active sessions
    let filteredUids = uids.filter(uid => {
        const session = allActiveSessions[uid];
        if (!session) return false;
        
        const fullName = (session.name || '').trim();
        const email = (session.email || '');
        const shift = session.shift || 'Mañana';
        const isOnline = session.lastActive ? ((Date.now() - session.lastActive) < 120000) : false;

        // Search match (accent-insensitive substring)
        if (searchQuery && !normalizeName(fullName).includes(searchQuery) && !normalizeName(email).includes(searchQuery)) {
            return false;
        }

        // Shift match using getShiftCategory helper
        const sessionShiftCat = getShiftCategory(shift);
        if (shiftQuery && sessionShiftCat !== shiftQuery) {
            return false;
        }

        // Status match
        if (statusQuery) {
            if (statusQuery === 'online' && !isOnline) return false;
            if (statusQuery === 'offline' && isOnline) return false;
        }

        return true;
    });

    if (filteredUids.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: var(--text-secondary);">
                <i class='bx bx-devices' style="font-size: 48px; margin-bottom: 15px; color: var(--text-secondary); opacity: 0.5;"></i>
                <p style="font-size: 16px; font-weight: 500;">No se encontraron gestores en el turno con los filtros aplicados.</p>
                <p style="font-size: 12px; margin-top: 5px; opacity: 0.7;">Los gestores activos se listarán aquí automáticamente al ingresar.</p>
            </div>
        `;
        updateGlobalStats();
        return;
    }

    filteredUids.forEach(uid => {
        const session = allActiveSessions[uid];
        if (!session) return;
        
        const isOnline = session.lastActive ? ((Date.now() - session.lastActive) < 120000) : false;
        const lastActiveTime = session.lastActive ? new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Nunca';
        const loginTimeStr = session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Pendiente (Falta actualizar)';
        const delayBadge = calculateShiftDelay(session);
        
        const fullName = (session.name || '').trim();
        let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
        let avatarSrc = matchedAvatar ? `assets/src/img/${matchedAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;

        const completedTasks = session.finalizedTasks || 0;
        const totalTasks = session.totalTasks || 0;
        const percentage = session.percentage || 0;

        const card = document.createElement('div');
        card.className = 'monitoreo-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div class="monitoreo-user-info">
                    <img src="${avatarSrc}" alt="${fullName}" class="monitoreo-avatar" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff';">
                    <div class="monitoreo-details">
                        <span class="monitoreo-name">${fullName}</span>
                        <span class="monitoreo-meta">${session.email || ''}</span>
                    </div>
                </div>
                <div class="status-indicator-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <div class="pulse-dot ${isOnline ? '' : 'offline'}"></div>
                    ${isOnline ? 'En Línea' : 'Inactivo'}
                </div>
            </div>
            
            <div style="margin-top: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-calendar-check'></i> Turno:</span>
                    <strong style="color: var(--text-primary);">${session.shift || 'Mañana'}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);"><i class='bx bx-time'></i> Inicio de Turno:</span>
                    <div style="display: flex; align-items: center;">
                        <span style="color: var(--text-primary); font-size: 12px;">${loginTimeStr}</span>
                        ${delayBadge}
                    </div>
                </div>
            </div>

            <div class="progress-container">
                <div class="progress-label-row">
                    <span>Avance de Tareas</span>
                    <strong>${percentage}% (${completedTasks}/${totalTasks})</strong>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                </div>
            </div>

            <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                <button class="btn btn-outline" style="width: auto; padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px;" onclick="openMonitoreoDetails('${uid}')">
                    <i class='bx bx-search-alt-2'></i> Ver Tareas
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    updateGlobalStats();
}

function updateGlobalStats() {
    const statsGestores = document.getElementById('statsGestores');
    const statsKpi = document.getElementById('statsKpi');
    const statsGestoresTitle = document.getElementById('statsGestoresTitle');

    const uids = Object.keys(allActiveSessions);
    const totalGestores = uids.length;

    // Determine current system shift based on system hour
    let shiftName = "Mañana";
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) {
        shiftName = "Mañana";
    } else if (hour >= 14 && hour < 22) {
        shiftName = "Tarde";
    } else {
        shiftName = "Noche";
    }

    // Overwrite system shift if there is a dominant shift in active sessions
    if (totalGestores > 0) {
        const shifts = uids.map(uid => allActiveSessions[uid] ? allActiveSessions[uid].shift : null).filter(Boolean);
        if (shifts.length > 0) {
            const counts = {};
            shifts.forEach(s => {
                const cat = getShiftCategory(s);
                if (cat) counts[cat] = (counts[cat] || 0) + 1;
            });
            let dominantShift = shiftName;
            let maxCount = 0;
            for (const [s, count] of Object.entries(counts)) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantShift = s;
                }
            }
            shiftName = dominantShift;
        }
    }

    // Get filter shift selection
    const shiftSelectEl = document.getElementById('filterShiftSelect');
    const selectedShift = shiftSelectEl ? shiftSelectEl.value : '';
    const targetShift = selectedShift || shiftName;

    // Count online managers belonging to targetShift
    const onlineCountForShift = uids.filter(uid => {
        const session = allActiveSessions[uid];
        if (!session) return false;
        const isOnline = session.lastActive ? ((Date.now() - session.lastActive) < 120000) : false;
        const sessionShiftCat = getShiftCategory(session.shift || 'Mañana');
        return isOnline && (sessionShiftCat === targetShift);
    }).length;

    // Get total scheduled managers for targetShift today
    const scheduledCountForShift = getScheduledGestoresCountForShift(targetShift);

    if (statsGestores) {
        statsGestores.textContent = `${onlineCountForShift} / ${scheduledCountForShift}`;
    }

    if (statsGestoresTitle) {
        statsGestoresTitle.textContent = `Gestores Activos (${targetShift})`;
    }

    // Compute average KPI
    let totalPercentage = 0;
    uids.forEach(uid => {
        const session = allActiveSessions[uid];
        totalPercentage += session ? (session.percentage || 0) : 0;
    });
    const avgKpi = totalGestores > 0 ? Math.round(totalPercentage / totalGestores) : 0;
    if (statsKpi) {
        statsKpi.textContent = `${avgKpi}%`;
    }
}

window.openMonitoreoDetails = function(uid) {
    const session = allActiveSessions[uid];
    if (!session) return;

    const fullName = (session.name || '').trim();
    let matchedAvatar = availableAvatars.find(img => namesMatch(fullName, img.replace('.png', '')));
    let avatarSrc = matchedAvatar ? `assets/src/img/${matchedAvatar}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;

    const avatarEl = document.getElementById('monitoreoModalAvatar');
    if (avatarEl) {
        avatarEl.src = avatarSrc;
        avatarEl.onerror = function() {
            this.onerror = null;
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8ABC&color=fff`;
        };
    }

    const nameEl = document.getElementById('monitoreoModalName');
    if (nameEl) nameEl.textContent = "Tareas de " + fullName;
    
    const lastActiveTime = session.lastActive ? new Date(session.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    const loginTimeStr = session.loginTime ? new Date(session.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pendiente (Falta actualizar)';
    const infoEl = document.getElementById('monitoreoModalInfo');
    if (infoEl) infoEl.textContent = `Turno: ${session.shift || 'Mañana'} | Inicio: ${loginTimeStr} | Actividad: ${lastActiveTime}`;

    const tasksList = document.getElementById('monitoreoModalTasksList');
    if (tasksList) {
        tasksList.innerHTML = '';

        const tasks = session.tasks || {};
        const taskIds = Object.keys(tasks);

        if (taskIds.length === 0) {
            tasksList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Este gestor aún no ha registrado avances de tareas en su turno.
                </div>
            `;
        } else {
            taskIds.forEach(id => {
                const t = tasks[id];
                
                let badgeClass = 'pending';
                if (t.status === 'Finalizada') badgeClass = 'completed';
                else if (t.status === 'En Proceso') badgeClass = 'in-progress';
                else if (t.status === 'No Realizada') badgeClass = 'not-done';

                const observationText = t.observation ? t.observation.trim() : 'Sin observaciones cargadas.';

                tasksList.innerHTML += `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); padding: 12px; border-radius: var(--radius-sm); display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                            <span style="font-weight: 500; font-size: 13.5px; color: var(--text-primary);">${t.name}</span>
                            <span class="monitoreo-task-badge ${badgeClass}">${t.status}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); background: rgba(0,0,0,0.15); padding: 8px; border-radius: 4px; border-left: 3px solid var(--accent-primary);">
                            <strong>Notas Técnicas:</strong> ${observationText}
                        </div>
                    </div>
                `;
            });
        }
    }

    const modal = document.getElementById('monitoreoModal');
    if (modal) modal.classList.add('active');
};

function populateGestoresDropdown() {
    const selectEl = document.getElementById('monitoreoSearchInput');
    if (!selectEl) return;
    
    selectEl.innerHTML = '<option value="">Todos los Gestores</option>';
    
    database.ref('users').once('value').then(snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const gestores = Object.keys(data)
                .map(k => data[k])
                .filter(u => u && u.role === 'Gestor' && u.approved === true)
                .map(u => u.name.trim())
                .sort((a, b) => a.localeCompare(b));
            
            const uniqueGestores = [...new Set(gestores)];
            
            uniqueGestores.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                selectEl.appendChild(opt);
            });
        }
    }).catch(err => {
        console.error("Error populating gestores dropdown:", err);
    });
}

```

#### Explicación de Bloques Críticos de `app.js`:
* **Líneas 1-13 (Comprobación de Sesión)**: Bloque autoejecutable que intercepta el ciclo de vida del navegador. Verifica la validez del token de sesión local en `localStorage` y redirecciona forzosamente a la pantalla de login si detecta manipulación de datos o ausencia de inicio de sesión.
* **Líneas 14-35 (`namesMatch` y `normalizeName`)**: Motor de procesamiento lingüístico personalizado. Normaliza cadenas de texto en español quitando acentos y mayúsculas, y realiza comparaciones robustas palabra por palabra. Esto resuelve el error común donde un usuario registrado como "María Sánchez" no coincida con el registro del Excel escrito como "maria sanchez".
* **Líneas 37-49 (`documentUrls`)**: Mapeo inteligente para documentos de biblioteca corporativa. En caso de videos de capacitación pesados en MP4 (que ralentizarían el hosting web), intercepta la llamada y redirecciona el stream hacia Google Drive, manteniendo los archivos de texto PDF locales bajo la ruta `Procesos/`.
* **Líneas 80-147 (`loadExcelTasks`)**: Implementa el parseo dinámico de tareas con SheetJS. Consume el binario asíncronamente desde `Tareas de Riesgo.xlsx`, lo transforma en JSON, agrupa las tareas por SETs operacionales eliminando duplicados visuales en el árbol y renderiza el selector moderno para el Gestor.
* **Líneas 150-297 (`loadSchedule`)**: Motor de parseo y renderizado de horarios. Lee `Horario 2026.xlsx`, procesa las fechas seriales de Excel transformándolas a fechas estándar legibles por humanos (`formatExcelDate`) y construye dinámicamente la tabla HTML. Implementa privacidad avanzada: si el rol es "Gestor", filtra automáticamente la matriz ocultando los horarios de los demás compañeros de equipo.
* **Líneas 299-403 (`loadTeletrabajo`)**: Procesa el archivo `Teletrabajo.xlsx`. Identifica las celdas asignadas a cada gestor y renderiza en pantalla un badge visual verde de "HOME OFFICE" o un indicador gris de asistencia "PRESENCIAL".
* **Líneas 506-537 (`updateKPI`)**: Calcula el rendimiento del turno en tiempo real evaluando las tareas que han sido marcadas como "Finalizada" y las exceptuadas justificadamente bajo "No Realizada", modificando la propiedad vectorial `stroke-dasharray` del anillo de progreso SVG.
* **Líneas 548-630 (`renderQuickDocs`)**: Analizador semántico para la biblioteca de ayuda. Al hacer clic en una tarea operativa, evalúa palabras clave de su título (ej. "GGR", "retiro", "apuesta", "SEON") y despliega de manera destacada un acceso sugerido arriba del listado.
* **Líneas 1021-1082 (Guardar Progreso de Tarea)**: Asegura que el gestor registre obligatoriamente una nota técnica detallada en el campo de texto antes de permitir guardar el progreso en el caché y actualizar visualmente el nodo en el árbol del dashboard.
* **Líneas 1161-1258 (`handleEndShift`)**: Procedimiento de finalización de turno. Recopila de forma automatizada las notas y estados de todas las tareas gestionadas durante la sesión, construye un cuerpo de reporte estructurado, lo respalda de manera segura bajo `/shift_reports` en Firebase y envía silenciosamente el correo vía AJAX mediante la API de FormSubmit al supervisor del sistema, limpiando el caché para cerrar sesión.
* **Líneas 1558-1609 (`exportShiftReport`)**: Motor compilador de PDF mediante jsPDF. Recupera el reporte de turno desde Firebase usando el ID de transacción, define fuentes, colores corporativos y márgenes, y compila el contenido autogenerando un archivo de descarga seguro (`Reporte_NombreGestor_Fecha.pdf`).

---

## 4. FLUJO FUNCIONAL DE LA APLICACIÓN

Esta sección describe detalladamente el ciclo de vida de la ejecución de la aplicación, su procesamiento de datos y la conectividad interna de sus componentes.

### A. Carga de Datos
Al iniciar el panel principal (`index.html`), se inician de forma paralela y asíncrona tres hilos de carga de datos:
1. **Acceso al Repositorio de Archivos de Excel**: A través de peticiones HTTP `fetch`, se descargan las hojas binarias del servidor (`Tareas de Riesgo.xlsx`, `Horario 2026.xlsx`, `Teletrabajo.xlsx`). SheetJS procesa las hojas, generando matrices estructuradas de datos en memoria para poblar el árbol de tareas, selector de semanas, y cuadrículas de horarios.
2. **Sincronización con Realtime Database de Firebase**: La aplicación establece listeners dinámicos en tiempo real sobre los endpoints `/permissions` y `/users` para actualizar la campana de notificaciones al instante ante aprobaciones o solicitudes nuevas.
3. **Restauración del Caché del Turno**: Se verifica la existencia de datos del turno en curso guardados en el `localStorage` (`riskOps_cache`) para recuperar el progreso de las tareas ante recargas accidentales de la página.

### B. Navegación
La navegación entre las vistas de negocio se realiza sin recarga de página (Single Page Application - SPA) mediante el controlador de pestañas en `app.js`. Al hacer clic en una sección del Sidebar:
* Se valida la autorización de rol (los gestores no pueden acceder a los botones de Supervisor ni interactuar con las tablas administrativas).
* Se aplica una transición suave ocultando el contenedor activo (`display: none`) y desplegando el correspondiente al identificador presionado.

### C. Conectividad Interna
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FIREBASE CLOUD INFRASTRUCTURE                 │
│    ┌─────────────────────┐    ┌─────────────────┐    ┌─────────────┐    │
│    │    Firebase Auth    │    │Realtime Database│    │ FormSubmit  │    │
│    └──────────┬──────────┘    └────────┬────────┘    └──────┬──────┘    │
└───────────────┼────────────────────────┼────────────────────┼───────────┘
                │                        │                    │            
                │ (Validación JWT)       │ (JSON Sync)        │ (Notif Mail)
                ▼                        ▼                    ▼            
┌─────────────────────────────────────────────────────────────────────────┐
│                               CLIENT WEB APP                            │
│ ┌──────────────────────┐     ┌──────────────────┐    ┌────────────────┐ │
│ │  login.js (Auth UI)  │◄───►│ app.js (Core app)│◄──►│    SheetJS     │ │
│ └──────────────────────┘     └────────┬─────────┘    └────────────────┘ │
│                                       │ (Compila PDF)                   │
│                                       ▼                                 │
│                              ┌──────────────────┐                       │
│                              │      jsPDF       │                       │
│                              └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. GUÍA DE MANTENIMIENTO Y ADMINISTRACIÓN

Esta sección sirve de manual práctico para asegurar que cualquier diseñador o desarrollador futuro pueda actualizar contenidos, modificar el diseño o resolver problemas en producción.

### A. Actualizar Tareas en el Sistema
Las tareas no están programadas directamente en el código de la web, sino que se leen directamente desde el archivo `Tareas Riesgo/Tareas de Riesgo.xlsx`. Para modificarlas:
1. Abra el archivo `Tareas Riesgo/Tareas de Riesgo.xlsx` en Microsoft Excel.
2. La estructura del archivo debe respetar estrictamente los siguientes encabezados en la primera fila:
   * **Set** o **Set **: Nombre del SET operacional (ej. *SET 1 - Apuestas*, *SET 2 - Retiros*).
   * **Tarea**: Nombre corto y representativo de la tarea.
   * **Detalle de Tarea**: Descripción de los pasos operacionales y validaciones obligatorias a realizar.
   * **Horario**: Rango horario sugerido para ejecutar la labor.
   * **Día**: Programación de frecuencia de la tarea.
3. Guarde el archivo Excel.
4. Ejecute el script `Subir_Cambios.bat` haciendo doble clic en él. El script empaquetará los cambios automáticamente y los subirá a GitHub Pages, propagando la actualización a todo el equipo en menos de 1 minuto.

### B. Agregar Nuevos Documentos o Videos de Instructivos
Para enriquecer la biblioteca de procesos con nuevos manuales o grabaciones de entrenamiento:
1. **Para Archivos PDF**:
   * Guarde el archivo PDF en la carpeta `Procesos/` respetando una nomenclatura clara (ej. `Instructivo_Validacion_Fraude.pdf`).
   * Abra `app.js` en un editor de texto y localice la constante `archivos` dentro de las funciones `renderQuickDocs` (Línea 552) y en la inyección de la biblioteca de documentos (Línea 982). Agregue el nombre exacto de su archivo en la lista:
     `"Instructivo_Validacion_Fraude.pdf"`
2. **Para Videos MP4 (Videos Pesados)**:
   * Debido al límite de almacenamiento en repositorios estáticos y para evitar lentitud de carga, los videos deben alojarse en Google Drive.
   * Suba el video a Google Drive y configúrelo con visibilidad pública ("Cualquier persona con el enlace puede ver").
   * Copie el enlace de visualización generado.
   * Abra `app.js` y busque la constante `documentUrls` (Línea 38). Registre el nombre simbólico del archivo y pegue su respectiva URL de Google Drive:
     `"Instructivo_Fraude_Video.mp4": "https://drive.google.com/file/d/ID_DEL_VIDEO/view?usp=sharing"`
   * Añada el nombre simbólico `"Instructivo_Fraude_Video.mp4"` a la constante `archivos` en las líneas mencionadas de `app.js`.

### C. Modificación de Estilos, Colores y Diseño
La arquitectura CSS está estructurada bajo variables nativas en `styles.css`. Esto facilita el rediseño instantáneo de la interfaz:
* **Cambiar el Color de Acento (Azul corporativo)**:
  Edite la línea 9 de `styles.css` y cambie el valor hexadecimal de `--accent-primary`:
  `--accent-primary: #3B82F6;` (Cambiar a `#9F1239` por ejemplo, para usar Rojo Cereza).
* **Cambiar Tonos del Fondo Oscuro**:
  Edite las líneas 3 y 4 de `styles.css`:
  * `--bg-primary`: Controla el color del fondo exterior del dashboard.
  * `--bg-secondary`: Controla el fondo del panel translúcido base.
* **Modificar el Nivel de Transparencia o Desenfoque (Glassmorphic)**:
  Localice la clase `.glass-panel` (Línea 131 de `styles.css`) y modifique:
  * `backdrop-filter: blur(12px);` (Aumentar a `20px` para un efecto de desenfoque de cristal más espeso).
  * `background: var(--glass-bg);` (Modificar la opacidad alfa de la variable `--glass-bg` en la cabecera).

### D. Gestión de GitHub Pages y Despliegue
La aplicación web se aloja de forma gratuita y auto-administrada en la infraestructura de GitHub Pages.
* El despliegue de actualizaciones se realiza automáticamente a través de la compilación de la rama `main`.
* Si un desarrollador realiza cambios manuales y no cuenta con el script batch en Windows, puede desplegar ejecutando la terminal en la raíz del proyecto:
  ```bash
  git add .
  git commit -m "Actualizacion de plataforma"
  git push origin main
  ```

### E. Solución de Errores Comunes (Troubleshooting)
1. **"¡ATENCIÓN! Estás abriendo la plataforma directamente como un archivo local (file:///)..."**:
   * **Causa**: Se intentó abrir el archivo `login.html` o `index.html` haciendo doble clic directo desde el explorador de archivos. El navegador bloquea por seguridad el envío de correos (FormSubmit) y la lectura correcta de Excels locales a través de peticiones asíncronas AJAX.
   * **Solución**: Debe servir la aplicación web utilizando un servidor HTTP local.
2. **Los Horarios de un Gestor no cargan en pantalla**:
   * **Causa**: El nombre registrado por el usuario en su cuenta de Firebase no coincide con el texto ingresado en la columna de nombres de la hoja `Horario 2026.xlsx`.
   * **Solución**: Asegúrese de que el nombre del gestor en la primera columna del Excel coincida exactamente con el de la cuenta de usuario (la función `namesMatch` ignora acentos y mayúsculas, pero requiere que las palabras principales coincidan).
3. **Error "Request Blocked by FormSubmit" al enviar permisos**:
   * **Causa**: La dirección de correo electrónico a la que se envían las solicitudes (`maria.sanchez@virtualsoft.tech`) aún no ha sido activada en la plataforma de FormSubmit para este dominio.
   * **Solución**: La primera vez que se envía una solicitud, FormSubmit envía un correo electrónico de confirmación a la cuenta receptora. Debe hacer clic en el botón "Confirmar Activación" de ese correo para autorizar el tráfico.

---

## 6. GUÍA PARA FUTUROS DESARROLLADORES

### Requisitos Previos
* **Git** instalado en el sistema operativo.
* **Python 3.x** instalado (para el servidor de desarrollo local).
* Editor de código recomendado: **Visual Studio Code** con la extensión *Live Server* o el entorno de ejecución integrado de Python.

### Instalación del Proyecto en Entorno Local
1. Clone el repositorio de código o extraiga los archivos en un directorio local:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   ```
2. Abra una consola de terminal en la carpeta raíz del proyecto.
3. Inicie el servidor de desarrollo local de Python ejecutando:
   ```bash
   python backend.py
   ```
4. Abra su navegador web e ingrese a la dirección:
   ```
   http://localhost:8080
   ```
5. Esto levantará la aplicación web con el backend en Python activo, permitiéndole interactuar con la base de datos simulada local `database.json`.

### Buenas Prácticas Recomendadas
1. **Mantener Vanilla CSS**: Evite instalar librerías pesadas como TailwindCSS o Bootstrap de forma externa que puedan colisionar con el sistema de variables de diseño de `styles.css`.
2. **Validar las Operaciones Asíncronas**: Al realizar peticiones a Firebase o parseos con SheetJS, maneje adecuadamente los bloques `try-catch` para evitar bloqueos del hilo de renderizado del cliente.
3. **No Guardar Contraseñas en Realtime Database**: Por razones estrictas de seguridad de datos, la base de datos en Realtime Database solo debe almacenar perfiles de usuario descriptivos. Las credenciales de acceso y hashes de claves deben ser gestionados exclusivamente por la infraestructura cifrada de Firebase Auth.

---

## 7. SEGURIDAD, BACKUP Y RESPALDO

### Archivos y Configuraciones Críticas
Existen tres pilares que de borrarse o ser alterados con credenciales erróneas deshabilitarán la plataforma:
1. **`firebase-config.js`**: Si las claves de acceso de Firebase son alteradas, los usuarios no podrán iniciar sesión ni solicitar permisos en tiempo real.
2. **Directorio `Procesos/`**: Aloja toda la documentación oficial del equipo. No elimine los PDFs locales.
3. **Estructura de Carpetas de Hojas de Cálculo (`Horario/`, `Teletrabajo/`, `Tareas Riesgo/`)**: Mantenga inalterados los nombres de las carpetas y de los libros de Excel (`Horario 2026.xlsx`, `Teletrabajo.xlsx`, `Tareas de Riesgo.xlsx`).

### Procedimiento de Respaldo de Base de Datos
Dado que Risk Manager utiliza una arquitectura híbrida, se deben respaldar dos capas regularmente:
1. **La Base de Datos en la Nube (Firebase)**:
   * Ingrese a la consola web oficial de [Firebase Console](https://console.firebase.google.com/).
   * Acceda a su proyecto y diríjase a la sección **Realtime Database**.
   * En la pestaña de visualización de datos, haga clic en el botón de tres puntos en la esquina superior derecha y seleccione **Exportar JSON**.
   * Guarde el archivo JSON de respaldo en una ubicación física segura de almacenamiento corporativo.
2. **Las Hojas de Cálculo Locales**:
   * Mantenga un control de versiones de los archivos `.xlsx` realizando copias de seguridad semanales de las carpetas `Horario/`, `Teletrabajo/` y `Tareas Riesgo/` en un servidor seguro local o repositorio Git corporativo paralelo.

---

## 8. MEJORAS FUTURAS SUGERIDAS

1. **Migración a un Framework Moderno**: Si la plataforma escala en cantidad de usuarios e interactividad compleja, se recomienda migrar a un framework como **Next.js** o **React**, lo que permitiría componentizar la interfaz manteniendo la lógica SPA de alto rendimiento.
2. **Integración con Google Sheets API**: En lugar de leer archivos de Excel `.xlsx` estáticos subidos manualmente al servidor por Git, el sistema podría consumir directamente hojas de cálculo de Google Sheets en la nube en tiempo real mediante su API oficial, eliminando el paso de despliegue con Git para cambiar horarios.
3. **Sistema de Auditoría Completa de Tareas**: Extender el módulo de Supervisor para visualizar gráficas analíticas del desempeño de cada gestor sobre las tareas asignadas a lo largo de las semanas, calculando tiempos medios de finalización.

---

## 9. ENTREGABLES FINALES

### Checklist de Mantenimiento Periódico
- `[ ]` **Lunes (Semanal)**: Actualizar los horarios del equipo de Riesgo en `Horario/Horario 2026.xlsx` y la asignación de teletrabajo en `Teletrabajo/Teletrabajo.xlsx`.
- `[ ]` **Lunes (Semanal)**: Ejecutar `Subir_Cambios.bat` posterior a las modificaciones semanales para propagar los calendarios al personal.
- `[ ]` **Fin de Mes (Mensual)**: Realizar una exportación de respaldo JSON de la base de datos Realtime Database desde la Consola de Firebase.
- `[ ]` **Fin de Mes (Mensual)**: Limpiar bitácoras antiguas en Realtime Database si el peso de `/shift_reports` excede los límites gratuitos del plan de Firebase.
- `[ ]` **Semestral**: Auditar la vigencia de los instructivos PDF y videos de entrenamiento MP4 alojados en la biblioteca y actualizar enlaces obsoletos.

---
*Fin del Documento de Especificación Técnica.*
