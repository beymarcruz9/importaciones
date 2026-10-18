import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService } from '../../../services/dashboard.service';
import { DashboardMetrics, ChartData } from '../../../models/product.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="space-y-8">
      
      <!-- Encabezado de Bienvenida -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Dashboard & Contabilidad
          </h1>
          <p class="text-xs sm:text-sm text-gray-500 mt-1">
            Métricas de rendimiento financiero, rotación de inventario y reservas activas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <a 
            routerLink="/admin/products"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nuevo Producto</span>
          </a>
        </div>
      </div>

      <!-- ESTADO DE CARGA -->
      @if (loading) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          @for (i of [1,2,3,4]; track $index) {
            <div class="h-32 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse"></div>
          }
        </div>
      }

      <!-- 1. MÉTRICAS CLAVE (4 TARJETAS) -->
      @if (!loading && metrics) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <!-- TARJETA 1: INGRESOS TOTALES DEL MES -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Ingresos del Mes</span>
              <div class="text-2xl font-black text-gray-900">
                Bs {{ metrics.total_revenue_month | number:'1.2-2' }}
              </div>
              <span class="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Facturación bruta acumulada
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <!-- TARJETA 2: GANANCIA NETA DEL MES (PRECIO VENTA - PRECIO COSTO) -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-700">Ganancia Neta (Mes)</span>
              <div class="text-2xl font-black text-emerald-600">
                Bs {{ metrics.net_profit_month | number:'1.2-2' }}
              </div>
              <span class="text-[11px] text-gray-500 font-medium">
                Venta menos Costo Histórico
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          <!-- TARJETA 3: TOTAL PRODUCTOS VENDIDOS -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Productos Vendidos</span>
              <div class="text-2xl font-black text-gray-900">
                {{ metrics.total_sold_month }} <span class="text-xs font-normal text-gray-500">unidades este mes</span>
              </div>
              <span class="text-[11px] text-indigo-600 font-medium">
                {{ metrics.total_sold_all_time }} ventas históricas registradas
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>

          <!-- TARJETA 4: RESERVAS ACTIVAS -->
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div class="space-y-1">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-700">Reservas Activas</span>
              <div class="text-2xl font-black text-amber-600">
                {{ metrics.active_reservations }}
              </div>
              <span class="text-[11px] text-gray-500 font-medium">
                Vigencia activa (&le; 7 días)
              </span>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

        </div>
      }

      <!-- 2. GRÁFICO VISUAL: HISTORIAL DE VENTAS MES A MES -->
      <div class="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-gray-900 tracking-tight">
              Historial de Ventas y Ganancias Mes a Mes
            </h2>
            <p class="text-xs text-gray-500">
              Comparativa entre Ingresos Totales de Venta y Utilidad Neta generada.
            </p>
          </div>

          <!-- Leyenda del Gráfico -->
          <div class="flex items-center gap-4 text-xs font-semibold">
            <span class="flex items-center gap-1.5 text-indigo-700">
              <span class="w-3 h-3 rounded bg-indigo-600"></span>
              Ingresos Totales (Bs)
            </span>
            <span class="flex items-center gap-1.5 text-emerald-700">
              <span class="w-3 h-3 rounded bg-emerald-500"></span>
              Ganancia Neta (Bs)
            </span>
          </div>
        </div>

        <!-- RENDERIZADO VISUAL DEL GRÁFICO DE BARRAS -->
        @if (chart && chart.labels.length > 0) {
          <div class="pt-6">
            <div class="grid grid-cols-6 gap-3 sm:gap-6 items-end h-64 border-b border-gray-200 pb-2">
              @for (label of chart.labels; track $index) {
                <div class="flex flex-col items-center h-full justify-end group relative">
                  
                  <!-- Tooltip flotante al pasar el mouse -->
                  <div class="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[10px] rounded-lg p-2 shadow-xl whitespace-nowrap z-20">
                    <p class="font-bold">{{ label }}</p>
                    <p class="text-indigo-300">Ingresos: Bs {{ getRevenue($index) | number:'1.2-2' }}</p>
                    <p class="text-emerald-300">Ganancia: Bs {{ getProfit($index) | number:'1.2-2' }}</p>
                  </div>

                  <!-- Barras agrupadas (Ingresos vs Ganancia) -->
                  <div class="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                    
                    <!-- Barra Ingresos (Indigo) -->
                    <div 
                      class="w-full max-w-[28px] bg-gradient-to-t from-indigo-700 to-indigo-500 rounded-t-md transition-all duration-500 hover:brightness-110"
                      [style.height.%]="getBarHeight(getRevenue($index))">
                    </div>

                    <!-- Barra Ganancia Neta (Emerald) -->
                    <div 
                      class="w-full max-w-[28px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 hover:brightness-110"
                      [style.height.%]="getBarHeight(getProfit($index))">
                    </div>

                  </div>

                  <!-- Etiqueta del Mes -->
                  <span class="text-[11px] font-semibold text-gray-500 mt-2 truncate w-full text-center">
                    {{ label }}
                  </span>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="text-center py-12 text-xs text-gray-400">
            No hay registros de ventas suficientes para proyectar el gráfico.
          </div>
        }

      </div>

      <!-- Resumen del Estado de Inventario -->
      @if (metrics) {
        <div class="bg-slate-50 rounded-2xl p-5 border border-gray-200/80 flex flex-wrap items-center justify-around gap-4 text-center">
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Disponibles en Catálogo</p>
            <p class="text-xl font-black text-emerald-600">{{ metrics.inventory.disponibles }}</p>
          </div>
          <div class="w-px h-8 bg-gray-200 hidden sm:block"></div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Apartados / Reservados</p>
            <p class="text-xl font-black text-amber-600">{{ metrics.inventory.reservados }}</p>
          </div>
          <div class="w-px h-8 bg-gray-200 hidden sm:block"></div>
          <div>
            <p class="text-xs text-gray-500 font-medium uppercase tracking-wider">Productos Vendidos</p>
            <p class="text-xl font-black text-gray-900">{{ metrics.inventory.vendidos }}</p>
          </div>
        </div>
      }

    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  loading = true;
  metrics: DashboardMetrics | null = null;
  chart: ChartData | null = null;
  maxVal = 1;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboardData().subscribe({
      next: (res) => {
        this.metrics = res.metrics;
        this.chart = res.chart;
        this.calculateMaxVal();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando métricas de dashboard:', err);
        this.loading = false;
      },
    });
  }

  calculateMaxVal(): void {
    if (!this.chart || !this.chart.datasets) return;
    const allNumbers: number[] = [];
    this.chart.datasets.forEach((ds) => allNumbers.push(...ds.data));
    this.maxVal = Math.max(...allNumbers, 100);
  }

  getRevenue(index: number): number {
    return this.chart?.datasets?.[0]?.data?.[index] || 0;
  }

  getProfit(index: number): number {
    return this.chart?.datasets?.[1]?.data?.[index] || 0;
  }

  getBarHeight(val: number): number {
    const pct = (val / this.maxVal) * 100;
    return Math.max(pct, 4); // Al menos 4% visible
  }
}
