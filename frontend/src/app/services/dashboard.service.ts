import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DashboardResponse, SaleHistory } from '../models/product.model';

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
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las 4 métricas clave y los datos del gráfico mensual
   */
  getDashboardData(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/admin/dashboard`);
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
    let httpParams = new HttpParams();
    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
    }
    return this.http.get<SalesHistoryResponse>(`${this.apiUrl}/admin/sales-history`, {
      params: httpParams,
    });
  }

  /**
   * Alterna la inclusión de una venta en las métricas contables del Dashboard
   */
  toggleSaleMetrics(saleId: number, include?: boolean): Observable<{ message: string; id: number; include_in_dashboard: boolean }> {
    return this.http.patch<{ message: string; id: number; include_in_dashboard: boolean }>(
      `${this.apiUrl}/admin/sales-history/${saleId}/toggle-metrics`,
      include !== undefined ? { include_in_dashboard: include } : {}
    );
  }
}
