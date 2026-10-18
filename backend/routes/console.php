<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes & Task Scheduler (Laravel 11+)
|--------------------------------------------------------------------------
|
| Tarea programada diaria: verifica reservas expiradas con vigencia > 7 días
| y regresa el estado del producto a 'disponible'.
|
*/

Schedule::command('reservations:check-expired')
    ->daily()
    ->at('00:01')
    ->name('verificar_reservas_expiradas')
    ->withoutOverlapping()
    ->runInBackground();
