import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/product.model';
import { WhatsappService, WhatsAppActionType } from '../../services/whatsapp.service';
import { ReservationService } from '../../services/reservation.service';

@Component({
  selector: 'app-whatsapp-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen && product) {
      <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
        <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform transition-all border border-gray-100">
          
          <!-- Encabezado Modal -->
          <div class="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
            <div class="flex items-center gap-2.5">
              <div 
                [ngClass]="actionType === 'compra' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                class="w-9 h-9 rounded-xl flex items-center justify-center">
                @if (actionType === 'compra') {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              </div>
              <div>
                <h3 class="text-base font-bold text-gray-900">
                  {{ actionType === 'compra' ? 'Comprar por WhatsApp' : 'Reservar Producto (7 días)' }}
                </h3>
                <p class="text-xs text-gray-500">
                  {{ actionType === 'compra' ? 'Atención inmediata por chat' : 'Tu producto queda apartado por 7 días exactos' }}
                </p>
              </div>
            </div>
            
            <button 
              (click)="closeModal()" 
              class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Resumen del Producto -->
          <div class="p-5">
            <div class="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
              <img 
                [src]="product.primary_image || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=400&q=80'" 
                [alt]="product.name"
                class="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {{ product.category?.name || 'Producto' }}
                </p>
                <h4 class="text-sm font-bold text-gray-900 truncate">
                  {{ product.name }}
                </h4>
                <p class="text-base font-black text-gray-900 mt-0.5">
                  Bs {{ product.sale_price | number:'1.2-2' }}
                </p>
              </div>
            </div>

            <!-- Formulario: Nombre del Cliente -->
            <form (ngSubmit)="confirmAndRedirect()">
              <div class="mb-4">
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nombre del Cliente <span class="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="customerName" 
                  name="customerName"
                  placeholder="Ej: Juan Pérez"
                  required
                  autofocus
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
                @if (submitted && !customerName.trim()) {
                  <p class="text-xs text-red-500 mt-1">Por favor ingresa tu nombre completo.</p>
                }
              </div>

              <!-- Teléfono opcional -->
              <div class="mb-4">
                <label class="block text-xs font-medium text-gray-600 mb-1">
                  Teléfono / Celular (Opcional)
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="customerPhone" 
                  name="customerPhone"
                  placeholder="Ej: +591 70000000"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <!-- Campo específico si es RESERVA: Monto con el que reserva / Adelanto -->
              @if (actionType === 'reserva') {
                <div class="mb-4">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Monto de Reserva / Adelanto (Opcional)
                    </label>
                    <span class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold">Anticipo en Bs</span>
                  </div>
                  <div class="relative">
                    <span class="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">Bs</span>
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      [(ngModel)]="advanceAmount" 
                      name="advanceAmount"
                      placeholder="Ej: 50.00"
                      class="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/30 text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <p class="text-[11px] text-gray-500 mt-1">
                    Indica con cuánto dinero deseas apartar el producto (el saldo restante lo pagas al retirarlo).
                  </p>
                </div>
              }

              <!-- Campo específico si es COMPRA: Precio acordado / Rebaja previa -->
              @if (actionType === 'compra') {
                <div class="mb-4">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      ¿Acordaste una rebaja? (Precio en Bs)
                    </label>
                    <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">Opcional</span>
                  </div>
                  <div class="relative">
                    <span class="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">Bs</span>
                    <input 
                      type="number" 
                      step="1"
                      min="0"
                      [(ngModel)]="agreedOfferPrice" 
                      name="agreedOfferPrice"
                      [placeholder]="'Precio de lista: ' + (product.sale_price | number:'1.2-2')"
                      class="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <p class="text-[11px] text-gray-500 mt-1">
                    Si conversaste una rebaja con el vendedor, anota aquí el precio acordado.
                  </p>
                </div>
              }

              <!-- Preview del mensaje dinámico exacto -->
              <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-5">
                <p class="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                  </svg>
                  Mensaje que se enviará a WhatsApp:
                </p>
                <p class="text-xs text-emerald-950 font-mono bg-white/70 p-2 rounded border border-emerald-100/80">
                  "{{ generatedPreviewMessage }}"
                </p>
              </div>

              <!-- Botones de Acción -->
              <div class="flex items-center gap-3">
                <button 
                  type="button" 
                  (click)="closeModal()" 
                  class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="loading"
                  [ngClass]="actionType === 'compra' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'"
                  class="flex-2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all">
                  @if (loading) {
                    <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Procesando...</span>
                  } @else {
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z"/>
                    </svg>
                    <span>Confirmar y Enviar a WhatsApp</span>
                  }
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    }
  `,
})
export class WhatsappModalComponent {
  private whatsappService = inject(WhatsappService);
  private reservationService = inject(ReservationService);

  @Input() isOpen = false;
  @Input() product: Product | null = null;
  @Input() actionType: WhatsAppActionType = 'compra';

  @Output() close = new EventEmitter<void>();
  @Output() reservationSuccess = new EventEmitter<void>();

  customerName = '';
  customerPhone = '';
  advanceAmount: number | null = null;
  agreedOfferPrice: number | null = null;
  submitted = false;
  loading = false;

  get generatedPreviewMessage(): string {
    if (!this.product) return '';
    const formattedPrice = `Bs ${this.product.sale_price.toFixed(2)}`;
    if (this.actionType === 'compra') {
      if (this.agreedOfferPrice && this.agreedOfferPrice > 0 && this.agreedOfferPrice !== this.product.sale_price) {
        return `Hola, quiero comprar el producto ${this.product.name} (Precio lista: ${formattedPrice}, precio acordado/rebaja: Bs ${this.agreedOfferPrice.toFixed(2)}).`;
      }
      return `Hola, quiero comprar el producto ${this.product.name} de precio ${formattedPrice}.`;
    } else {
      if (this.advanceAmount && this.advanceAmount > 0) {
        return `Hola, quiero reservar el producto ${this.product.name} de precio ${formattedPrice} con un adelanto de Bs ${this.advanceAmount.toFixed(2)}.`;
      }
      return `Hola, quiero reservar el producto ${this.product.name} de precio ${formattedPrice}.`;
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.customerName = '';
    this.customerPhone = '';
    this.advanceAmount = null;
    this.agreedOfferPrice = null;
    this.submitted = false;
    this.loading = false;
    this.close.emit();
  }

  confirmAndRedirect(): void {
    this.submitted = true;
    if (!this.customerName.trim() || !this.product) {
      return;
    }

    const advance = this.advanceAmount && this.advanceAmount > 0 ? this.advanceAmount : undefined;
    const agreed = this.agreedOfferPrice && this.agreedOfferPrice > 0 ? this.agreedOfferPrice : undefined;

    if (this.actionType === 'reserva') {
      this.loading = true;
      // Registrar la reserva en el backend (vigencia de 7 días exactos con adelanto si se indicó)
      this.reservationService
        .createPublicReservation(
          this.product.id,
          this.customerName.trim(),
          this.customerPhone.trim() || undefined,
          advance ? `Reserva con adelanto de Bs ${advance.toFixed(2)}` : 'Reserva desde botón WhatsApp',
          advance,
          agreed
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.redirectToWhatsApp();
            this.reservationSuccess.emit();
            this.closeModal();
          },
          error: (err) => {
            this.loading = false;
            // Aún si falla la conexión al backend, permitimos la apertura de WhatsApp para no perder el lead
            console.error('Error registrando reserva en base de datos:', err);
            this.redirectToWhatsApp();
            this.closeModal();
          },
        });
    } else {
      // Compra directa vía WhatsApp
      this.redirectToWhatsApp();
      this.closeModal();
    }
  }

  private redirectToWhatsApp(): void {
    if (!this.product) return;
    this.whatsappService.openChat(
      this.actionType,
      this.product.name,
      this.product.sale_price,
      {
        advancePayment: this.advanceAmount && this.advanceAmount > 0 ? this.advanceAmount : undefined,
        customOfferPrice: this.agreedOfferPrice && this.agreedOfferPrice > 0 ? this.agreedOfferPrice : undefined,
      }
    );
  }
}
