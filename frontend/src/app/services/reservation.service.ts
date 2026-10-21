import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { Reservation, ReservationStatus, ProductStatus } from '../models/product.model';
import { FirebaseService } from './firebase.service';
import { ProductService } from './product.service';
import { INITIAL_RESERVATIONS } from '../data/initial-data';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

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
  private firebase = inject(FirebaseService);
  private productService = inject(ProductService);

  private readonly STORAGE_RESERVATIONS_KEY = 'importadora_reservations_cache';

  constructor() {
    if (!localStorage.getItem(this.STORAGE_RESERVATIONS_KEY)) {
      localStorage.setItem(this.STORAGE_RESERVATIONS_KEY, JSON.stringify(INITIAL_RESERVATIONS));
    }
  }

  /**
   * Registrar reserva pública desde el modal (vigencia de 7 días exactos con adelanto opcional)
   */
  createPublicReservation(
    productId: number | string,
    customerName: string,
    customerPhone?: string,
    notes?: string,
    advancePayment?: number,
    agreedPrice?: number
  ): Observable<{ message: string; reservation: Reservation; expires_at: string }> {
    const idStr = String(productId);
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días exactos

    const newRes: Reservation = {
      id: 'res_' + Date.now(),
      product_id: idStr,
      customer_name: customerName,
      customer_phone: customerPhone || '',
      advance_payment: Number(advancePayment || 0),
      agreed_price: agreedPrice ? Number(agreedPrice) : undefined,
      pending_balance: agreedPrice ? Math.max(0, Number(agreedPrice) - Number(advancePayment || 0)) : undefined,
      reserved_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: 'activa',
      notes: notes || 'Reserva solicitada desde modal WhatsApp',
    };

    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.executeFirestorePublicReservation(newRes, idStr));
    }

    // Modo local / Fallback
    const reservations = this.getLocalReservations();
    reservations.unshift(newRes);
    this.saveLocalReservations(reservations);

    // Actualizar producto a reservado en local
    const prods = this.productService.getLocalProducts();
    const p = prods.find((x) => String(x.id) === idStr);
    if (p) {
      p.status = 'reservado';
      p.active_reservation = newRes;
      this.productService.saveLocalProducts(prods);
    }

    return of({
      message: 'Reserva registrada exitosamente por 7 días.',
      reservation: newRes,
      expires_at: newRes.expires_at,
    });
  }

  private async executeFirestorePublicReservation(
    newRes: Reservation,
    productId: string
  ): Promise<{ message: string; reservation: Reservation; expires_at: string }> {
    const db = this.firebase.db!;
    const prodRef = doc(db, 'products', productId);
    const prodSnap = await getDoc(prodRef);

    if (!prodSnap.exists()) {
      throw new Error('Producto no encontrado.');
    }

    const prodData = prodSnap.data() as any;
    if (prodData.status === 'vendido') {
      throw new Error('El producto ya ha sido vendido.');
    }

    // Guardar reserva en colección 'reservations'
    const resDocRef = await addDoc(collection(db, 'reservations'), newRes);
    newRes.id = resDocRef.id;

    // Actualizar producto a 'reservado'
    await updateDoc(prodRef, {
      status: 'reservado',
      active_reservation: {
        id: newRes.id,
        customer_name: newRes.customer_name,
        expires_at: newRes.expires_at,
      },
      updated_at: new Date().toISOString(),
    });

    return {
      message: 'Reserva registrada exitosamente por 7 días en Firestore.',
      reservation: newRes,
      expires_at: newRes.expires_at,
    };
  }

  /**
   * Listado administrativo de reservas con detalles y fecha límite de 7 días.
   * Auto-expira automáticamente cualquier reserva vencida.
   */
  getAdminReservations(params?: {
    status?: string;
    search?: string;
    page?: number;
  }): Observable<ReservationsListResponse> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreAdminReservations(params));
    }

    return of(this.filterLocalAdminReservations(params));
  }

  private async fetchFirestoreAdminReservations(params?: {
    status?: string;
    search?: string;
  }): Promise<ReservationsListResponse> {
    const db = this.firebase.db!;
    const [resSnap, prodSnap] = await Promise.all([
      getDocs(collection(db, 'reservations')),
      getDocs(collection(db, 'products')),
    ]);

    const prodsMap = new Map<string, any>();
    prodSnap.forEach((d) => {
      const p = d.data();
      prodsMap.set(d.id, { id: d.id, ...p });
    });

    const now = Date.now();
    let list: Reservation[] = [];

    for (const d of resSnap.docs) {
      const res = d.data() as Reservation;
      res.id = d.id;

      const prod = prodsMap.get(String(res.product_id));
      if (prod) {
        res.product = {
          id: prod.id,
          name: prod.name,
          sale_price: Number(prod.sale_price),
          status: prod.status,
          primary_image: this.productService.normalizeImageUrl(prod.primary_image || prod.images?.[0]?.image_url),
        };
      }

      // Cálculo de expiración (7 días)
      const expTime = new Date(res.expires_at).getTime();
      res.is_expired = expTime <= now;
      res.days_remaining = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));

      // Auto-expirar reservas activas que ya cumplieron su plazo
      if (res.status === 'activa' && res.is_expired) {
        res.status = 'expirada';
        // Actualizar en background en Firestore
        updateDoc(doc(db, 'reservations', d.id), {
          status: 'expirada',
          notes: (res.notes ? res.notes + '\n' : '') + 'Expirada automáticamente tras 7 días.',
        }).catch(console.error);

        // Si el producto sigue como 'reservado', liberarlo a 'disponible'
        if (prod && prod.status === 'reservado') {
          updateDoc(doc(db, 'products', prod.id), {
            status: 'disponible',
            active_reservation: null,
            updated_at: new Date().toISOString(),
          }).catch(console.error);
        }
      }

      list.push(res);
    }

    if (params?.status) {
      list = list.filter((r) => r.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          (r.customer_phone && r.customer_phone.includes(q)) ||
          (r.product && r.product.name.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.reserved_at).getTime() - new Date(a.reserved_at).getTime());

    return {
      data: list,
      pagination: {
        total: list.length,
        per_page: 50,
        current_page: 1,
        last_page: 1,
      },
    };
  }

  private filterLocalAdminReservations(params?: {
    status?: string;
    search?: string;
  }): ReservationsListResponse {
    let list = this.getLocalReservations();
    const prods = this.productService.getLocalProducts();
    const now = Date.now();

    list.forEach((res) => {
      const prod = prods.find((p) => String(p.id) === String(res.product_id));
      if (prod) {
        res.product = {
          id: prod.id,
          name: prod.name,
          sale_price: Number(prod.sale_price),
          status: prod.status,
          primary_image: this.productService.normalizeImageUrl(prod.primary_image || prod.images?.[0]?.image_url),
        };
      }

      const expTime = new Date(res.expires_at).getTime();
      res.is_expired = expTime <= now;
      res.days_remaining = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));

      if (res.status === 'activa' && res.is_expired) {
        res.status = 'expirada';
        if (prod && prod.status === 'reservado') {
          prod.status = 'disponible';
          prod.active_reservation = undefined;
          this.productService.saveLocalProducts(prods);
        }
      }
    });

    if (params?.status) {
      list = list.filter((r) => r.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(q) ||
          (r.customer_phone && r.customer_phone.includes(q)) ||
          (r.product && r.product.name.toLowerCase().includes(q))
      );
    }

    this.saveLocalReservations(list);

    return {
      data: list,
      pagination: {
        total: list.length,
        per_page: 50,
        current_page: 1,
        last_page: 1,
      },
    };
  }

  createAdminReservation(data: {
    product_id: number | string;
    customer_name: string;
    customer_phone?: string;
    advance_payment?: number;
    agreed_price?: number;
    notes?: string;
    expires_days?: number;
  }): Observable<{ message: string; id: number | string }> {
    const expiresDays = data.expires_days || 7;
    const now = new Date();
    const expires = new Date(now.getTime() + expiresDays * 24 * 60 * 60 * 1000);

    const newRes: Reservation = {
      id: 'res_' + Date.now(),
      product_id: String(data.product_id),
      customer_name: data.customer_name,
      customer_phone: data.customer_phone || '',
      advance_payment: Number(data.advance_payment || 0),
      agreed_price: data.agreed_price ? Number(data.agreed_price) : undefined,
      pending_balance: data.agreed_price ? Math.max(0, Number(data.agreed_price) - Number(data.advance_payment || 0)) : undefined,
      reserved_at: now.toISOString(),
      expires_at: expires.toISOString(),
      status: 'activa',
      notes: data.notes || 'Reserva manual creada desde el panel administrativo',
    };

    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        this.executeFirestorePublicReservation(newRes, String(data.product_id)).then((r) => ({
          message: 'Reserva manual registrada con éxito.',
          id: r.reservation.id,
        }))
      );
    }

    const list = this.getLocalReservations();
    list.unshift(newRes);
    this.saveLocalReservations(list);

    // Actualizar producto en local
    const prods = this.productService.getLocalProducts();
    const p = prods.find((x) => String(x.id) === String(data.product_id));
    if (p) {
      p.status = 'reservado';
      p.active_reservation = newRes;
      this.productService.saveLocalProducts(prods);
    }

    return of({ message: 'Reserva manual creada con éxito.', id: newRes.id });
  }

  updateReservation(
    id: number | string,
    data: {
      customer_name?: string;
      customer_phone?: string;
      advance_payment?: number;
      agreed_price?: number;
      notes?: string;
    }
  ): Observable<{ message: string }> {
    const idStr = String(id);
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        updateDoc(doc(this.firebase.db, 'reservations', idStr), {
          ...data,
          updated_at: new Date().toISOString(),
        }).then(() => ({ message: 'Reserva actualizada correctamente.' }))
      );
    }

    const list = this.getLocalReservations();
    const idx = list.findIndex((r) => String(r.id) === idStr);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      this.saveLocalReservations(list);
    }
    return of({ message: 'Reserva actualizada con éxito.' });
  }

  cancelReservation(id: number | string): Observable<{ message: string }> {
    const idStr = String(id);
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.executeFirestoreCancelReservation(idStr));
    }

    const list = this.getLocalReservations();
    const res = list.find((r) => String(r.id) === idStr);
    if (res) {
      res.status = 'cancelada';
      this.saveLocalReservations(list);

      const prods = this.productService.getLocalProducts();
      const p = prods.find((x) => String(x.id) === String(res.product_id));
      if (p && p.status === 'reservado') {
        p.status = 'disponible';
        p.active_reservation = undefined;
        this.productService.saveLocalProducts(prods);
      }
    }

    return of({ message: 'Reserva cancelada y producto liberado a disponible.' });
  }

  private async executeFirestoreCancelReservation(id: string): Promise<{ message: string }> {
    const db = this.firebase.db!;
    const resRef = doc(db, 'reservations', id);
    const resSnap = await getDoc(resRef);
    if (!resSnap.exists()) throw new Error('Reserva no encontrada');

    const res = resSnap.data() as Reservation;
    await updateDoc(resRef, {
      status: 'cancelada',
      notes: (res.notes ? res.notes + '\n' : '') + 'Cancelada desde el panel administrativo.',
      updated_at: new Date().toISOString(),
    });

    const prodRef = doc(db, 'products', String(res.product_id));
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      const prod = prodSnap.data() as any;
      if (prod.status === 'reservado') {
        await updateDoc(prodRef, {
          status: 'disponible',
          active_reservation: null,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return { message: 'Reserva cancelada y producto liberado a disponible en Firestore.' };
  }

  completeReservation(
    id: number | string,
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
    const idStr = String(id);
    return from(this.executeFirestoreCompleteReservation(idStr, options));
  }

  private async executeFirestoreCompleteReservation(
    id: string,
    options?: any
  ): Promise<any> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      const db = this.firebase.db!;
      const resRef = doc(db, 'reservations', id);
      const resSnap = await getDoc(resRef);
      if (!resSnap.exists()) throw new Error('Reserva no encontrada');

      const res = resSnap.data() as Reservation;
      const prodRef = doc(db, 'products', String(res.product_id));
      const prodSnap = await getDoc(prodRef);
      if (!prodSnap.exists()) throw new Error('Producto asociado no encontrado');

      const prod = prodSnap.data() as any;

      const finalPrice = options?.final_sale_price && options.final_sale_price > 0
        ? Number(options.final_sale_price)
        : Number(res.agreed_price || prod.sale_price);

      const advance = Number(res.advance_payment || 0);
      const pendingCollected = Math.max(0, finalPrice - advance);
      const discount = Math.max(0, Number(prod.sale_price) - finalPrice);
      const costPrice = Number(prod.cost_price || 0);
      const netProfit = finalPrice - costPrice;

      // 1. Marcar reserva como completada
      await updateDoc(resRef, {
        status: 'completada',
        notes: (res.notes ? res.notes + '\n' : '') + 'Venta concretada exitosamente.',
        updated_at: new Date().toISOString(),
      });

      // 2. Marcar producto como vendido
      await updateDoc(prodRef, {
        status: 'vendido',
        active_reservation: null,
        updated_at: new Date().toISOString(),
      });

      // 3. Registrar en historial de ventas
      await addDoc(collection(db, 'sales_history'), {
        product_id: String(res.product_id),
        product_name: prod.name,
        cost_price: costPrice,
        original_price: Number(prod.sale_price),
        sale_price: finalPrice,
        discount_amount: discount,
        advance_payment: advance,
        net_profit: netProfit,
        include_in_dashboard: options?.include_in_dashboard !== false,
        customer_name: res.customer_name,
        sold_at: new Date().toISOString(),
        notes: options?.notes || 'Venta completada desde reserva.',
      });

      return {
        message: 'Reserva completada con éxito. Producto marcado como Vendido y registrado en contabilidad.',
        final_sale_price: finalPrice,
        advance_payment: advance,
        pending_collected: pendingCollected,
        discount_amount: discount,
        net_profit: netProfit,
        include_in_dashboard: options?.include_in_dashboard !== false,
      };
    }

    // Modo Local
    const reservations = this.getLocalReservations();
    const res = reservations.find((r) => String(r.id) === id);
    if (!res) throw new Error('Reserva no encontrada');

    const prods = this.productService.getLocalProducts();
    const prod = prods.find((p) => String(p.id) === String(res.product_id));
    if (!prod) throw new Error('Producto no encontrado');

    const finalPrice = options?.final_sale_price && options.final_sale_price > 0
      ? Number(options.final_sale_price)
      : Number(res.agreed_price || prod.sale_price);

    const advance = Number(res.advance_payment || 0);
    const pendingCollected = Math.max(0, finalPrice - advance);
    const discount = Math.max(0, Number(prod.sale_price) - finalPrice);
    const costPrice = Number(prod.cost_price || 0);
    const netProfit = finalPrice - costPrice;

    res.status = 'completada';
    prod.status = 'vendido';
    prod.active_reservation = undefined;

    this.saveLocalReservations(reservations);
    this.productService.saveLocalProducts(prods);

    // Guardar en local sales history
    const rawSales = localStorage.getItem('importadora_sales_cache');
    const sales = rawSales ? JSON.parse(rawSales) : [];
    sales.unshift({
      id: 'sale_' + Date.now(),
      product_id: String(res.product_id),
      product_name: prod.name,
      cost_price: costPrice,
      original_price: Number(prod.sale_price),
      sale_price: finalPrice,
      discount_amount: discount,
      advance_payment: advance,
      net_profit: netProfit,
      include_in_dashboard: options?.include_in_dashboard !== false,
      customer_name: res.customer_name,
      sold_at: new Date().toISOString(),
      notes: options?.notes || 'Venta completada desde reserva',
    });
    localStorage.setItem('importadora_sales_cache', JSON.stringify(sales));

    return {
      message: 'Reserva completada con éxito. Producto marcado como Vendido y registrado en contabilidad.',
      final_sale_price: finalPrice,
      advance_payment: advance,
      pending_collected: pendingCollected,
      discount_amount: discount,
      net_profit: netProfit,
      include_in_dashboard: options?.include_in_dashboard !== false,
    };
  }

  private getLocalReservations(): Reservation[] {
    const raw = localStorage.getItem(this.STORAGE_RESERVATIONS_KEY);
    return raw ? JSON.parse(raw) : [...INITIAL_RESERVATIONS];
  }

  private saveLocalReservations(res: Reservation[]): void {
    localStorage.setItem(this.STORAGE_RESERVATIONS_KEY, JSON.stringify(res));
  }
}
