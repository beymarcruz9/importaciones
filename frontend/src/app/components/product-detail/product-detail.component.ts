import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { WhatsAppActionType } from '../../services/whatsapp.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen && product) {
      <div class="fixed inset-0 z-40 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
          
          <!-- Encabezado con Botón Cerrar -->
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                {{ product.category?.name || 'Importación Directa' }}
              </span>
              @if (product.status === 'disponible') {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Disponible
                </span>
              } @else if (product.status === 'reservado') {
                <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  Reservado
                </span>
              }
            </div>

            <button 
              (click)="closeModal()" 
              class="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Contenido con Scroll -->
          <div class="p-6 overflow-y-auto space-y-6">
            
            <!-- CARRUSEL DE IMÁGENES (1 A 3 FOTOS) -->
            <div class="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video md:aspect-[16/10] group">
              <img 
                [src]="currentImage" 
                [alt]="product.name" 
                class="w-full h-full object-contain md:object-cover transition-opacity duration-300"
              />

              <!-- Flecha Anterior (si tiene más de 1 imagen) -->
              @if (imagesList.length > 1) {
                <button 
                  (click)="prevImage()"
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-90 group-hover:opacity-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <!-- Flecha Siguiente -->
                <button 
                  (click)="nextImage()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-90 group-hover:opacity-100">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <!-- Indicadores de puntos (Dots) -->
                <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full">
                  @for (img of imagesList; track $index) {
                    <button 
                      (click)="activeImageIndex = $index"
                      [ngClass]="activeImageIndex === $index ? 'w-5 bg-white' : 'w-2 bg-white/50'"
                      class="h-2 rounded-full transition-all">
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Miniaturas del Carrusel (1 a 3 fotos) -->
            @if (imagesList.length > 1) {
              <div class="flex gap-2 justify-center">
                @for (img of imagesList; track $index) {
                  <button 
                    (click)="activeImageIndex = $index"
                    [ngClass]="activeImageIndex === $index ? 'ring-2 ring-indigo-600 ring-offset-2' : 'opacity-60 hover:opacity-100'"
                    class="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 transition-all">
                    <img [src]="img" class="w-full h-full object-cover" [alt]="product.name" />
                  </button>
                }
              </div>
            }

            <!-- Título y Precio -->
            <div class="flex flex-col md:flex-row md:items-baseline justify-between gap-2 border-b border-gray-100 pb-4">
              <h1 class="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                {{ product.name }}
              </h1>
              <div class="text-2xl md:text-3xl font-extrabold text-indigo-600">
                Bs {{ product.sale_price | number:'1.2-2' }}
              </div>
            </div>

            <!-- Descripción -->
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Descripción del producto
              </h3>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {{ product.description || 'Sin descripción detallada disponible.' }}
              </p>
            </div>

            @if (product.status === 'reservado') {
              <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div class="text-xs text-amber-900">
                  <span class="font-bold">Producto en Reserva Temporal:</span> Este artículo cuenta con una reserva de 7 días. Si la reserva caduca o se cancela, volverá a estar libre de inmediato. Puedes consultar disponibilidad por WhatsApp.
                </div>
              </div>
            }

          </div>

          <!-- BOTONES DOBLES CALL TO ACTION (WHATSAPP Y RESERVAR) -->
          <div class="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            
            <!-- Botón 1: Pedir por WhatsApp -->
            <button 
              (click)="triggerAction('compra')"
              class="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
              </svg>
              <span>Pedir por WhatsApp</span>
            </button>

            <!-- Botón 2: Reservar -->
            <button 
              (click)="triggerAction('reserva')"
              [disabled]="product.status === 'reservado'"
              [ngClass]="product.status === 'reservado' ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-indigo-900 text-white shadow-lg shadow-slate-900/20 active:scale-[0.99]'"
              class="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{{ product.status === 'reservado' ? 'Ya Reservado' : 'Reservar por 7 días' }}</span>
            </button>

          </div>

        </div>
      </div>
    }
  `,
})
export class ProductDetailComponent {
  @Input() isOpen = false;
  @Input() product: Product | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() actionSelected = new EventEmitter<{ action: WhatsAppActionType; product: Product }>();

  activeImageIndex = 0;

  get imagesList(): string[] {
    if (!this.product || !this.product.images || this.product.images.length === 0) {
      return [
        this.product?.primary_image ||
          'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=800&q=80',
      ];
    }
    return this.product.images.map((img) => img.image_url).slice(0, 3);
  }

  get currentImage(): string {
    return this.imagesList[this.activeImageIndex] || this.imagesList[0];
  }

  prevImage(): void {
    if (this.activeImageIndex > 0) {
      this.activeImageIndex--;
    } else {
      this.activeImageIndex = this.imagesList.length - 1;
    }
  }

  nextImage(): void {
    if (this.activeImageIndex < this.imagesList.length - 1) {
      this.activeImageIndex++;
    } else {
      this.activeImageIndex = 0;
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.activeImageIndex = 0;
    this.close.emit();
  }

  triggerAction(action: WhatsAppActionType): void {
    if (!this.product) return;
    this.actionSelected.emit({ action, product: this.product });
  }
}
