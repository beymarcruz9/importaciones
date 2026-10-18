<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleHistory extends Model
{
    use HasFactory;

    protected $table = 'sales_history';

    protected $fillable = [
        'product_id',
        'product_name',
        'cost_price',
        'sale_price',
        'net_profit',
        'customer_name',
        'sold_at',
        'notes',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'net_profit' => 'decimal:2',
        'sold_at'    => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
