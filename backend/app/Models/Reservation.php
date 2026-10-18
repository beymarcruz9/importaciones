<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    use HasFactory;

    public const STATUS_ACTIVA = 'activa';
    public const STATUS_COMPLETADA = 'completada';
    public const STATUS_EXPIRADA = 'expirada';
    public const STATUS_CANCELADA = 'cancelada';

    public const DURATION_DAYS = 7;

    protected $fillable = [
        'product_id',
        'customer_name',
        'customer_phone',
        'reserved_at',
        'expires_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'reserved_at' => 'datetime',
        'expires_at'  => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Scope para reservas actualmente activas y vigentes
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVA)
                     ->where('expires_at', '>', now());
    }

    /**
     * Scope para reservas vencidas que aún marcan estado activa
     */
    public function scopePendingExpiration(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVA)
                     ->where('expires_at', '<=', now());
    }

    /**
     * Indica si la reserva ha superado los 7 días de vigencia
     */
    public function isExpired(): bool
    {
        return $this->expires_at <= now();
    }

    /**
     * Días o tiempo restante de la reserva
     */
    public function getDaysRemainingAttribute(): int
    {
        if ($this->isExpired()) {
            return 0;
        }
        return (int) now()->diffInDays($this->expires_at, false);
    }
}
