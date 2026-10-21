# IMPORTADORA DE PRODUCTOS (ARQUITECTURA SERVERLESS)
> **Stack Moderno:** Angular 19 (Tailwind CSS) + Google Cloud Firebase (Firestore, Auth, Storage) + GitHub Pages  
> **100% Gratuito:** Plan Spark de Firebase + Hosting estático en GitHub Pages (Sin servidores de pago, sin SQL, sin PHP).  
> **Administrador Autorizado:** `cruz.arias.beymar@itsecsucre.edu.bo`

---

## 📌 1. Visión General y Ventajas de la Migración

El sistema ha sido completamente transformado a una arquitectura **JAMstack / Serverless**:
- **Sin backend tradicional ni base de datos SQL de pago:** Se eliminó la necesidad de servidores VPS, Apache, PHP y MySQL.
- **Base de Datos Gratuita de Google (Cloud Firestore):** Base de datos NoSQL documental de ultra-baja latencia con hasta 50,000 lecturas y 20,000 escrituras diarias gratuitas en el plan Spark.
- **Autenticación Administrador con Google / Firebase Auth:** Acceso restringido exclusivamente a tu correo `cruz.arias.beymar@itsecsucre.edu.bo` mediante contraseña o con 1 clic usando "Iniciar Sesión con Google".
- **Alojamiento 100% Gratuito en GitHub Pages:** La aplicación compila a HTML, CSS y JavaScript estático con enrutamiento Hash (`/#/`), garantizando que nunca ocurra el error 404 al recargar la página.
- **Vigencia y Expiración Automática de Reservas a 7 días:** Ya no se requiere un servidor de tareas Cron; el frontend evalúa y expira reservas vencidas de forma dinámica e instantánea liberando los productos a `disponible`.
- **Integración con WhatsApp (+591 72970461):** Botones directos de compra y reserva con mensajes prellenados y captura del nombre del cliente.

---

## ⚙️ 2. Guía Paso a Paso: Configuración en Google Firebase (100% Gratuito)

Sigue estos sencillos pasos en la plataforma de Google para enlazar tu base de datos y autenticación:

### Paso 1: Crear tu Proyecto en Firebase
1. Ve a [https://console.firebase.google.com/](https://console.firebase.google.com/) con tu cuenta de Google (`cruz.arias.beymar@itsecsucre.edu.bo` o tu cuenta principal).
2. Haz clic en **"Agregar proyecto"** (o "Crear un proyecto").
3. Asigna un nombre al proyecto (por ejemplo: `importadora-beyker09`).
4. Desactiva Google Analytics (opcional) y haz clic en **"Crear proyecto"**. Espera unos segundos a que se cree.

---

### Paso 2: Registrar la Aplicación Web y Copiar Credenciales
1. En el panel principal del proyecto en Firebase, haz clic en el icono de **Web** (`</>`).
2. Escribe el apodo de la app: `Importadora Web`.
3. Haz clic en **"Registrar app"**.
4. Firebase te mostrará un bloque de código `firebaseConfig` con las siguientes claves:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
5. Abre el archivo [`frontend/src/environments/environment.ts`](file:///c:/Users/USUARIO/Documents/IMPORTACIONES/frontend/src/environments/environment.ts) en tu proyecto y reemplaza los valores de `firebase`:

```typescript
export const environment = {
  production: true,
  whatsappPhone: '59172970461',
  appName: 'Importadora de productos',
  adminEmail: 'cruz.arias.beymar@itsecsucre.edu.bo',
  firebase: {
    apiKey: "AIzaSy...",
    authDomain: "importadora-beyker09.firebaseapp.com",
    projectId: "importadora-beyker09",
    storageBucket: "importadora-beyker09.firebasestorage.app",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef..."
  }
};
```

---

### Paso 3: Activar Cloud Firestore (Base de Datos)
1. En el menú lateral izquierdo de Firebase Console, ve a **Compilación > Firestore Database**.
2. Haz clic en **"Crear base de datos"**.
3. Selecciona la ubicación más cercana (por ejemplo: `nam5 (us-central)` o `southamerica-east1`).
4. En modo de seguridad, puedes elegir "Modo producción" o "Modo de prueba" y pulsar **Habilitar**.
5. Ve a la pestaña **Reglas** (Rules) de Firestore, borra lo que haya y pega las siguientes reglas exactas (también disponibles en `firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return request.auth != null && 
        request.auth.token.email.lower() == 'cruz.arias.beymar@itsecsucre.edu.bo';
    }

    match /categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'active_reservation', 'updated_at'])
                   && request.resource.data.status == 'reservado'
                   && resource.data.status == 'disponible';
    }

    match /reservations/{reservationId} {
      allow read: if true;
      allow create: if request.resource.data.status == 'activa';
      allow update, delete: if isAdmin();
    }

    match /sales_history/{saleId} {
      allow read, write: if isAdmin();
    }
  }
}
```
6. Haz clic en **"Publicar"** (Publish).

---

### Paso 4: Activar Autenticación (Firebase Authentication)
1. En el menú izquierdo, ve a **Compilación > Authentication**.
2. Haz clic en **"Comenzar"** (Get Started).
3. En la pestaña **Método de acceso** (Sign-in method):
   - **Correo electrónico/contraseña:** Habilítalo y guarda.
   - **Google:** Habilítalo, selecciona tu correo de soporte y guarda.
4. En la pestaña **Users** (Usuarios), haz clic en **"Agregar usuario"**:
   - **Correo electrónico:** `cruz.arias.beymar@itsecsucre.edu.bo`
   - **Contraseña:** Elige una contraseña segura (por ejemplo: `Admin2026!`).
   - Haz clic en **"Agregar usuario"**.

---

### Paso 5: Activar Firebase Storage (Para Fotos de Productos)
1. En el menú izquierdo, ve a **Compilación > Storage**.
2. Haz clic en **"Comenzar"**, elige ubicación y pulsa **Siguiente > Finalizar**.
3. Ve a la pestaña **Reglas** (Rules) y pega las siguientes reglas (disponibles en `storage.rules`):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.email.lower() == 'cruz.arias.beymar@itsecsucre.edu.bo';
    }
  }
}
```
4. Haz clic en **"Publicar"**.

---

### Paso 6: Sincronizar Catálogo Inicial con 1 Clic
Una vez que pegues tus credenciales en `environment.ts` e inicies sesión en tu panel administrador (`/#/admin/login`), verás en la parte superior el botón:  
**`Cargar a Firestore`**.  
Al pulsarlo, el sistema migrará automáticamente todas tus categorías, productos existentes, reservas y ventas de prueba directamente a tu nueva base de datos Cloud Firestore.

---

## 🚀 3. Despliegue Gratuito en GitHub Pages

Dado que tu dominio/usuario es `beyker09`, el despliegue es completamente automático:

### Opción A: Despliegue Automático con GitHub Actions (Recomendado)
El proyecto ya cuenta con el archivo de automatización [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml).

1. Crea tu repositorio en GitHub bajo tu cuenta: `https://github.com/beyker09/IMPORTACIONES` (o el nombre que prefieras).
2. Sube tus cambios a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Migracion a Firebase Serverless y GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/beyker09/IMPORTACIONES.git
   git push -u origin main
   ```
3. En GitHub, ve a tu repositorio > **Settings > Pages**:
   - En **Build and deployment > Source**, selecciona **GitHub Actions**.
4. ¡Listo! En 1 minuto tu catálogo estará disponible públicamente en:  
   `https://beyker09.github.io/IMPORTACIONES/`

### Opción B: Despliegue Manual con el script integrado
Si prefieres generar los archivos tú mismo:
1. En la carpeta `frontend`, ejecuta:
   ```bash
   npm run build:gh-pages
   ```
2. Los archivos listos para producción se generarán en: `frontend/dist/importadora-frontend/browser`.
3. Sube el contenido de esa carpeta a la rama `gh-pages` de tu repositorio.

---

## 💻 4. Cómo Probar Localmente en tu Computadora

No necesitas tener XAMPP, MySQL ni PHP abiertos. Solo ejecuta:

1. Haz doble clic en el archivo [`INICIAR_SISTEMA.bat`](file:///c:/Users/USUARIO/Documents/IMPORTACIONES/INICIAR_SISTEMA.bat) o en tu terminal:
   ```bash
   cd frontend
   npm start
   ```
2. Abre en tu navegador:
   - **Catálogo de Clientes:** `http://localhost:4200/`
   - **Panel Administrativo:** `http://localhost:4200/#/admin/login`
3. Ingresa con:
   - **Correo:** `cruz.arias.beymar@itsecsucre.edu.bo`
   - **Contraseña:** La contraseña que creaste en Firebase (o en modo local cualquier texto si aún no agregaste las claves).
