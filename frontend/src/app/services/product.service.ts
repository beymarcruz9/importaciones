import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Category, Product, ProductStatus } from '../models/product.model';

export interface PaginatedResponse<T> {
  data: T[];
  links?: any;
  meta?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // -------------------------------------------------------------
  // MÓDULO 1: MÉTODOS PÚBLICOS (CLIENTES)
  // -------------------------------------------------------------

  /**
   * Obtiene el catálogo público.
   * Por definición de backend, los productos 'vendido' se excluyen automáticamente.
   */
  getPublicProducts(params?: {
    category_id?: number;
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.category_id) httpParams = httpParams.set('category_id', params.category_id.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
      if (params.per_page) httpParams = httpParams.set('per_page', params.per_page.toString());
    }
    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/public/products`, { params: httpParams });
  }

  /**
   * Obtiene el detalle público de un producto (con 1 a 3 imágenes)
   */
  getPublicProductDetail(slugOrId: string | number): Observable<{ data: Product }> {
    return this.http.get<{ data: Product }>(`${this.apiUrl}/public/products/${slugOrId}`);
  }

  /**
   * Lista de categorías activas para filtros en el catálogo
   */
  getCategories(): Observable<{ data: Category[] }> {
    return this.http.get<{ data: Category[] }>(`${this.apiUrl}/public/categories`);
  }

  // -------------------------------------------------------------
  // MÓDULO 2: GESTIÓN DE CATEGORÍAS (ADMINISTRADOR)
  // -------------------------------------------------------------

  getAdminCategories(): Observable<{ data: Category[] }> {
    return this.http.get<{ data: Category[] }>(`${this.apiUrl}/admin/categories`);
  }

  createCategory(data: { name: string; description?: string }): Observable<{ message: string; category: Category }> {
    return this.http.post<{ message: string; category: Category }>(`${this.apiUrl}/admin/categories`, data);
  }

  deleteCategory(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/categories/${id}`);
  }

  // -------------------------------------------------------------
  // MÓDULO 2: MÉTODOS ADMINISTRATIVOS (CRUD PRODUCTOS)
  // -------------------------------------------------------------

  getAdminProducts(params?: {
    status?: string;
    category_id?: number;
    search?: string;
    page?: number;
  }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.category_id) httpParams = httpParams.set('category_id', params.category_id.toString());
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.page) httpParams = httpParams.set('page', params.page.toString());
    }
    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/admin/products`, { params: httpParams });
  }

  createProduct(data: {
    category_id?: number | null;
    name: string;
    description?: string;
    cost_price: number;
    sale_price: number;
    status: ProductStatus;
    images: string[];
  }): Observable<{ message: string; product: Product }> {
    return this.http.post<{ message: string; product: Product }>(`${this.apiUrl}/admin/products`, data);
  }

  updateProduct(id: number, data: {
    category_id?: number | null;
    name: string;
    description?: string;
    cost_price: number;
    sale_price: number;
    status: ProductStatus;
    images?: string[];
    is_active?: boolean;
  }): Observable<{ message: string; product: Product }> {
    return this.http.put<{ message: string; product: Product }>(`${this.apiUrl}/admin/products/${id}`, data);
  }

  updateStatus(
    id: number,
    status: ProductStatus,
    options?: {
      final_sale_price?: number;
      customer_name?: string;
      notes?: string;
      update_catalog_price?: boolean;
      include_in_dashboard?: boolean;
    }
  ): Observable<{ message: string; product: Product }> {
    return this.http.patch<{ message: string; product: Product }>(
      `${this.apiUrl}/admin/products/${id}/status`,
      { status, ...options }
    );
  }

  deleteProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/products/${id}`);
  }

  /**
   * Subir imagen desde la computadora o celular (galería/cámara)
   */
  uploadImage(file: File): Observable<{ message: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ message: string; url: string }>(`${this.apiUrl}/admin/upload-image`, formData);
  }
}
