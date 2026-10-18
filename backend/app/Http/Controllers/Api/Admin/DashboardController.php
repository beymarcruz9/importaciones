<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Reservation;
use App\Models\SaleHistory;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Devuelve las 4 tarjetas de métricas clave y los datos para el gráfico de ventas mensual.
     */
    public function index(): JsonResponse
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // 1. Métricas Clave (Tarjetas)
        // A. Ingresos totales del mes en curso
        $totalRevenueMonth = (float) SaleHistory::whereBetween('sold_at', [$startOfMonth, $endOfMonth])
            ->sum('sale_price');

        // B. Ganancia neta del mes (Precio Venta - Precio Costo)
        $netProfitMonth = (float) SaleHistory::whereBetween('sold_at', [$startOfMonth, $endOfMonth])
            ->sum('net_profit');

        // C. Total de productos vendidos (mes actual y total histórico)
        $totalSoldMonth = SaleHistory::whereBetween('sold_at', [$startOfMonth, $endOfMonth])->count();
        $totalSoldAllTime = SaleHistory::count();

        // D. Reservas activas (con vigencia vigente)
        $activeReservations = Reservation::where('status', Reservation::STATUS_ACTIVA)
            ->where('expires_at', '>', $now)
            ->count();

        // Total de productos en inventario por estado
        $inventoryStats = [
            'disponibles' => Product::where('status', Product::STATUS_DISPONIBLE)->where('is_active', true)->count(),
            'reservados'  => Product::where('status', Product::STATUS_RESERVADO)->count(),
            'vendidos'    => Product::where('status', Product::STATUS_VENDIDO)->count(),
        ];

        // 2. Gráficos Visuales: Historial de ventas mes a mes (últimos 6 meses)
        $monthlySalesChart = $this->getMonthlySalesHistory(6);

        return response()->json([
            'metrics' => [
                'total_revenue_month' => $totalRevenueMonth,
                'net_profit_month'    => $netProfitMonth,
                'total_sold_month'    => $totalSoldMonth,
                'total_sold_all_time' => $totalSoldAllTime,
                'active_reservations' => $activeReservations,
                'inventory'           => $inventoryStats,
            ],
            'chart' => $monthlySalesChart,
        ]);
    }

    /**
     * Construye la serie temporal agrupada mes a mes para el gráfico de barras.
     */
    private function getMonthlySalesHistory(int $monthsCount = 6): array
    {
        $labels = [];
        $revenueData = [];
        $profitData = [];
        $unitsData = [];

        for ($i = $monthsCount - 1; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $start = $month->copy()->startOfMonth();
            $end = $month->copy()->endOfMonth();

            // Formato amigable en español (e.g. "Oct 2026")
            $label = $month->locale('es')->isoFormat('MMM YYYY');
            $labels[] = ucfirst($label);

            $salesQuery = SaleHistory::whereBetween('sold_at', [$start, $end]);
            $revenue = (float) (clone $salesQuery)->sum('sale_price');
            $profit = (float) (clone $salesQuery)->sum('net_profit');
            $count = (int) (clone $salesQuery)->count();

            $revenueData[] = round($revenue, 2);
            $profitData[] = round($profit, 2);
            $unitsData[] = $count;
        }

        return [
            'labels'   => $labels,
            'datasets' => [
                [
                    'label' => 'Ingresos Totales (Venta)',
                    'data'  => $revenueData,
                ],
                [
                    'label' => 'Ganancia Neta (Utilidad)',
                    'data'  => $profitData,
                ],
                [
                    'label' => 'Unidades Vendidas',
                    'data'  => $unitsData,
                ],
            ],
        ];
    }
}
