import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { DashboardResponse, SaleHistory } from '../models/product.model';
import { FirebaseService } from './firebase.service';
import { ProductService } from './product.service';
import { INITIAL_SALES } from '../data/initial-data';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

export interface SalesHistoryResponse {
  data: SaleHistory[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
  summary: {
    total_revenue: number;
    total_profit: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private firebase = inject(FirebaseService);
  private productService = inject(ProductService);

  private readonly STORAGE_SALES_KEY = 'importadora_sales_cache';

  constructor() {
    if (!localStorage.getItem(this.STORAGE_SALES_KEY)) {
      localStorage.setItem(this.STORAGE_SALES_KEY, JSON.stringify(INITIAL_SALES));
    }
  }

  /**
   * Obtiene las 4 métricas clave y los datos del gráfico mensual
   */
  getDashboardData(): Observable<DashboardResponse> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreDashboard());
    }

    return of(this.computeLocalDashboard());
  }

  private async fetchFirestoreDashboard(): Promise<DashboardResponse> {
    const db = this.firebase.db!;
    const [salesSnap, prodsSnap, resSnap] = await Promise.all([
      getDocs(collection(db, 'sales_history')),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'reservations')),
    ]);

    const sales: SaleHistory[] = salesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const prods = prodsSnap.docs.map((d) => d.data() as any);
    const reservations = resSnap.docs.map((d) => d.data() as any);

    return this.calculateMetrics(sales, prods, reservations);
  }

  private computeLocalDashboard(): DashboardResponse {
    const sales = this.getLocalSales();
    const prods = this.productService.getLocalProducts();
    const rawRes = localStorage.getItem('importadora_reservations_cache');
    const reservations = rawRes ? JSON.parse(rawRes) : [];

    return this.calculateMetrics(sales, prods, reservations);
  }

  private calculateMetrics(sales: SaleHistory[], prods: any[], reservations: any[]): DashboardResponse {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 1. Métricas mensuales
    let totalRevenueMonth = 0;
    let netProfitMonth = 0;
    let totalSoldMonth = 0;
    let totalSoldAllTime = 0;

    sales.forEach((s) => {
      // Solo computar ventas no excluidas
      if (s.include_in_dashboard !== false) {
        totalSoldAllTime++;
        const sDate = new Date(s.sold_at);
        if (sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear) {
          totalRevenueMonth += Number(s.sale_price || 0);
          netProfitMonth += Number(s.net_profit || 0);
          totalSoldMonth++;
        }
      }
    });

    // 2. Reservas activas vigentes
    const activeReservations = reservations.filter(
      (r) => r.status === 'activa' && new Date(r.expires_at).getTime() > now.getTime()
    ).length;

    // 3. Inventario
    const inventory = {
      disponibles: prods.filter((p) => p.status === 'disponible' && p.is_active !== false).length,
      reservados: prods.filter((p) => p.status === 'reservado' && p.is_active !== false).length,
      vendidos: prods.filter((p) => p.status === 'vendido').length,
    };

    // 4. Gráfico mensual (últimos 6 meses)
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels: string[] = [];
    const revenueData: number[] = [];
    const profitData: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      labels.push(`${monthNames[mIdx]} ${y}`);

      let mRev = 0;
      let mProf = 0;

      sales.forEach((s) => {
        if (s.include_in_dashboard !== false) {
          const sDate = new Date(s.sold_at);
          if (sDate.getMonth() === mIdx && sDate.getFullYear() === y) {
            mRev += Number(s.sale_price || 0);
            mProf += Number(s.net_profit || 0);
          }
        }
      });

      revenueData.push(Math.round(mRev * 100) / 100);
      profitData.push(Math.round(mProf * 100) / 100);
    }

    return {
      metrics: {
        total_revenue_month: Math.round(totalRevenueMonth * 100) / 100,
        net_profit_month: Math.round(netProfitMonth * 100) / 100,
        total_sold_month: totalSoldMonth,
        total_sold_all_time: totalSoldAllTime,
        active_reservations: activeReservations,
        inventory: inventory,
      },
      chart: {
        labels: labels,
        datasets: [
          { label: 'Ingresos Totales (Venta)', data: revenueData },
          { label: 'Ganancia Neta (Utilidad)', data: profitData },
        ],
      },
    };
  }

  /**
   * Obtiene la tabla histórica de ventas y contabilidad
   */
  getSalesHistory(params?: {
    search?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
  }): Observable<SalesHistoryResponse> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreSalesHistory(params));
    }

    return of(this.filterLocalSales(params));
  }

  private async fetchFirestoreSalesHistory(params?: {
    search?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<SalesHistoryResponse> {
    const db = this.firebase.db!;
    const snap = await getDocs(collection(db, 'sales_history'));

    let list: SaleHistory[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    return this.applySalesFilter(list, params);
  }

  private filterLocalSales(params?: {
    search?: string;
    start_date?: string;
    end_date?: string;
  }): SalesHistoryResponse {
    const list = this.getLocalSales();
    return this.applySalesFilter(list, params);
  }

  private applySalesFilter(
    list: SaleHistory[],
    params?: { search?: string; start_date?: string; end_date?: string }
  ): SalesHistoryResponse {
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.product_name.toLowerCase().includes(q) ||
          (s.customer_name && s.customer_name.toLowerCase().includes(q))
      );
    }

    if (params?.start_date && params?.end_date) {
      const start = new Date(params.start_date + 'T00:00:00').getTime();
      const end = new Date(params.end_date + 'T23:59:59').getTime();
      list = list.filter((s) => {
        const time = new Date(s.sold_at).getTime();
        return time >= start && time <= end;
      });
    }

    list.sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime());

    let totalRev = 0;
    let totalProf = 0;
    list.forEach((s) => {
      if (s.include_in_dashboard !== false) {
        totalRev += Number(s.sale_price || 0);
        totalProf += Number(s.net_profit || 0);
      }
    });

    return {
      data: list,
      pagination: {
        total: list.length,
        per_page: 50,
        current_page: 1,
        last_page: 1,
      },
      summary: {
        total_revenue: Math.round(totalRev * 100) / 100,
        total_profit: Math.round(totalProf * 100) / 100,
      },
    };
  }

  /**
   * Alterna la inclusión de una venta en las métricas contables del Dashboard
   */
  toggleSaleMetrics(
    saleId: number | string,
    include?: boolean
  ): Observable<{ message: string; id: number | string; include_in_dashboard: boolean }> {
    const idStr = String(saleId);

    if (this.firebase.isConfigured() && this.firebase.db) {
      const docRef = doc(this.firebase.db, 'sales_history', idStr);
      return from(
        getDoc(docRef).then((snap) => {
          if (!snap.exists()) throw new Error('Venta no encontrada');
          const currentVal = snap.data()['include_in_dashboard'] !== false;
          const newVal = include !== undefined ? include : !currentVal;

          return updateDoc(docRef, { include_in_dashboard: newVal }).then(() => ({
            message: newVal ? 'Venta incluida en las métricas del Dashboard.' : 'Venta excluida del Dashboard.',
            id: idStr,
            include_in_dashboard: newVal,
          }));
        })
      );
    }

    const list = this.getLocalSales();
    const s = list.find((x) => String(x.id) === idStr);
    let newVal = true;
    if (s) {
      newVal = include !== undefined ? include : !(s.include_in_dashboard !== false);
      s.include_in_dashboard = newVal;
      this.saveLocalSales(list);
    }

    return of({
      message: newVal ? 'Venta incluida en métricas (Local).' : 'Venta excluida de métricas (Local).',
      id: idStr,
      include_in_dashboard: newVal,
    });
  }

  private getLocalSales(): SaleHistory[] {
    const raw = localStorage.getItem(this.STORAGE_SALES_KEY);
    return raw ? JSON.parse(raw) : [...INITIAL_SALES];
  }

  private saveLocalSales(sales: SaleHistory[]): void {
    localStorage.setItem(this.STORAGE_SALES_KEY, JSON.stringify(sales));
  }
}
