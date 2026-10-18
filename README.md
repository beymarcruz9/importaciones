# IMPORTADORA DE PRODUCTOS (PLANTILLA BASE MARCA BLANCA)
> **Arquitectura Full-Stack:** Angular (Tailwind CSS) + Laravel (RESTful API) + MySQL / PostgreSQL

---

## 📌 1. Visión General y Decisiones de Arquitectura

El sistema está diseñado como una **plantilla base "marca blanca"** de alta escalabilidad, modularidad y rendimiento para importadoras y comercios de productos físicos.

### Principios Clave:
1. **Catálogo Público Ultra-rápido y Seguro:**
   - No requiere registro ni login para los clientes finales.
   - Los productos con estado `vendido` se excluyen automáticamente a nivel de base de datos (`where status != 'vendido'`), optimizando ancho de banda y renderizado.
   - **Privacidad Financiera:** El campo `cost_price` (precio de costo) está protegido mediante `PublicProductResource` y el atributo `$hidden` en Eloquent; el cliente público **nunca** puede conocer el costo o margen de ganancia.

2. **Integración con WhatsApp:**
   - Botón doble Call-To-Action: **"Pedir por WhatsApp"** y **"Reservar"**.
   - Modal interactivo para capturar el **"Nombre del Cliente"**.
   - Redirección dinámica a `https://wa.me/59172970461` con los mensajes prellenados exactos requeridos:
     - **Compra:** `Hola, quiero comprar el producto [Nombre del Producto] de precio [Precio].`
     - **Reserva:** `Hola, quiero reservar el producto [Nombre del Producto] de precio [Precio].`

3. **Lógica de Reservas con Expiración a 7 Días:**
   - Cada reserva registra la fecha de expiración calculada a 7 días exactos (`now()->addDays(7)`).
   - Un **Console Command** en Laravel (`reservations:check-expired`) programado con el Task Scheduler (`Schedule::command()->daily()`) analiza diariamente las reservas vencidas y regresa automáticamente los productos de `reservado` a `disponible`.

4. **Historial de Ventas y Contabilidad Automática:**
   - Implementado mediante `ProductObserver`. Cada vez que el estado de un producto cambia a `vendido`, se genera automáticamente un registro inmutable en `sales_history` con:
     - `sale_price` (monto cobrado)
     - `cost_price` (costo histórico al momento de venta)
     - `net_profit = sale_price - cost_price` (ganancia neta)
     - `sold_at = now()`
   - Métricas en el Dashboard del administrador:
     - **Ingresos totales del mes**
     - **Ganancia neta del mes**
     - **Total de productos vendidos**
     - **Reservas activas**
     - **Gráfico visual de barras mes a mes**

---

## 🗄️ 2. Estructura de la Base de Datos Relacional

El archivo ejecutable se encuentra en: [`database/schema.sql`](file:///c:/Users/USUARIO/Documents/BEYKER/IMPORTADORA/database/schema.sql).

### Tablas Principales:
1. `users`: Administradores con contraseñas cifradas (bcrypt) y roles.
2. `personal_access_tokens`: Tokens de autenticación Bearer mediante Laravel Sanctum.
3. `categories`: Clasificación de productos (slug, nombre, estado).
4. `products`: Catálogo general con `cost_price` (oculto) y `sale_price` (público), estados: `['disponible', 'reservado', 'vendido']`.
5. `product_images`: Carrusel de **1 a 3 fotos** por producto (`image_url`, `is_primary`, `sort_order`).
6. `reservations`: Registro de reservas con `customer_name`, `customer_phone`, `reserved_at`, `expires_at` (7 días exactos) y estado (`activa`, `completada`, `expirada`, `cancelada`).
7. `sales_history`: Registro contable histórico con `sale_price`, `cost_price`, `net_profit` y `sold_at`.

---

## 🚀 3. Estructura de Archivos del Proyecto

```text
IMPORTADORA/
├── database/
│   └── schema.sql                          # Script SQL completo con tablas, índices y datos semilla
├── backend/                                # API RESTful en Laravel (PHP)
│   ├── app/
│   │   ├── Console/
│   │   │   ├── Commands/
│   │   │   │   └── CheckExpiredReservations.php  # Tarea Artisan para expirar reservas a 7 días
│   │   │   └── Kernel.php                  # Scheduler diario (00:01)
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── AuthController.php      # Login y Logout de administradores
│   │   │   │   ├── PublicProductController.php # Catálogo público y reserva desde WhatsApp
│   │   │   │   └── Admin/
│   │   │   │       ├── ProductController.php       # CRUD productos (costos y 1-3 imágenes)
│   │   │   │       ├── ReservationController.php   # Control de reservas
│   │   │   │       ├── DashboardController.php     # 4 KPIs y gráfico mensual
│   │   │   │       └── SalesHistoryController.php  # Reporte contable
│   │   │   └── Resources/
│   │   │       ├── PublicProductResource.php       # Oculta cost_price
│   │   │       └── AdminProductResource.php        # Incluye cost_price y margen
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Category.php
│   │   │   ├── Product.php                 # Scopes, casts y relaciones
│   │   │   ├── ProductImage.php            # 1 a 3 imágenes para carrusel
│   │   │   ├── Reservation.php             # Lógica de 7 días
│   │   │   └── SaleHistory.php             # Registro contable
│   │   ├── Observers/
│   │   │   └── ProductObserver.php         # Dispara venta automática al cambiar a 'vendido'
│   │   └── Providers/
│   │       └── AppServiceProvider.php      # Registro de Observer
│   ├── routes/
│   │   ├── api.php                         # Rutas públicas y protegidas con Sanctum
│   │   └── console.php                     # Programación de tareas (Laravel 11)
│   ├── composer.json
│   └── .env.example
└── frontend/                               # Aplicación Angular con Tailwind CSS
    ├── src/
    │   ├── app/
    │   │   ├── components/
    │   │   │   ├── navbar/                 # "Importadora de productos" + buscador
    │   │   │   ├── product-catalog/        # Grid responsiva sin productos vendidos
    │   │   │   ├── product-detail/         # Carrusel (1-3 fotos) y botones CTA
    │   │   │   ├── whatsapp-modal/         # Modal "Nombre del Cliente" + link dinámico
    │   │   │   └── admin/
    │   │   │       ├── admin-layout/       # Layout administrativo
    │   │   │       ├── admin-login/        # Acceso admin
    │   │   │       ├── admin-dashboard/    # 4 Tarjetas métricas + Gráfico de barras
    │   │   │       ├── admin-products/     # CRUD productos y fotos
    │   │   │       ├── admin-reservations/ # Gestión de reservas (7 días)
    │   │   │       └── admin-sales-history/# Historial de ventas
    │   │   ├── guards/auth.guard.ts        # Protección de rutas
    │   │   ├── interceptors/auth.interceptor.ts # Bearer token
    │   │   ├── models/product.model.ts     # Interfaces TypeScript
    │   │   ├── services/
    │   │   │   ├── auth.service.ts
    │   │   │   ├── product.service.ts
    │   │   │   ├── reservation.service.ts
    │   │   │   ├── dashboard.service.ts
    │   │   │   └── whatsapp.service.ts     # Formato exacto de mensaje
    │   │   ├── app.routes.ts
    │   │   ├── app.config.ts
    │   │   └── app.component.ts
    │   ├── environments/
    │   │   └── environment.ts              # API URL y Teléfono WhatsApp (59172970461)
    │   ├── index.html                      # Título: "Importadora de productos"
    │   ├── styles.css                      # Directivas Tailwind CSS
    │   └── main.ts
    ├── angular.json
    ├── tailwind.config.js
    ├── tsconfig.json
    └── package.json
```

---

## ⚙️ 4. Guía de Puesta en Marcha Paso a Paso

### Paso 1: Inicializar la Base de Datos en MySQL
Abre tu consola o phpMyAdmin y ejecuta:
```bash
mysql -u root -p < database/schema.sql
```
*Esto creará la base de datos `importadora_db` con las 7 tablas relacionadas y datos de prueba inmediatos.*

### Paso 2: Configurar y Ejecutar el Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```
El servidor backend quedará disponible en: `http://localhost:8000`.

#### Configuración del Cron Job para la Expiración a 7 Días:
En tu servidor de producción (Linux / cPanel / Cron):
```bash
* * * * * cd /ruta/a/tu/backend && php artisan schedule:run >> /dev/null 2>&1
```
Para probar manualmente la expiración en desarrollo:
```bash
php artisan reservations:check-expired
```

### Paso 3: Configurar y Ejecutar el Frontend (Angular + Tailwind CSS)
```bash
cd frontend
npm install
npm start
```
La aplicación web abrirá en: `http://localhost:4200`.

### Credenciales Administrativas por Defecto:
- **URL Admin:** `http://localhost:4200/admin/login`
- **Correo:** `admin@importadora.com`
- **Contraseña:** `password123`
