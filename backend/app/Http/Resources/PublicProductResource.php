<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicProductResource extends JsonResource
{
    /**
     * Transformar el recurso para el catálogo público.
     * SEGURIDAD ARQUITECTÓNICA: `cost_price` NUNCA se expone a clientes o público.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'slug'        => $this->slug,
            'description' => $this->description,
            'sale_price'  => (float) $this->sale_price,
            'status'      => $this->status, // 'disponible' o 'reservado' ('vendido' se filtra automáticamente)
            'category'    => $this->whenLoaded('category', function () {
                return [
                    'id'   => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                ];
            }),
            'images'      => $this->whenLoaded('images', function () {
                return $this->images->map(function ($img) {
                    return [
                        'id'         => $img->id,
                        'image_url'  => $img->image_url,
                        'is_primary' => (bool) $img->is_primary,
                        'sort_order' => $img->sort_order,
                    ];
                });
            }),
            'primary_image' => $this->images->firstWhere('is_primary', true)->image_url 
                ?? $this->images->first()->image_url 
                ?? 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=800&q=80',
        ];
    }
}
