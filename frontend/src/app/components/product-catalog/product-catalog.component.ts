import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Category, Product, ProductStatus } from '../../models/product.model';
import { NavbarComponent } from '../navbar/navbar.component';
import { ProductDetailComponent } from '../product-detail/product-detail.component';
import { WhatsappModalComponent } from '../whatsapp-modal/whatsapp-modal.component';
import { WhatsAppActionType } from '../../services/whatsapp.service';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    ProductDetailComponent,
    WhatsappModalComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      <!-- Barra de navegación con título "Importadora de productos" -->
      <app-navbar (searchChange)="onSearch($event)"></app-navbar>

      <!-- Banner de Bienvenida / Hero Minimalista -->
      <section class="bg-gradient-to-b from-white to-slate-50 border-b border-gray-100 py-10 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto text-center space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Importaciones Exclusivas & Envíos Directos
          </span>
          <h1 class="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Catálogo de Productos
          </h1>
          <p class="text-base text-gray-600 max-w-2xl mx-auto">
            Explora nuestro stock disponible. Realiza tu pedido directo por WhatsApp o reserva tu artículo favorito por 7 días.
          </p>
        </div>
      </section>

      <!-- Contenedor Principal: Filtros y Cuadrícula -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        <!-- FILTROS POR CATEGORÍA -->
        <div class="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <button 
            (click)="selectCategory(null)"
            [ngClass]="selectedCategoryId === null ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
            class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all">
            Todos los productos
          </button>
          
          @for (cat of categories; track cat.id) {
            <button 
              (click)="selectCategory(cat.id)"
              [ngClass]="selectedCategoryId === cat.id ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'"
              class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5">
              <span>{{ cat.name }}</span>
              @if (cat.products_count !== undefined) {
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-normal">
                  {{ cat.products_count }}
                </span>
              }
            </button>
          }
        </div>

        <!-- ESTADO DE CARGA -->
        @if (loading) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (item of [1,2,3,4,5,6,7,8]; track $index) {
              <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse space-y-4">
                <div class="bg-gray-200 h-52 rounded-xl"></div>
                <div class="space-y-2">
                  <div class="bg-gray-200 h-4 w-3/4 rounded"></div>
                  <div class="bg-gray-200 h-3 w-1/2 rounded"></div>
                </div>
                <div class="bg-gray-200 h-8 rounded-xl"></div>
              </div>
            }
          </div>
        }

        <!-- CUADRÍCULA DE PRODUCTOS (GRID RESPONSIVA) -->
        <!-- REQUISITO: Productos 'Vendidos' se ocultan automáticamente -->
        @if (!loading && products.length > 0) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (product of products; track product.id) {
              <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col group">
                
                <!-- Contenedor Imagen y Badge de Estado -->
                <div class="relative overflow-hidden bg-gray-100 aspect-square cursor-pointer" (click)="openDetail(product)">
                  <img 
                    [src]="product.primary_image || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=600&q=80'" 
                    [alt]="product.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  <!-- Badge de Estado -->
                  <div class="absolute top-3 left-3">
                    @if (product.status === 'disponible') {
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-sm">
                        <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        Disponible
                      </span>
                    } @else if (product.status === 'reservado') {
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-sm">
                        <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
                        Reservado
                      </span>
                    }
                  </div>

                  <!-- Botón Flotante Ver Detalle (al pasar mouse) -->
                  <div class="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-900 shadow-md">
                      Ver Detalles & Fotos
                    </span>
                  </div>
                </div>

                <!-- Información del Producto -->
                <div class="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                      {{ product.category?.name || 'Importación' }}
                    </span>
                    <h3 
                      (click)="openDetail(product)"
                      class="text-sm font-bold text-gray-900 line-clamp-2 hover:text-indigo-600 cursor-pointer transition-colors" 
                      title="{{ product.name }}">
                      {{ product.name }}
                    </h3>
                  </div>

                  <div class="mt-4 pt-3 border-t border-gray-50">
                    <div class="flex items-baseline justify-between mb-3">
                      <span class="text-xs text-gray-400 font-medium">Precio final</span>
                      <span class="text-xl font-black text-gray-900 tracking-tight">
                        Bs {{ product.sale_price | number:'1.2-2' }}
                      </span>
                    </div>

                    <!-- BOTONES DOBLES CALL TO ACTION -->
                    <div class="grid grid-cols-2 gap-2">
                      <!-- Pedir por WhatsApp -->
                      <button 
                        (click)="openWhatsappModal('compra', product)"
                        class="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                        </svg>
                        <span>Pedir</span>
                      </button>

                      <!-- Reservar -->
                      <button 
                        (click)="openWhatsappModal('reserva', product)"
                        [disabled]="product.status === 'reservado'"
                        [ngClass]="product.status === 'reservado' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-indigo-900 text-white active:scale-95 shadow-sm'"
                        class="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ product.status === 'reservado' ? 'Reservado' : 'Reservar' }}</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            }
          </div>
        }

        <!-- ESTADO VACÍO -->
        @if (!loading && products.length === 0) {
          <div class="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8">
            <div class="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-1">No se encontraron productos</h3>
            <p class="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              Actualmente no hay artículos disponibles con los criterios seleccionados.
            </p>
            <button 
              (click)="resetFilters()"
              class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors">
              Ver todos los productos
            </button>
          </div>
        }

        <!-- SECCIÓN DESTACADA DE CONTACTO DIRECTO POR WHATSAPP -->
        <section class="mt-14 mb-8 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-emerald-700/15 relative overflow-hidden">
          <!-- Decoración visual de fondo -->
          <div class="absolute -right-8 -bottom-10 opacity-10 pointer-events-none">
            <svg class="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
            </svg>
          </div>

          <div class="relative z-10 max-w-2xl space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-emerald-100">
              <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
              Atención Inmediata por WhatsApp (+591 72970461)
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              ¿Tienes dudas o buscas un producto especial de importación?
            </h2>

            <p class="text-emerald-100 text-xs sm:text-sm leading-relaxed">
              Escríbenos directamente a nuestro WhatsApp oficial. Te asesoramos sobre disponibilidad inmediata, reservas de 7 días, especificaciones técnicas y cotizaciones de importación personalizada sin compromiso.
            </p>

            <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a 
                href="https://wa.me/59172970461?text=Hola,%20me%20comunico%20desde%20el%20catálogo%20de%20Importadora%20de%20productos,%20quisiera%20hacer%20una%20consulta."
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 text-sm font-extrabold shadow-lg shadow-black/10 transition-all">
                <svg class="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
                <span>Chatear por WhatsApp al +591 72970461</span>
              </a>

              <span class="text-[11px] text-emerald-200 text-center sm:text-left">
                ⚡ Respuesta en menos de 10 minutos
              </span>
            </div>
          </div>
        </section>

      </main>

      <!-- BOTÓN FLOTANTE DE WHATSAPP (SIEMPRE VISIBLE EN ESQUINA INFERIOR DERECHA) -->
      <aside class="fixed bottom-5 right-5 z-40 flex items-center gap-2 group">
        <span class="hidden sm:inline-block px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Consultas? ¡Chatea aquí!
        </span>
        <a 
          href="https://wa.me/59172970461?text=Hola,%20me%20comunico%20desde%20el%20catálogo%20de%20Importadora%20de%20productos,%20quisiera%20hacer%20una%20consulta." 
          target="_blank"
          rel="noopener noreferrer"
          title="Contactar por WhatsApp (+591 72970461)"
          class="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative">
          <span class="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40"></span>
          <svg class="w-7 h-7 relative z-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
          </svg>
        </a>
      </aside>

      <!-- Pie de página minimalista -->
      <footer class="bg-white border-t border-gray-100 py-6 mt-12 text-center text-xs text-gray-500">
        <div class="max-w-7xl mx-auto px-4">
          <p class="font-semibold text-gray-700">Importadora de productos</p>
          <p class="mt-1">Plantilla Base Marca Blanca &bull; Pedidos y Reservas Directas vía WhatsApp (+591 72970461) &bull; Precios en Bolivianos (Bs)</p>
        </div>
      </footer>

      <!-- MODAL DE DETALLE DE PRODUCTO (CARRUSEL 1-3 FOTOS) -->
      <app-product-detail
        [isOpen]="isDetailModalOpen"
        [product]="selectedProduct"
        (close)="isDetailModalOpen = false"
        (actionSelected)="handleActionFromDetail($event)">
      </app-product-detail>

      <!-- MODAL DE WHATSAPP (SOLICITUD DE NOMBRE DE CLIENTE) -->
      <app-whatsapp-modal
        [isOpen]="isWhatsappModalOpen"
        [product]="selectedProduct"
        [actionType]="currentActionType"
        (close)="isWhatsappModalOpen = false"
        (reservationSuccess)="onReservationCreated()">
      </app-whatsapp-modal>

    </div>
  `,
})
export class ProductCatalogComponent implements OnInit {
  private productService = inject(ProductService);

  products: Product[] = [];
  categories: Category[] = [];
  loading = true;
  selectedCategoryId: number | string | null = null;
  searchFilter = '';

  // Modales
  isDetailModalOpen = false;
  isWhatsappModalOpen = false;
  selectedProduct: Product | null = null;
  currentActionType: WhatsAppActionType = 'compra';

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (res) => (this.categories = res.data),
      error: (err) => console.error('Error cargando categorías:', err),
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productService
      .getPublicProducts({
        category_id: this.selectedCategoryId || undefined,
        search: this.searchFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          this.products = res.data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando catálogo:', err);
          this.loading = false;
        },
      });
  }

  selectCategory(id: number | string | null): void {
    this.selectedCategoryId = id;
    this.loadProducts();
  }

  onSearch(query: string): void {
    this.searchFilter = query;
    this.loadProducts();
  }

  resetFilters(): void {
    this.selectedCategoryId = null;
    this.searchFilter = '';
    this.loadProducts();
  }

  openDetail(product: Product): void {
    this.selectedProduct = product;
    this.isDetailModalOpen = true;
  }

  openWhatsappModal(action: WhatsAppActionType, product: Product): void {
    this.selectedProduct = product;
    this.currentActionType = action;
    this.isWhatsappModalOpen = true;
  }

  handleActionFromDetail(event: { action: WhatsAppActionType; product: Product }): void {
    this.isDetailModalOpen = false;
    this.openWhatsappModal(event.action, event.product);
  }

  onReservationCreated(): void {
    // Recargar catálogo para refrescar el estado del producto a 'reservado'
    this.loadProducts();
  }
}
