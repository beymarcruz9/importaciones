<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminProductResource;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Listado administrativo de productos (incluye disponibles, reservados y vendidos).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Product::with(['category', 'images', 'activeReservation']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $products = $query->latest()->paginate($request->get('per_page', 15));

        return AdminProductResource::collection($products);
    }

    /**
     * Registrar nuevo producto con costo, precio de venta e imágenes (1 a 3 fotos).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name'        => 'required|string|max:200',
            'description' => 'nullable|string',
            'cost_price'  => 'required|numeric|min:0',
            'sale_price'  => 'required|numeric|min:0',
            'status'      => 'required|in:disponible,reservado,vendido',
            'images'      => 'required|array|min:1|max:3',
            'images.*'    => 'required|url',
        ]);

        $product = DB::transaction(function () use ($validated) {
            $product = Product::create([
                'category_id' => $validated['category_id'] ?? null,
                'name'        => $validated['name'],
                'slug'        => Str::slug($validated['name']) . '-' . Str::random(5),
                'description' => $validated['description'] ?? null,
                'cost_price'  => $validated['cost_price'],
                'sale_price'  => $validated['sale_price'],
                'status'      => $validated['status'],
                'is_active'   => true,
            ]);

            // Guardar de 1 a 3 imágenes para el carrusel
            foreach ($validated['images'] as $index => $imageUrl) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_url'  => $imageUrl,
                    'sort_order' => $index,
                    'is_primary' => ($index === 0),
                ]);
            }

            return $product;
        });

        return response()->json([
            'message' => 'Producto creado exitosamente.',
            'product' => new AdminProductResource($product->fresh(['category', 'images'])),
        ], 201);
    }

    /**
     * Ver detalle administrativo de un producto
     */
    public function show(int $id): JsonResponse
    {
        $product = Product::with(['category', 'images', 'reservations', 'salesHistory'])
            ->findOrFail($id);

        return response()->json([
            'product' => new AdminProductResource($product),
        ]);
    }

    /**
     * Actualizar producto. Si el estado cambia a 'vendido', el ProductObserver
     * insertará automáticamente el registro en 'sales_history'.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name'        => 'required|string|max:200',
            'description' => 'nullable|string',
            'cost_price'  => 'required|numeric|min:0',
            'sale_price'  => 'required|numeric|min:0',
            'status'      => 'required|in:disponible,reservado,vendido',
            'is_active'   => 'sometimes|boolean',
            'images'      => 'nullable|array|min:1|max:3',
            'images.*'    => 'required|url',
        ]);

        DB::transaction(function () use ($product, $validated) {
            $product->update([
                'category_id' => $validated['category_id'] ?? $product->category_id,
                'name'        => $validated['name'],
                'description' => $validated['description'] ?? $product->description,
                'cost_price'  => $validated['cost_price'],
                'sale_price'  => $validated['sale_price'],
                'status'      => $validated['status'],
                'is_active'   => $validated['is_active'] ?? $product->is_active,
            ]);

            // Si se suministraron imágenes, reemplazarlas preservando el rango de 1 a 3 fotos
            if (!empty($validated['images'])) {
                $product->images()->delete();
                foreach ($validated['images'] as $index => $imageUrl) {
                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_url'  => $imageUrl,
                        'sort_order' => $index,
                        'is_primary' => ($index === 0),
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Producto actualizado exitosamente.',
            'product' => new AdminProductResource($product->fresh(['category', 'images'])),
        ]);
    }

    /**
     * Actualización rápida de estado (disponible, reservado, vendido)
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:disponible,reservado,vendido',
        ]);

        $product = Product::findOrFail($id);
        $product->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Estado del producto actualizado.',
            'product' => new AdminProductResource($product->fresh(['category', 'images'])),
        ]);
    }

    /**
     * Eliminar producto (Soft Delete)
     */
    public function destroy(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json([
            'message' => 'Producto eliminado correctamente.',
        ]);
    }
}
