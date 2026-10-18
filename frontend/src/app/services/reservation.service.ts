import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Reservation } from '../models/product.model';

export interface ReservationsListResponse {
  data: Reservation[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Registrar reserva pública desde el modal (vigencia de 7 días, con monto de adelanto opcional)
   */
  createPublicReservation(
    productId: number,
    customerName: string,
    customerPhone?: string,
    notes?: string,
    advancePayment?: number,
    agreedPrice?: number
  ): Observable<{ message: string; reservation: Reservation; expires_at: string }> {
    return this.http.post<{ message: string; reservation: Reservation; expires_at: string }>(
      `${this.apiUrl}/public/products/${productId}/reserve`,
      {
        customer_name: customerName,
        customer_phone: customerPhone,
        notes: notes,
        advance_payment: advancePayment,
        agreed_price: agreedPrice,
      }
    );
  }

  /**
   * Listado administrativo de reservas con detalles y fecha límite
   */
  getAdminReservations(params?: {
    status?: string;
    search?: string;
    page?: number;
  }): Observable<ReservationsListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
    }
    return this.http.get<ReservationsListResponse>(`${this.apiUrl}/admin/reservations`, {
      params: httpParams,
    });
  }

  /**
   * Crear reserva manual desde el panel de administración
   */
  createAdminReservation(data: {
    product_id: number;
    customer_name: string;
    customer_phone?: string;
    advance_payment?: number;
    agreed_price?: number;
    notes?: string;
    expires_days?: number;
  }): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(`${this.apiUrl}/admin/reservations`, data);
  }

  /**
   * Modificar datos / monto de reserva / precio acordado de una reserva
   */
  updateReservation(
    id: number,
    data: {
      customer_name?: string;
      customer_phone?: string;
      advance_payment?: number;
      agreed_price?: number;
      notes?: string;
    }
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/admin/reservations/${id}`, data);
  }

  /**
   * Cancelar reserva y regresar producto a Disponible
   */
  cancelReservation(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/reservations/${id}/cancel`, {});
  }

  /**
   * Completar reserva (convierte a Vendido y registra venta en contabilidad con precio final cerrado)
   */
  completeReservation(
    id: number,
    options?: {
      final_sale_price?: number;
      notes?: string;
      update_catalog_price?: boolean;
      include_in_dashboard?: boolean;
    }
  ): Observable<{
    message: string;
    final_sale_price: number;
    advance_payment: number;
    pending_collected: number;
    discount_amount: number;
    net_profit: number;
    include_in_dashboard?: boolean;
  }> {
    return this.http.post<{
      message: string;
      final_sale_price: number;
      advance_payment: number;
      pending_collected: number;
      discount_amount: number;
      net_profit: number;
      include_in_dashboard?: boolean;
    }>(`${this.apiUrl}/admin/reservations/${id}/complete`, options || {});
  }
}
