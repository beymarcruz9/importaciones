<?php

use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\ReservationController as AdminReservationController;
use App\Http\Controllers\Api\Admin\SalesHistoryController as AdminSalesHistoryController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PublicProductController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Importadora de productos
|--------------------------------------------------------------------------
*/

// =========================================================================
// RUTAS PÚBLICAS (MÓDULO 1: FRONTEND PÚBLICO / CLIENTES)
// Sin autenticación ni registro requerido
// =========================================================================
Route::prefix('public')->group(function () {
    // Catálogo de productos (los 'vendidos' se excluyen automáticamente)
    Route::get('/products', [PublicProductController::class, 'index']);
    Route::get('/products/{slugOrId}', [PublicProductController::class, 'show']);
    Route::get('/categories', [PublicProductController::class, 'categories']);

    // Crear reserva desde el Modal WhatsApp (asigna vigencia exacta de 7 días)
    Route::post('/products/{id}/reserve', [PublicProductController::class, 'reserve']);
});

// Autenticación de Administradores
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// =========================================================================
// RUTAS PROTEGIDAS (MÓDULOS 2 Y 3: PANEL ADMINISTRADOR Y CONTABILIDAD)
// Protegidas con token Bearer vía Laravel Sanctum
// =========================================================================
Route::middleware('auth:sanctum')->group(function () {
    // Sesión
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::prefix('admin')->group(function () {
        // MÓDULO 3: Dashboard, Métricas del Mes y Gráficos
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // MÓDULO 2: CRUD de Productos (con costo, venta y 1-3 imágenes)
        Route::apiResource('products', AdminProductController::class);
        Route::patch('products/{id}/status', [AdminProductController::class, 'updateStatus']);

        // MÓDULO 2: Gestión de Reservas y Expiración a 7 días
        Route::get('reservations', [AdminReservationController::class, 'index']);
        Route::post('reservations/{id}/cancel', [AdminReservationController::class, 'cancel']);
        Route::post('reservations/{id}/complete', [AdminReservationController::class, 'complete']);

        // MÓDULO 3: Historial Contable de Ventas
        Route::get('sales-history', [AdminSalesHistoryController::class, 'index']);
    });
});
