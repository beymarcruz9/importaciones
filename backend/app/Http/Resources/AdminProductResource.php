<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductResource extends JsonResource
{
    /**
     * Transformar el recurso para el panel administrativo con métricas de costo y margen.
     */
    public function toArray(Request $request): array
    {
        $cost = (float) $this->cost_price;
        $sale = (float) $this->sale_price;
        $margin = $sale - $cost;
        $marginPercent = $cost > 0 ? round(($margin / $cost) * 100, 2) : 100;

        return [
            'id'             => $this->id,
            'category_id'    => $this->category_id,
            'category'       => $this->whenLoaded('category', function () {
                return [
                    'id'   => $this->category->id,
                    'name' => $this->category->name,
                ];
            }),
            'name'           => $this->name,
            'slug'           => $this->slug,
            'description'    => $this->description,
            'cost_price'     => $cost,
            'sale_price'     => $sale,
            'unit_margin'    => $margin,
            'margin_percent' => $marginPercent,
            'status'         => $this->status,
            'is_active'      => (bool) $this->is_active,
            'images'         => $this->whenLoaded('images', function () {
                return $this->images->map(function ($img) {
                    return [
                        'id'         => $img->id,
                        'image_url'  => $img->image_url,
                        'is_primary' => (bool) $img->is_primary,
                        'sort_order' => $img->sort_order,
                    ];
                });
            }),
            'primary_image'  => $this->images->firstWhere('is_primary', true)->image_url 
                ?? $this->images->first()->image_url 
                ?? null,
            'active_reservation' => $this->whenLoaded('activeReservation'),
            'created_at'     => $this->created_at?->toISOString(),
            'updated_at'     => $this->updated_at?->toISOString(),
        ];
    }
}
