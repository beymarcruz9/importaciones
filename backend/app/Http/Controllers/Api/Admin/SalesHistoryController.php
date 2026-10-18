<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SaleHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesHistoryController extends Controller
{
    /**
     * Tabla de Historial de Ventas y Contabilidad.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SaleHistory::with(['product']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('sold_at', [
                $request->start_date . ' 00:00:00',
                $request->end_date . ' 23:59:59',
            ]);
        }

        $sales = $query->latest('sold_at')->paginate($request->get('per_page', 15));

        return response()->json([
            'data'       => $sales->items(),
            'pagination' => [
                'total'        => $sales->total(),
                'per_page'     => $sales->perPage(),
                'current_page' => $sales->currentPage(),
                'last_page'    => $sales->lastPage(),
            ],
            'summary'    => [
                'total_revenue' => (float) (clone $query)->sum('sale_price'),
                'total_profit'  => (float) (clone $query)->sum('net_profit'),
            ],
        ]);
    }
}
