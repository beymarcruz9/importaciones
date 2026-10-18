<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\Reservation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckExpiredReservations extends Command
{
    /**
     * Nombre y firma del comando Artisan en Laravel
     *
     * @var string
     */
    protected $signature = 'reservations:check-expired';

    /**
     * Descripción del comando
     *
     * @var string
     */
    protected $description = 'Verifica las reservas vencidas (más de 7 días) y libera los productos cambiando su estado a Disponible.';

    /**
     * Ejecución del comando de expiración
     */
    public function handle(): int
    {
        $this->info('Iniciando verificación de reservas expiradas (vigencia > 7 días)...');

        // Buscar reservas con estado 'activa' cuya fecha límite (expires_at) ya pasó
        $expiredReservations = Reservation::with('product')
            ->where('status', Reservation::STATUS_ACTIVA)
            ->where('expires_at', '<=', now())
            ->get();

        if ($expiredReservations->isEmpty()) {
            $this->info('No se encontraron reservas expiradas pendientes.');
            return Command::SUCCESS;
        }

        $count = 0;

        foreach ($expiredReservations as $reservation) {
            DB::transaction(function () use ($reservation, &$count) {
                // 1. Actualizar estado de la reserva a 'expirada'
                $reservation->update([
                    'status' => Reservation::STATUS_EXPIRADA,
                    'notes'  => ($reservation->notes ? $reservation->notes . "\n" : '') . 'Expirada automáticamente por sistema tras 7 días sin confirmación.',
                ]);

                // 2. Liberar el producto: si sigue en estado 'reservado', cambiarlo a 'disponible'
                $product = $reservation->product;
                if ($product && $product->status === Product::STATUS_RESERVADO) {
                    $product->update([
                        'status' => Product::STATUS_DISPONIBLE,
                    ]);
                    
                    $this->line("Producto liberado: [ID: {$product->id}] '{$product->name}' pasó de Reservado a Disponible.");
                }

                $count++;
            });

            Log::channel('daily')->info("Reserva #{$reservation->id} para producto #{$reservation->product_id} marcada como expirada. Producto liberado.");
        }

        $this->info("Proceso completado exitosamente: {$count} reservas expiradas procesadas.");
        return Command::SUCCESS;
    }
}
