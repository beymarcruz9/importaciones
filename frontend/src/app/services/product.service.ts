import { Injectable, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Category, Product, ProductStatus } from '../models/product.model';
import { FirebaseService } from './firebase.service';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_RESERVATIONS, INITIAL_SALES } from '../data/initial-data';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface PaginatedResponse<T> {
  data: T[];
  links?: any;
  meta?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private firebase = inject(FirebaseService);

  private readonly STORAGE_PRODUCTS_KEY = 'importadora_products_cache';
  private readonly STORAGE_CATEGORIES_KEY = 'importadora_categories_cache';

  constructor() {
    this.initLocalData();
  }

  /**
   * Normaliza las URLs de imágenes locales para que funcionen perfectamente
   * en GitHub Pages tanto en la raíz como en subdirectorios (/IMPORTACIONES/).
   */
  public normalizeImageUrl(url: string | undefined): string {
    if (!url) {
      return 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=600&q=80';
    }
    if (url.startsWith('/uploads/')) {
      return '.' + url; // Convierte '/uploads/img.jpg' a './uploads/img.jpg'
    }
    return url;
  }

  // -------------------------------------------------------------
  // MÓDULO 1: MÉTODOS PÚBLICOS (CLIENTES)
  // -------------------------------------------------------------

  /**
   * Obtiene el catálogo público.
   * Regla de negocio: Los productos con estado 'vendido' se excluyen automáticamente.
   * Además, se verifica si alguna reserva expiró a los 7 días para liberar el producto.
   */
  getPublicProducts(params?: {
    category_id?: number | string;
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }): Observable<PaginatedResponse<Product>> {
    // Si Firebase está activo
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestorePublicProducts(params));
    }

    // Modo local / Fallback
    return of(this.filterLocalPublicProducts(params));
  }

  private async fetchFirestorePublicProducts(params?: {
    category_id?: number | string;
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<Product>> {
    const db = this.firebase.db!;
    const prodsCol = collection(db, 'products');

    // 1. Verificar si la base de datos está vacía; si es así, cargar datos semilla iniciales
    const checkSnap = await getDocs(query(prodsCol));
    if (checkSnap.empty) {
      await this.seedInitialDataToFirestore();
    }

    // 2. Traer productos activos
    const snap = await getDocs(prodsCol);
    const now = new Date().getTime();

    let list: Product[] = [];
    snap.forEach((d) => {
      const data = d.data() as Product;
      data.id = d.id;

      // Excluir eliminados o inactivos
      if (data.is_active === false) return;

      // Excluir productos vendidos del catálogo público
      if (data.status === 'vendido') return;

      // Comprobar si tiene reserva expirada (> 7 días)
      if (data.status === 'reservado' && data.active_reservation?.expires_at) {
        const expTime = new Date(data.active_reservation.expires_at).getTime();
        if (expTime <= now) {
          // Ha expirado la reserva: liberamos el producto a 'disponible' en Firestore
          data.status = 'disponible';
          data.active_reservation = undefined;
          updateDoc(doc(db, 'products', d.id), {
            status: 'disponible',
            active_reservation: null,
            updated_at: new Date().toISOString(),
          }).catch(console.error);
        }
      }

      // Normalizar imágenes
      data.primary_image = this.normalizeImageUrl(data.primary_image || (data.images?.[0]?.image_url));
      if (data.images) {
        data.images = data.images.map((img) => ({
          ...img,
          image_url: this.normalizeImageUrl(img.image_url),
        }));
      }

      // Proteger precio de costo en catálogo público
      delete data.cost_price;
      delete data.unit_margin;
      delete data.margin_percent;

      list.push(data);
    });

    // 3. Aplicar filtros en memoria
    if (params?.category_id) {
      const catId = String(params.category_id);
      list = list.filter((p) => String(p.category_id) === catId || String(p.category?.id) === catId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (params?.status) {
      list = list.filter((p) => p.status === params.status);
    }

    // Ordenar descendente por fecha o ID
    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return { data: list };
  }

  private filterLocalPublicProducts(params?: {
    category_id?: number | string;
    search?: string;
    status?: string;
  }): PaginatedResponse<Product> {
    let prods = this.getLocalProducts();
    const now = new Date().getTime();

    // Excluir vendidos y los inactivos
    prods = prods.filter((p) => p.status !== 'vendido' && p.is_active !== false);

    // Expirar reservas locales de más de 7 días
    prods.forEach((p) => {
      if (p.status === 'reservado' && p.active_reservation?.expires_at) {
        if (new Date(p.active_reservation.expires_at).getTime() <= now) {
          p.status = 'disponible';
          p.active_reservation = undefined;
        }
      }
      p.primary_image = this.normalizeImageUrl(p.primary_image || p.images?.[0]?.image_url);
      delete p.cost_price;
      delete p.unit_margin;
      delete p.margin_percent;
    });

    if (params?.category_id) {
      const catId = String(params.category_id);
      prods = prods.filter((p) => String(p.category_id) === catId || String(p.category?.id) === catId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      prods = prods.filter((p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }

    if (params?.status) {
      prods = prods.filter((p) => p.status === params.status);
    }

    return { data: prods };
  }

  /**
   * Obtiene el detalle público de un producto
   */
  getPublicProductDetail(slugOrId: string | number): Observable<{ data: Product }> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreProductDetail(slugOrId));
    }

    const prods = this.getLocalProducts();
    const found = prods.find((p) => String(p.id) === String(slugOrId) || p.slug === String(slugOrId));
    if (!found) {
      throw new Error('Producto no encontrado');
    }
    const clean = { ...found };
    delete clean.cost_price;
    clean.primary_image = this.normalizeImageUrl(clean.primary_image || clean.images?.[0]?.image_url);
    if (clean.images) {
      clean.images = clean.images.map((img) => ({ ...img, image_url: this.normalizeImageUrl(img.image_url) }));
    }
    return of({ data: clean });
  }

  private async fetchFirestoreProductDetail(slugOrId: string | number): Promise<{ data: Product }> {
    const db = this.firebase.db!;
    const idStr = String(slugOrId);

    // Intentar buscar directamente por doc ID
    try {
      const docRef = doc(db, 'products', idStr);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const prod = docSnap.data() as Product;
        prod.id = docSnap.id;
        delete prod.cost_price;
        prod.primary_image = this.normalizeImageUrl(prod.primary_image || prod.images?.[0]?.image_url);
        if (prod.images) {
          prod.images = prod.images.map((img) => ({ ...img, image_url: this.normalizeImageUrl(img.image_url) }));
        }
        return { data: prod };
      }
    } catch (e) {
      // Continuar con búsqueda por slug
    }

    // Buscar por slug
    const q = query(collection(db, 'products'), where('slug', '==', idStr));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('Producto no encontrado');
    }

    const d = snap.docs[0];
    const prod = d.data() as Product;
    prod.id = d.id;
    delete prod.cost_price;
    prod.primary_image = this.normalizeImageUrl(prod.primary_image || prod.images?.[0]?.image_url);
    if (prod.images) {
      prod.images = prod.images.map((img) => ({ ...img, image_url: this.normalizeImageUrl(img.image_url) }));
    }
    return { data: prod };
  }

  /**
   * Lista de categorías activas para filtros en el catálogo con conteo dinámico
   */
  getCategories(): Observable<{ data: Category[] }> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreCategories(true));
    }

    const cats = this.getLocalCategories();
    const prods = this.getLocalProducts().filter((p) => p.status !== 'vendido' && p.is_active !== false);

    const result = cats.map((c) => {
      const count = prods.filter((p) => String(p.category_id) === String(c.id)).length;
      return { ...c, products_count: count };
    });

    return of({ data: result });
  }

  // -------------------------------------------------------------
  // MÓDULO 2: GESTIÓN DE CATEGORÍAS (ADMINISTRADOR)
  // -------------------------------------------------------------

  getAdminCategories(): Observable<{ data: Category[] }> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreCategories(false));
    }
    return of({ data: this.getLocalCategories() });
  }

  private async fetchFirestoreCategories(publicOnly: boolean): Promise<{ data: Category[] }> {
    const db = this.firebase.db!;
    const catsCol = collection(db, 'categories');
    const prodsCol = collection(db, 'products');

    const [catSnap, prodSnap] = await Promise.all([getDocs(catsCol), getDocs(prodsCol)]);

    if (catSnap.empty) {
      await this.seedInitialCategoriesToFirestore();
      return this.fetchFirestoreCategories(publicOnly);
    }

    const prods = prodSnap.docs.map((d) => d.data() as Product);

    const categories: Category[] = [];
    catSnap.forEach((d) => {
      const c = d.data() as Category;
      c.id = d.id;
      if (publicOnly && c.is_active === false) return;

      const count = prods.filter(
        (p) =>
          String(p.category_id) === d.id &&
          p.is_active !== false &&
          (!publicOnly || p.status !== 'vendido')
      ).length;

      c.products_count = count;
      categories.push(c);
    });

    categories.sort((a, b) => a.name.localeCompare(b.name));
    return { data: categories };
  }

  createCategory(data: { name: string; description?: string }): Observable<{ message: string; category: Category }> {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 6);
    const newCat: Category = {
      id: 'cat_' + Date.now(),
      name: data.name,
      slug: slug,
      description: data.description || '',
      is_active: true,
      products_count: 0,
    };

    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        addDoc(collection(this.firebase.db, 'categories'), {
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description,
          is_active: true,
          created_at: new Date().toISOString(),
        }).then((ref) => {
          newCat.id = ref.id;
          return { message: 'Categoría creada con éxito', category: newCat };
        })
      );
    }

    const cats = this.getLocalCategories();
    cats.push(newCat);
    this.saveLocalCategories(cats);
    return of({ message: 'Categoría creada con éxito en modo local', category: newCat });
  }

  deleteCategory(id: number | string): Observable<{ message: string }> {
    const idStr = String(id);
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        deleteDoc(doc(this.firebase.db, 'categories', idStr)).then(() => ({
          message: 'Categoría eliminada con éxito',
        }))
      );
    }

    let cats = this.getLocalCategories();
    cats = cats.filter((c) => String(c.id) !== idStr);
    this.saveLocalCategories(cats);
    return of({ message: 'Categoría eliminada exitosamente' });
  }

  // -------------------------------------------------------------
  // MÓDULO 2: CRUD DE PRODUCTOS (ADMINISTRADOR)
  // -------------------------------------------------------------

  getAdminProducts(params?: {
    status?: string;
    category_id?: number | string;
    search?: string;
    page?: number;
  }): Observable<PaginatedResponse<Product>> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(this.fetchFirestoreAdminProducts(params));
    }

    let list = this.getLocalProducts();

    if (params?.status) {
      list = list.filter((p) => p.status === params.status);
    }
    if (params?.category_id) {
      list = list.filter((p) => String(p.category_id) === String(params.category_id));
    }
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    list.forEach((p) => {
      p.primary_image = this.normalizeImageUrl(p.primary_image || p.images?.[0]?.image_url);
      p.unit_margin = Number(p.sale_price) - Number(p.cost_price || 0);
      p.margin_percent = p.cost_price ? Math.round((p.unit_margin / p.cost_price) * 100) : 100;
    });

    return of({ data: list });
  }

  private async fetchFirestoreAdminProducts(params?: {
    status?: string;
    category_id?: number | string;
    search?: string;
  }): Promise<PaginatedResponse<Product>> {
    const db = this.firebase.db!;
    const prodsCol = collection(db, 'products');
    const snap = await getDocs(prodsCol);

    let list: Product[] = [];
    snap.forEach((d) => {
      const p = d.data() as Product;
      p.id = d.id;
      p.primary_image = this.normalizeImageUrl(p.primary_image || p.images?.[0]?.image_url);
      if (p.images) {
        p.images = p.images.map((img) => ({ ...img, image_url: this.normalizeImageUrl(img.image_url) }));
      }
      p.unit_margin = Number(p.sale_price) - Number(p.cost_price || 0);
      p.margin_percent = p.cost_price ? Math.round((p.unit_margin / p.cost_price) * 100) : 100;
      list.push(p);
    });

    if (params?.status) {
      list = list.filter((p) => p.status === params.status);
    }
    if (params?.category_id) {
      list = list.filter((p) => String(p.category_id) === String(params.category_id));
    }
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return { data: list };
  }

  createProduct(data: {
    category_id?: number | string | null;
    name: string;
    description?: string;
    cost_price: number;
    sale_price: number;
    status: ProductStatus;
    images: string[];
  }): Observable<{ message: string; product: Product }> {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 7);

    const formattedImages = data.images.map((url, i) => ({
      image_url: url,
      is_primary: i === 0,
      sort_order: i,
    }));

    const newProd: Product = {
      id: 'prod_' + Date.now(),
      category_id: data.category_id ? String(data.category_id) : undefined,
      name: data.name,
      slug: slug,
      description: data.description || '',
      cost_price: Number(data.cost_price),
      sale_price: Number(data.sale_price),
      status: data.status,
      is_active: true,
      images: formattedImages,
      primary_image: formattedImages[0]?.image_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        addDoc(collection(this.firebase.db, 'products'), newProd).then((ref) => {
          newProd.id = ref.id;
          return { message: 'Producto creado exitosamente en Cloud Firestore.', product: newProd };
        })
      );
    }

    const prods = this.getLocalProducts();
    prods.unshift(newProd);
    this.saveLocalProducts(prods);
    return of({ message: 'Producto guardado en modo local.', product: newProd });
  }

  updateProduct(
    id: number | string,
    data: {
      category_id?: number | string | null;
      name: string;
      description?: string;
      cost_price: number;
      sale_price: number;
      status: ProductStatus;
      images?: string[];
      is_active?: boolean;
    }
  ): Observable<{ message: string; product: Product }> {
    const idStr = String(id);

    const updatePayload: any = {
      name: data.name,
      description: data.description || '',
      cost_price: Number(data.cost_price),
      sale_price: Number(data.sale_price),
      status: data.status,
      updated_at: new Date().toISOString(),
    };

    if (data.category_id !== undefined) updatePayload.category_id = data.category_id ? String(data.category_id) : null;
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

    if (data.images && data.images.length > 0) {
      updatePayload.images = data.images.map((url, i) => ({
        image_url: url,
        is_primary: i === 0,
        sort_order: i,
      }));
      updatePayload.primary_image = updatePayload.images[0].image_url;
    }

    // Si cambia a 'vendido', registrar venta en contabilidad
    if (data.status === 'vendido') {
      this.recordSaleOnStatusVendido(idStr, Number(data.cost_price), Number(data.sale_price), data.name);
    }

    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        updateDoc(doc(this.firebase.db, 'products', idStr), updatePayload).then(() => {
          return {
            message: 'Producto actualizado exitosamente en Firestore.',
            product: { id: idStr, ...updatePayload },
          };
        })
      );
    }

    const prods = this.getLocalProducts();
    const idx = prods.findIndex((p) => String(p.id) === idStr);
    if (idx !== -1) {
      prods[idx] = { ...prods[idx], ...updatePayload };
      this.saveLocalProducts(prods);
      return of({ message: 'Producto actualizado en modo local.', product: prods[idx] });
    }

    throw new Error('Producto no encontrado');
  }

  /**
   * Actualización rápida de estado (disponible, reservado, vendido)
   * Replica exactamente la lógica del backend: si el estado pasa a 'vendido',
   * se crea automáticamente un registro en 'sales_history' y se completa la reserva activa.
   */
  updateStatus(
    id: number | string,
    status: ProductStatus,
    options?: {
      final_sale_price?: number;
      customer_name?: string;
      notes?: string;
      update_catalog_price?: boolean;
      include_in_dashboard?: boolean;
    }
  ): Observable<{ message: string; product: Product }> {
    const idStr = String(id);

    return from(this.executeStatusChange(idStr, status, options));
  }

  private async executeStatusChange(
    id: string,
    status: ProductStatus,
    options?: {
      final_sale_price?: number;
      customer_name?: string;
      notes?: string;
      update_catalog_price?: boolean;
      include_in_dashboard?: boolean;
    }
  ): Promise<{ message: string; product: Product }> {
    if (this.firebase.isConfigured() && this.firebase.db) {
      const db = this.firebase.db;
      const prodRef = doc(db, 'products', id);
      const prodSnap = await getDoc(prodRef);
      if (!prodSnap.exists()) throw new Error('Producto no encontrado');

      const prod = prodSnap.data() as Product;
      prod.id = prodSnap.id;

      const salePrice = options?.final_sale_price && options.final_sale_price > 0 ? options.final_sale_price : Number(prod.sale_price);

      const updates: any = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (options?.update_catalog_price && options.final_sale_price) {
        updates.sale_price = options.final_sale_price;
      }

      // Si pasa a vendido, registrar en sales_history y completar reserva
      if (status === 'vendido') {
        const costPrice = Number(prod.cost_price || 0);
        const netProfit = salePrice - costPrice;

        await addDoc(collection(db, 'sales_history'), {
          product_id: id,
          product_name: prod.name,
          cost_price: costPrice,
          original_price: Number(prod.sale_price),
          sale_price: salePrice,
          discount_amount: Math.max(0, Number(prod.sale_price) - salePrice),
          net_profit: netProfit,
          include_in_dashboard: options?.include_in_dashboard !== false,
          customer_name: options?.customer_name || prod.active_reservation?.customer_name || 'Venta directa',
          sold_at: new Date().toISOString(),
          notes: options?.notes || 'Venta registrada desde panel de control',
        });

        // Completar reserva activa en Firestore si existía
        if (prod.active_reservation) {
          const resSnap = await getDocs(
            query(collection(db, 'reservations'), where('product_id', '==', id), where('status', '==', 'activa'))
          );
          resSnap.forEach((rdoc) => {
            updateDoc(doc(db, 'reservations', rdoc.id), {
              status: 'completada',
              notes: 'Reserva completada con éxito tras venta.',
            }).catch(console.error);
          });
          updates.active_reservation = null;
        }
      } else if (status === 'disponible') {
        updates.active_reservation = null;
      }

      await updateDoc(prodRef, updates);
      return { message: `Estado actualizado a ${status}.`, product: { ...prod, ...updates } };
    }

    // Modo Local
    const prods = this.getLocalProducts();
    const prod = prods.find((p) => String(p.id) === id);
    if (!prod) throw new Error('Producto no encontrado');

    prod.status = status;
    prod.updated_at = new Date().toISOString();

    if (status === 'vendido') {
      this.recordSaleOnStatusVendido(id, Number(prod.cost_price || 0), Number(options?.final_sale_price || prod.sale_price), prod.name, options);
      prod.active_reservation = undefined;
    } else if (status === 'disponible') {
      prod.active_reservation = undefined;
    }

    this.saveLocalProducts(prods);
    return { message: `Estado actualizado a ${status} (Local).`, product: prod };
  }

  private recordSaleOnStatusVendido(
    productId: string,
    costPrice: number,
    salePrice: number,
    productName: string,
    options?: any
  ): void {
    const rawSales = localStorage.getItem('importadora_sales_cache');
    const sales = rawSales ? JSON.parse(rawSales) : [...INITIAL_SALES];

    sales.unshift({
      id: 'sale_' + Date.now(),
      product_id: productId,
      product_name: productName,
      cost_price: costPrice,
      original_price: salePrice,
      sale_price: salePrice,
      net_profit: salePrice - costPrice,
      include_in_dashboard: options?.include_in_dashboard !== false,
      customer_name: options?.customer_name || 'Venta directa',
      sold_at: new Date().toISOString(),
      notes: options?.notes || 'Venta registrada automáticamente',
    });

    localStorage.setItem('importadora_sales_cache', JSON.stringify(sales));
  }

  deleteProduct(id: number | string): Observable<{ message: string }> {
    const idStr = String(id);
    if (this.firebase.isConfigured() && this.firebase.db) {
      return from(
        updateDoc(doc(this.firebase.db, 'products', idStr), {
          is_active: false,
          fecha_eliminacion: new Date().toISOString(),
        }).then(() => ({ message: 'Producto eliminado correctamente.' }))
      );
    }

    const prods = this.getLocalProducts();
    const idx = prods.findIndex((p) => String(p.id) === idStr);
    if (idx !== -1) {
      prods[idx].is_active = false;
      this.saveLocalProducts(prods);
    }
    return of({ message: 'Producto eliminado correctamente.' });
  }

  /**
   * Subir imagen desde la computadora o celular (galería o cámara)
   * 1. Si Firebase Storage está activo: sube a Google Cloud Storage y retorna URL pública.
   * 2. Si no está configurado aún: comprime y genera Data URL ultra-optimizada en el navegador.
   */
  uploadImage(file: File): Observable<{ message: string; url: string }> {
    if (this.firebase.isConfigured() && this.firebase.storage) {
      const storage = this.firebase.storage;
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanName = `products/img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const fileRef = ref(storage, cleanName);

      return from(
        uploadBytes(fileRef, file)
          .then(() => getDownloadURL(fileRef))
          .then((downloadUrl) => ({
            message: 'Imagen subida exitosamente a Firebase Storage.',
            url: downloadUrl,
          }))
          .catch((err) => {
            console.warn('Firebase Storage falló o requiere reglas. Usando conversor optimizado en navegador:', err);
            return this.compressImageToDataUrl(file);
          })
      );
    }

    // Modo local / Fallback con compresión automática
    return from(this.compressImageToDataUrl(file));
  }

  /**
   * Comprime una imagen a WebP o JPEG liviano como Data URL en el cliente
   */
  private compressImageToDataUrl(file: File): Promise<{ message: string; url: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({
            message: 'Imagen procesada y optimizada exitosamente.',
            url: compressedDataUrl,
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // -------------------------------------------------------------
  // CARGA DE DATOS SEMILLA A FIREBASE
  // -------------------------------------------------------------

  public async seedInitialDataToFirestore(): Promise<void> {
    if (!this.firebase.db) return;
    const db = this.firebase.db;

    console.log('Cargando catálogo inicial a Cloud Firestore...');

    // Categorías
    for (const cat of INITIAL_CATEGORIES) {
      await setDoc(doc(db, 'categories', String(cat.id)), {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        is_active: cat.is_active !== false,
      });
    }

    // Productos
    for (const prod of INITIAL_PRODUCTS) {
      await setDoc(doc(db, 'products', String(prod.id)), {
        category_id: prod.category_id || null,
        name: prod.name,
        slug: prod.slug,
        description: prod.description || '',
        cost_price: Number(prod.cost_price || 0),
        sale_price: Number(prod.sale_price),
        status: prod.status,
        is_active: prod.is_active !== false,
        images: prod.images || [],
        primary_image: prod.primary_image || '',
        created_at: prod.created_at || new Date().toISOString(),
        updated_at: prod.updated_at || new Date().toISOString(),
      });
    }

    // Ventas iniciales para el dashboard
    for (const sale of INITIAL_SALES) {
      await setDoc(doc(db, 'sales_history', String(sale.id)), {
        product_id: String(sale.product_id),
        product_name: sale.product_name,
        cost_price: Number(sale.cost_price),
        original_price: Number(sale.original_price || sale.sale_price),
        sale_price: Number(sale.sale_price),
        discount_amount: Number(sale.discount_amount || 0),
        advance_payment: Number(sale.advance_payment || 0),
        net_profit: Number(sale.net_profit),
        include_in_dashboard: sale.include_in_dashboard !== false,
        customer_name: sale.customer_name || 'Cliente',
        sold_at: sale.sold_at || new Date().toISOString(),
        notes: sale.notes || '',
      });
    }

    console.log('¡Catálogo inicial sincronizado con Cloud Firestore exitosamente!');
  }

  private async seedInitialCategoriesToFirestore(): Promise<void> {
    if (!this.firebase.db) return;
    for (const cat of INITIAL_CATEGORIES) {
      await setDoc(doc(this.firebase.db, 'categories', String(cat.id)), {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        is_active: cat.is_active !== false,
      });
    }
  }

  // -------------------------------------------------------------
  // PERSISTENCIA LOCAL (OFFLINE / ANTES DE PEGAR KEYS)
  // -------------------------------------------------------------

  private initLocalData(): void {
    if (!localStorage.getItem(this.STORAGE_PRODUCTS_KEY)) {
      localStorage.setItem(this.STORAGE_PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!localStorage.getItem(this.STORAGE_CATEGORIES_KEY)) {
      localStorage.setItem(this.STORAGE_CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
    }
  }

  public getLocalProducts(): Product[] {
    const raw = localStorage.getItem(this.STORAGE_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  }

  public saveLocalProducts(products: Product[]): void {
    localStorage.setItem(this.STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  }

  public getLocalCategories(): Category[] {
    const raw = localStorage.getItem(this.STORAGE_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [...INITIAL_CATEGORIES];
  }

  public saveLocalCategories(cats: Category[]): void {
    localStorage.setItem(this.STORAGE_CATEGORIES_KEY, JSON.stringify(cats));
  }
}
