<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    /**
     * Listado administrativo de reservas con detalles del producto y cliente.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Reservation::with(['product' => function ($q) {
            $q->with('images');
        }]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $reservations = $query->latest('reserved_at')->paginate($request->get('per_page', 15));

        // Mapear con datos de tiempo restante
        $items = $reservations->getCollection()->map(function ($res) {
            return [
                'id'             => $res->id,
                'customer_name'  => $res->customer_name,
                'customer_phone' => $res->customer_phone,
                'reserved_at'    => $res->reserved_at?->format('Y-m-d H:i:s'),
                'expires_at'     => $res->expires_at?->format('Y-m-d H:i:s'),
                'status'         => $res->status,
                'is_expired'     => $res->isExpired(),
                'days_remaining' => $res->days_remaining,
                'notes'          => $res->notes,
                'product'        => [
                    'id'            => $res->product?->id,
                    'name'          => $res->product?->name,
                    'sale_price'    => $res->product?->sale_price,
                    'status'        => $res->product?->status,
                    'primary_image' => $res->product?->images?->firstWhere('is_primary', true)?->image_url 
                                       ?? $res->product?->images?->first()?->image_url,
                ],
            ];
        });

        return response()->json([
            'data'       => $items,
            'pagination' => [
                'total'        => $reservations->total(),
                'per_page'     => $reservations->perPage(),
                'current_page' => $reservations->currentPage(),
                'last_page'    => $reservations->lastPage(),
            ],
        ]);
    }

    /**
     * Cancelar manualmente una reserva y liberar el producto a 'disponible'
     */
    public function cancel(int $id): JsonResponse
    {
        $reservation = Reservation::findOrFail($id);

        DB::transaction(function () use ($reservation) {
            $reservation->update([
                'status' => Reservation::STATUS_CANCELADA,
                'notes'  => ($reservation->notes ? $reservation->notes . "\n" : '') . 'Cancelada manualmente desde el panel administrativo.',
            ]);

            $product = $reservation->product;
            if ($product && $product->status === Product::STATUS_RESERVADO) {
                $product->update(['status' => Product::STATUS_DISPONIBLE]);
            }
        });

        return response()->json([
            'message' => 'Reserva cancelada y producto liberado a disponible.',
        ]);
    }

    /**
     * Marcar reserva como concretada/completada (convirtiendo el producto a vendido)
     */
    public function complete(int $id): JsonResponse
    {
        $reservation = Reservation::findOrFail($id);
        $product = $reservation->product;

        if (!$product) {
            return response()->json(['message' => 'El producto asociado no existe.'], 404);
        }

        DB::transaction(function () use ($reservation, $product) {
            // Al actualizar el producto a 'vendido', el ProductObserver creará la venta en sales_history
            $product->update([
                'status' => Product::STATUS_VENDIDO,
            ]);

            $reservation->update([
                'status' => Reservation::STATUS_COMPLETADA,
                'notes'  => 'Reserva finalizada como Venta exitosa.',
            ]);
        });

        return response()->json([
            'message' => 'Reserva completada con éxito. Producto marcado como Vendido y registrado en contabilidad.',
        ]);
    }
}
