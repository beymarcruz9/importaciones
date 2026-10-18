<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\Reservation;
use App\Models\SaleHistory;
use Illuminate\Support\Facades\Log;

class ProductObserver
{
    /**
     * Se ejecuta cuando un producto se actualiza.
     * Detecta la transición de estado hacia 'vendido' y genera automáticamente
     * el registro en el historial de ventas y contabilidad.
     */
    public function updated(Product $product): void
    {
        // Verificar si el estado cambió a 'vendido'
        if ($product->isDirty('status') && $product->status === Product::STATUS_VENDIDO) {
            $costPrice = (float) $product->cost_price;
            $salePrice = (float) $product->sale_price;
            $netProfit = $salePrice - $costPrice;

            // Buscar si existía una reserva activa para asociar el nombre del cliente
            $activeReservation = $product->reservations()
                ->where('status', Reservation::STATUS_ACTIVA)
                ->latest()
                ->first();

            $customerName = $activeReservation ? $activeReservation->customer_name : null;

            // 1. Crear registro en Historial de Ventas
            SaleHistory::create([
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'cost_price'   => $costPrice,
                'sale_price'   => $salePrice,
                'net_profit'   => $netProfit,
                'customer_name'=> $customerName,
                'sold_at'      => now(),
                'notes'        => 'Venta registrada automáticamente al cambiar estado a Vendido.',
            ]);

            // 2. Si tenía una reserva activa, marcarla como completada
            if ($activeReservation) {
                $activeReservation->update([
                    'status' => Reservation::STATUS_COMPLETADA,
                    'notes'  => 'Reserva completada con éxito tras confirmarse la venta.',
                ]);
            }

            Log::info("Venta registrada automáticamente para producto #{$product->id} - {$product->name}. Monto: {$salePrice}, Ganancia neta: {$netProfit}");
        }
    }
}
