<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_DISPONIBLE = 'disponible';
    public const STATUS_RESERVADO = 'reservado';
    public const STATUS_VENDIDO = 'vendido';

    public const STATUSES = [
        self::STATUS_DISPONIBLE,
        self::STATUS_RESERVADO,
        self::STATUS_VENDIDO,
    ];

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'description',
        'cost_price',
        'sale_price',
        'status',
        'is_active',
    ];

    /**
     * Ocultar por defecto campos sensibles como precio de costo a nivel de serialización
     * (Los controladores de administración usan AdminProductResource explícitamente).
     */
    protected $hidden = [
        'cost_price',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'is_active'  => 'boolean',
    ];

    /**
     * Relación con la Categoría
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Relación con las imágenes (1 a 3 imágenes)
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order', 'asc');
    }

    /**
     * Imagen principal del producto
     */
    public function primaryImage(): HasOne
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Relación con las reservas
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class)->orderBy('created_at', 'desc');
    }

    /**
     * Reserva activa actual si existe
     */
    public function activeReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)
            ->where('status', Reservation::STATUS_ACTIVA)
            ->where('expires_at', '>', now())
            ->latestOfMany();
    }

    /**
     * Historial de ventas asociadas a este producto
     */
    public function salesHistory(): HasMany
    {
        return $this->hasMany(SaleHistory::class)->orderBy('sold_at', 'desc');
    }

    /**
     * Scope para el Catálogo Público:
     * - Oculta automáticamente productos con estado 'vendido'
     * - Exige que el producto esté marcado como activo
     */
    public function scopePublicCatalog(Builder $query): Builder
    {
        return $query->where('is_active', true)
                     ->where('status', '!=', self::STATUS_VENDIDO)
                     ->with(['category', 'images']);
    }

    public function isAvailable(): bool
    {
        return $this->status === self::STATUS_DISPONIBLE;
    }

    public function isReserved(): bool
    {
        return $this->status === self::STATUS_RESERVADO;
    }

    public function isSold(): bool
    {
        return $this->status === self::STATUS_VENDIDO;
    }

    protected static function booted()
    {
        static::creating(function ($product) {
            if (empty($product->slug)) {
                $baseSlug = Str::slug($product->name);
                $product->slug = $baseSlug . '-' . Str::random(5);
            }
        });
    }
}
