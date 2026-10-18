<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PublicProductController extends Controller
{
    /**
     * Catálogo público de productos.
     * REQUISITO: Los productos con estado 'vendido' se ocultan automáticamente.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::publicCatalog();

        // Filtro opcional por categoría
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Búsqueda por nombre
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filtro por estado ('disponible', 'reservado')
        if ($request->filled('status') && in_array($request->status, [Product::STATUS_DISPONIBLE, Product::STATUS_RESERVADO])) {
            $query->where('status', $request->status);
        }

        $products = $query->latest()->paginate($request->get('per_page', 12));

        return PublicProductResource::collection($products);
    }

    /**
     * Vista de detalle del producto (con hasta 3 imágenes para el carrusel).
     */
    public function show(string $slugOrId): JsonResponse
    {
        $product = Product::publicCatalog()
            ->where(function ($query) use ($slugOrId) {
                if (is_numeric($slugOrId)) {
                    $query->where('id', $slugOrId);
                } else {
                    $query->where('slug', $slugOrId);
                }
            })
            ->firstOrFail();

        return response()->json([
            'data' => new PublicProductResource($product),
        ]);
    }

    /**
     * Listado público de categorías activas para filtros en el catálogo.
     */
    public function categories(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true)->where('status', '!=', Product::STATUS_VENDIDO);
            }])
            ->get();

        return response()->json(['data' => $categories]);
    }

    /**
     * Registrar la reserva solicitada por el cliente desde el modal de WhatsApp.
     * Asigna vigencia exacta de 7 días y cambia el estado del producto a 'reservado'.
     */
    public function reserve(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'  => 'required|string|max:150',
            'customer_phone' => 'nullable|string|max:50',
            'notes'          => 'nullable|string|max:500',
        ]);

        $product = Product::where('id', $id)
            ->where('is_active', true)
            ->firstOrFail();

        if ($product->status === Product::STATUS_VENDIDO) {
            return response()->json([
                'message' => 'El producto ya ha sido vendido y no puede reservarse.',
            ], 422);
        }

        if ($product->status === Product::STATUS_RESERVADO) {
            return response()->json([
                'message' => 'Este producto ya cuenta con una reserva activa en curso.',
            ], 422);
        }

        // Crear la reserva con vigencia exacta de 7 días dentro de una transacción
        $reservation = DB::transaction(function () use ($product, $validated) {
            $reservation = Reservation::create([
                'product_id'     => $product->id,
                'customer_name'  => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'reserved_at'    => now(),
                'expires_at'     => now()->addDays(Reservation::DURATION_DAYS), // 7 días exactos
                'status'         => Reservation::STATUS_ACTIVA,
                'notes'          => $validated['notes'] ?? 'Reserva solicitada vía modal WhatsApp',
            ]);

            // Actualizar producto a estado 'reservado'
            $product->update([
                'status' => Product::STATUS_RESERVADO,
            ]);

            return $reservation;
        });

        return response()->json([
            'message'     => 'Reserva registrada exitosamente por 7 días.',
            'reservation' => $reservation,
            'expires_at'  => $reservation->expires_at->toDateTimeString(),
            'product'     => new PublicProductResource($product->fresh(['category', 'images'])),
        ], 201);
    }
}
