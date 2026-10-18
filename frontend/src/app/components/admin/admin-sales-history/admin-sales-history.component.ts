import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../services/dashboard.service';
import { SaleHistory } from '../../../models/product.model';

@Component({
  selector: 'app-admin-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Historial de Ventas & Contabilidad</h1>
          <p class="text-xs text-gray-500 mt-1">
            Registro inmutable generado automáticamente cada vez que un producto cambia su estado a "Vendido".
          </p>
        </div>

        @if (summary) {
          <div class="flex items-center gap-3">
            <div class="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-right">
              <span class="text-[10px] text-gray-400 uppercase font-bold block">Venta Total Dashboard</span>
              <span class="text-sm font-black text-gray-900 font-mono">Bs {{ summary.total_revenue | number:'1.2-2' }}</span>
            </div>
            <div class="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right">
              <span class="text-[10px] text-emerald-700 uppercase font-bold block">Ganancia Neta Dashboard</span>
              <span class="text-sm font-black text-emerald-600 font-mono">+Bs {{ summary.total_profit | number:'1.2-2' }}</span>
            </div>
          </div>
        }
      </div>

      <!-- Banner Informativo de Exclusión de Métricas -->
      <div class="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-xs text-blue-900 space-y-0.5">
          <span class="font-bold">Control de inclusión en Dashboard y Métricas:</span>
          <p class="text-blue-800">
            Puedes hacer clic en el botón de estado <span class="font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">Incluido</span> / <span class="font-semibold text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded text-[10px]">Excluido</span> de cualquier venta para sumar o restar inmediatamente ese producto de los ingresos y utilidades de tu Dashboard general.
          </p>
        </div>
      </div>

      <!-- Filtros de Búsqueda y Rango de Fechas -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="w-full sm:w-72 relative">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (ngModelChange)="loadSalesHistory()"
            placeholder="Buscar producto o cliente..." 
            class="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="date" 
            [(ngModel)]="startDate" 
            (change)="loadSalesHistory()"
            class="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
          />
          <span class="text-xs text-gray-400">hasta</span>
          <input 
            type="date" 
            [(ngModel)]="endDate" 
            (change)="loadSalesHistory()"
            class="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
          />
        </div>
      </div>

      <!-- TABLA DE HISTORIAL DE VENTAS -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
              <tr>
                <th class="px-4 py-3.5">Fecha y Hora</th>
                <th class="px-4 py-3.5">Producto Vendido</th>
                <th class="px-4 py-3.5">Cliente</th>
                <th class="px-4 py-3.5">Precio Costo (Base)</th>
                <th class="px-4 py-3.5">Precio Venta (Cobrado)</th>
                <th class="px-4 py-3.5 font-bold text-emerald-700">Ganancia Neta</th>
                <th class="px-4 py-3.5 text-center">En Dashboard</th>
                <th class="px-4 py-3.5">Notas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 font-mono">
              @for (sale of sales; track sale.id) {
                <tr class="hover:bg-slate-50/70 transition-colors" [ngClass]="{'opacity-60 bg-slate-50/40': sale.include_in_dashboard === false}">
                  
                  <!-- Fecha y Hora -->
                  <td class="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                    {{ sale.sold_at | date:'yyyy-MM-dd HH:mm' }}
                  </td>

                  <!-- Producto -->
                  <td class="px-4 py-3.5 font-sans font-bold text-gray-900">
                    {{ sale.product_name }}
                  </td>

                  <!-- Cliente -->
                  <td class="px-4 py-3.5 font-sans text-gray-600">
                    {{ sale.customer_name || 'Venta directa en tienda' }}
                  </td>

                  <!-- Costo Base -->
                  <td class="px-4 py-3.5 text-gray-500">
                    Bs {{ sale.cost_price | number:'1.2-2' }}
                  </td>

                  <!-- Venta Cobrado / Rebaja / Adelanto -->
                  <td class="px-4 py-3.5">
                    <div class="font-bold text-gray-900">
                      Bs {{ sale.sale_price | number:'1.2-2' }}
                    </div>
                    @if (sale.discount_amount && sale.discount_amount > 0) {
                      <div class="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans inline-block mt-0.5">
                        Rebaja: -Bs {{ sale.discount_amount | number:'1.2-2' }}
                      </div>
                    }
                    @if (sale.advance_payment && sale.advance_payment > 0) {
                      <div class="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-sans inline-block mt-0.5 ml-1">
                        Anticipo: Bs {{ sale.advance_payment | number:'1.2-2' }}
                      </div>
                    }
                  </td>

                  <!-- Ganancia Neta -->
                  <td class="px-4 py-3.5 font-bold" [ngClass]="sale.include_in_dashboard === false ? 'text-gray-400 line-through' : 'text-emerald-600 bg-emerald-50/30'">
                    +Bs {{ sale.net_profit | number:'1.2-2' }}
                  </td>

                  <!-- En Dashboard (Toggle Interactivo de 1 Clic) -->
                  <td class="px-4 py-3.5 text-center whitespace-nowrap">
                    @if (sale.include_in_dashboard !== false) {
                      <button 
                        type="button" 
                        (click)="toggleDashboardInclusion(sale)" 
                        [disabled]="togglingId === sale.id"
                        title="Clic para excluir de los ingresos y utilidades del Dashboard"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all font-sans cursor-pointer disabled:opacity-50">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>Incluido</span>
                      </button>
                    } @else {
                      <button 
                        type="button" 
                        (click)="toggleDashboardInclusion(sale)" 
                        [disabled]="togglingId === sale.id"
                        title="Clic para sumar a los ingresos y utilidades del Dashboard"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all font-sans cursor-pointer disabled:opacity-50">
                        <span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        <span>Excluido</span>
                      </button>
                    }
                  </td>

                  <!-- Notas -->
                  <td class="px-4 py-3.5 font-sans text-[11px] text-gray-400 truncate max-w-xs">
                    {{ sale.notes || 'Registro automático' }}
                    @if (sale.include_in_dashboard === false) {
                      <span class="block text-[10px] text-amber-600 font-semibold">* Excluido del Dashboard</span>
                    }
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-4 py-8 text-center text-gray-400 text-xs font-sans">
                    No hay ventas registradas aún. Al cambiar el estado de un producto a "Vendido", aparecerá aquí automáticamente.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
})
export class AdminSalesHistoryComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  sales: SaleHistory[] = [];
  summary: { total_revenue: number; total_profit: number } | null = null;
  searchTerm = '';
  startDate = '';
  endDate = '';
  togglingId: number | null = null;

  ngOnInit(): void {
    this.loadSalesHistory();
  }

  loadSalesHistory(): void {
    this.dashboardService
      .getSalesHistory({
        search: this.searchTerm || undefined,
        start_date: this.startDate || undefined,
        end_date: this.endDate || undefined,
      })
      .subscribe({
        next: (res) => {
          this.sales = res.data;
          this.summary = res.summary;
        },
        error: (err) => console.error(err),
      });
  }

  toggleDashboardInclusion(sale: SaleHistory): void {
    const current = sale.include_in_dashboard !== false;
    const nextVal = !current;
    this.togglingId = sale.id;

    this.dashboardService.toggleSaleMetrics(sale.id, nextVal).subscribe({
      next: (res) => {
        this.togglingId = null;
        sale.include_in_dashboard = res.include_in_dashboard;
        // Recargar para actualizar los totales contables del resumen
        this.loadSalesHistory();
      },
      error: (err) => {
        this.togglingId = null;
        console.error('Error alternando inclusión en dashboard:', err);
        alert(err.error?.message || 'Error al cambiar la inclusión en el dashboard.');
      },
    });
  }
}
