import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../services/reservation.service';
import { ProductService } from '../../../services/product.service';
import { Product, Reservation } from '../../../models/product.model';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Gestión de Reservas & Anticipos</h1>
          <p class="text-xs text-gray-500 mt-1">
            Control de productos apartados con adelanto en Bolivianos (Bs), cálculo de saldo pendiente y cierre de venta con rebajas.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
            <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Vigencia: 7 días exactos</span>
          </div>

          <button 
            (click)="openCreateModal()"
            class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nueva Reserva Manual</span>
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="w-full sm:w-72 relative">
          <input 
            type="text" 
            [(ngModel)]="searchFilter" 
            (ngModelChange)="loadReservations()"
            placeholder="Buscar cliente o producto..." 
            class="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <select 
          [(ngModel)]="statusFilter" 
          (ngModelChange)="loadReservations()"
          class="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">Todas las Reservas</option>
          <option value="activa">Activas (En plazo)</option>
          <option value="completada">Completadas (Vendidas)</option>
          <option value="expirada">Expiradas (> 7 días)</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      <!-- TABLA DE RESERVAS -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
              <tr>
                <th class="px-4 py-3.5">Cliente</th>
                <th class="px-4 py-3.5">Producto Apartado</th>
                <th class="px-4 py-3.5">Precio Acordado</th>
                <th class="px-4 py-3.5">Monto Reserva (Adelanto)</th>
                <th class="px-4 py-3.5">Saldo Pendiente</th>
                <th class="px-4 py-3.5">Fecha Límite (7 Días)</th>
                <th class="px-4 py-3.5">Estado</th>
                <th class="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (res of reservations; track res.id) {
                <tr class="hover:bg-slate-50/70 transition-colors">
                  
                  <!-- Cliente -->
                  <td class="px-4 py-3.5">
                    <p class="font-bold text-gray-900">{{ res.customer_name }}</p>
                    <p class="text-[10px] text-gray-500 font-mono">{{ res.customer_phone || 'Sin teléfono' }}</p>
                  </td>

                  <!-- Producto -->
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-2.5">
                      <img 
                        [src]="res.product?.primary_image || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=100&q=80'" 
                        class="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" 
                        [alt]="res.product?.name || 'Producto'" 
                      />
                      <div>
                        <p class="font-bold text-gray-900 line-clamp-1">{{ res.product?.name }}</p>
                        <p class="text-[10px] text-gray-400 font-mono">Precio de lista: Bs {{ res.product?.sale_price | number:'1.2-2' }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Precio Acordado (con o sin rebaja) -->
                  <td class="px-4 py-3.5 font-mono font-bold text-gray-900">
                    <div>Bs {{ (res.agreed_price || res.product?.sale_price || 0) | number:'1.2-2' }}</div>
                    @if (res.agreed_price && res.product?.sale_price && res.agreed_price < res.product!.sale_price) {
                      <span class="text-[10px] text-emerald-600 font-semibold">
                        Rebaja: -Bs {{ (res.product!.sale_price - res.agreed_price) | number:'1.2-2' }}
                      </span>
                    }
                  </td>

                  <!-- Monto Reserva (Adelanto dejado) -->
                  <td class="px-4 py-3.5 font-mono">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Bs {{ res.advance_payment | number:'1.2-2' }}
                    </span>
                  </td>

                  <!-- Saldo Pendiente por Cobrar -->
                  <td class="px-4 py-3.5 font-mono">
                    @if (res.status === 'completada') {
                      <span class="text-xs font-bold text-emerald-600">Bs 0.00 (Cobrado)</span>
                    } @else {
                      <span 
                        [ngClass]="(res.pending_balance || 0) > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'"
                        class="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs border">
                        Bs {{ (res.pending_balance || 0) | number:'1.2-2' }}
                      </span>
                    }
                  </td>

                  <!-- Fecha Límite -->
                  <td class="px-4 py-3.5">
                    <p class="font-mono text-gray-900 font-medium text-[11px]">{{ res.expires_at | slice:0:16 }}</p>
                    @if (res.status === 'activa') {
                      <span class="text-[10px] text-amber-700 font-semibold block">
                        {{ res.days_remaining }} días restantes
                      </span>
                    }
                  </td>

                  <!-- Estado -->
                  <td class="px-4 py-3.5">
                    @if (res.status === 'activa') {
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Activa
                      </span>
                    } @else if (res.status === 'expirada') {
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        Expirada (7d)
                      </span>
                    } @else if (res.status === 'completada') {
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Vendido
                      </span>
                    } @else {
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                        Cancelada
                      </span>
                    }
                  </td>

                  <!-- Acciones -->
                  <td class="px-4 py-3.5 text-right space-x-1 whitespace-nowrap">
                    @if (res.status === 'activa') {
                      <!-- Concretar Venta con Rebaja -->
                      <button 
                        (click)="openCompleteModal(res)"
                        title="Concretar Venta (Ajustar precio final / rebaja)"
                        class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors">
                        Concretar Venta
                      </button>

                      <!-- Modificar Adelanto / Precio -->
                      <button 
                        (click)="openEditModal(res)"
                        title="Modificar Reserva / Adelanto"
                        class="px-2 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-[11px] transition-colors">
                        Editar
                      </button>

                      <!-- Cancelar Reserva -->
                      <button 
                        (click)="cancelReservation(res)"
                        title="Liberar a Disponible"
                        class="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 font-bold text-[11px] transition-colors">
                        Liberar
                      </button>
                    } @else {
                      <span class="text-gray-400 text-[10px] italic">Sin acciones</span>
                    }
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-4 py-8 text-center text-gray-400 text-xs">
                    No se encontraron registros de reservas.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL CONCRETAR / CERRAR VENTA (CON REBAJA PERSONALIZADA) -->
      @if (isCompleteModalOpen && selectedReservation) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-base font-black text-gray-900 tracking-tight">Cerrar Venta de Producto</h3>
                  <p class="text-[11px] text-gray-500">Ajusta el precio final acordado con el cliente (rebaja).</p>
                </div>
              </div>
              <button 
                type="button" 
                (click)="isCompleteModalOpen = false" 
                class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Resumen de Producto & Reserva -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Cliente:</span>
                <span class="text-xs font-bold text-gray-900">{{ selectedReservation.customer_name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Producto:</span>
                <span class="text-xs font-bold text-gray-900 line-clamp-1">{{ selectedReservation.product?.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Precio de lista catálogo:</span>
                <span class="text-xs font-mono font-bold text-gray-700">Bs {{ selectedReservation.product?.sale_price | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span class="text-xs text-indigo-700 font-semibold">Adelanto ya recibido:</span>
                <span class="text-xs font-mono font-black text-indigo-700">Bs {{ selectedReservation.advance_payment | number:'1.2-2' }}</span>
              </div>
            </div>

            <!-- Entrada de Precio Final Cerrado (Rebaja) -->
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                  Precio Final de Venta Cerrado <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">Bs</span>
                  <input 
                    type="number" 
                    step="0.50"
                    min="0"
                    [(ngModel)]="closeSaleData.final_sale_price" 
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <p class="text-[11px] text-gray-400 mt-1">
                  Si le concediste una rebaja al cliente, modifícalo aquí para que se registre la ganancia exacta.
                </p>
              </div>

              <!-- Indicador de Rebaja Concedida si corresponde -->
              @if (getDiscountAmount() > 0) {
                <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span class="text-emerald-800 font-semibold flex items-center gap-1">
                    <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Rebaja concedida:
                  </span>
                  <span class="font-mono font-bold text-emerald-700">-Bs {{ getDiscountAmount() | number:'1.2-2' }}</span>
                </div>
              }

              <!-- Saldo Final a Cobrar al Cliente Hoy -->
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-amber-900 block">Saldo a cobrar al cliente hoy:</span>
                  <span class="text-[10px] text-amber-700">Precio cerrado menos anticipo recibido</span>
                </div>
                <span class="text-base font-black font-mono text-amber-900">
                  Bs {{ getPendingToCollect() | number:'1.2-2' }}
                </span>
              </div>

              <!-- Checkbox para actualizar precio de lista -->
              <div class="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="updateCatalogCheck"
                  [(ngModel)]="closeSaleData.update_catalog_price" 
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <label for="updateCatalogCheck" class="text-xs text-gray-700 select-none cursor-pointer">
                  Actualizar también el precio de venta en catálogo con este nuevo monto
                </label>
              </div>

              <!-- Control de Exclusión del Dashboard -->
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="includeInDashboardReservation"
                    [(ngModel)]="closeSaleData.include_in_dashboard" 
                    class="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                  />
                  <label for="includeInDashboardReservation" class="text-xs font-bold text-amber-950 select-none cursor-pointer">
                    Sumar esta venta al Dashboard (Ingresos y Ganancia Neta)
                  </label>
                </div>
                <p class="text-[11px] text-amber-800/90 pl-6">
                  Si este producto se vendió por fuera o es un retiro que <strong>NO debe sumarse a tus ingresos del Dashboard</strong>, desmarca esta casilla.
                </p>
              </div>

              <!-- Notas adicionales -->
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Nota u observación (opcional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="closeSaleData.notes" 
                  placeholder="Ej: Se acordó rebaja de Bs 15 pedida en tienda"
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

            </div>

            <!-- Botones -->
            <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button 
                type="button" 
                (click)="isCompleteModalOpen = false" 
                class="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button 
                type="button" 
                (click)="confirmCompleteSale()" 
                [disabled]="completingSale"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5">
                @if (completingSale) {
                  <span>Procesando...</span>
                } @else {
                  <span>Confirmar Venta y Cobro</span>
                }
              </button>
            </div>

          </div>
        </div>
      }

      <!-- MODAL NUEVA RESERVA MANUAL -->
      @if (isCreateModalOpen) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 class="text-base font-black text-gray-900">Registrar Reserva Manual</h3>
              <button 
                type="button" 
                (click)="isCreateModalOpen = false" 
                class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form (ngSubmit)="saveNewReservation()" class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Producto <span class="text-red-500">*</span></label>
                <select 
                  [(ngModel)]="newReservation.product_id" 
                  name="product_id"
                  (ngModelChange)="onProductSelected($event)"
                  required
                  class="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option [ngValue]="null">Selecciona un producto disponible</option>
                  @for (prod of availableProducts; track prod.id) {
                    <option [ngValue]="prod.id">{{ prod.name }} (Bs {{ prod.sale_price | number:'1.2-2' }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Cliente <span class="text-red-500">*</span></label>
                <input 
                  type="text" 
                  [(ngModel)]="newReservation.customer_name" 
                  name="customer_name" 
                  required
                  placeholder="Ej: Marcelo Quiroga"
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Teléfono / WhatsApp</label>
                <input 
                  type="text" 
                  [(ngModel)]="newReservation.customer_phone" 
                  name="customer_phone" 
                  placeholder="Ej: +591 71234567"
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-amber-900 uppercase mb-1">Adelanto (Bs) <span class="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    step="1"
                    min="0"
                    [(ngModel)]="newReservation.advance_payment" 
                    name="advance_payment" 
                    placeholder="Con cuánto aparta"
                    class="w-full px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/40 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Precio Pactado (Bs)</label>
                  <input 
                    type="number" 
                    step="1"
                    min="0"
                    [(ngModel)]="newReservation.agreed_price" 
                    name="agreed_price" 
                    placeholder="Precio acordado"
                    class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="newReservation.notes" 
                  name="notes" 
                  placeholder="Ej: Dejó Bs 50 en efectivo en tienda"
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  (click)="isCreateModalOpen = false" 
                  class="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="savingReservation || !newReservation.product_id || !newReservation.customer_name"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50">
                  {{ savingReservation ? 'Guardando...' : 'Guardar Reserva' }}
                </button>
              </div>
            </form>

          </div>
        </div>
      }

      <!-- MODAL EDITAR ADELANTO / RESERVA -->
      @if (isEditModalOpen && editingReservation) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 class="text-base font-black text-gray-900">Editar Reserva / Adelanto</h3>
              <button 
                type="button" 
                (click)="isEditModalOpen = false" 
                class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form (ngSubmit)="saveEditedReservation()" class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Cliente</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.customer_name" 
                  name="edit_customer_name" 
                  required
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.customer_phone" 
                  name="edit_customer_phone" 
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-amber-900 uppercase mb-1">Monto Adelanto (Bs)</label>
                  <input 
                    type="number" 
                    step="1"
                    min="0"
                    [(ngModel)]="editForm.advance_payment" 
                    name="edit_advance_payment" 
                    class="w-full px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/40 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Precio Acordado (Bs)</label>
                  <input 
                    type="number" 
                    step="1"
                    min="0"
                    [(ngModel)]="editForm.agreed_price" 
                    name="edit_agreed_price" 
                    class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.notes" 
                  name="edit_notes" 
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button 
                  type="button" 
                  (click)="isEditModalOpen = false" 
                  class="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="savingReservation"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md disabled:opacity-50">
                  {{ savingReservation ? 'Actualizando...' : 'Guardar Cambios' }}
                </button>
              </div>
            </form>

          </div>
        </div>
      }

    </div>
  `,
})
export class AdminReservationsComponent implements OnInit {
  private reservationService = inject(ReservationService);
  private productService = inject(ProductService);

  reservations: Reservation[] = [];
  availableProducts: Product[] = [];
  searchFilter = '';
  statusFilter = '';

  // Modal Concretar Venta
  isCompleteModalOpen = false;
  selectedReservation: Reservation | null = null;
  completingSale = false;
  closeSaleData = {
    final_sale_price: 0,
    update_catalog_price: false,
    include_in_dashboard: true,
    notes: '',
  };

  // Modal Crear Reserva Manual
  isCreateModalOpen = false;
  savingReservation = false;
  newReservation = {
    product_id: null as number | string | null,
    customer_name: '',
    customer_phone: '',
    advance_payment: 0,
    agreed_price: 0,
    notes: '',
    expires_days: 7,
  };

  // Modal Editar Reserva
  isEditModalOpen = false;
  editingReservation: Reservation | null = null;
  editForm = {
    customer_name: '',
    customer_phone: '',
    advance_payment: 0,
    agreed_price: 0,
    notes: '',
  };

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.reservationService
      .getAdminReservations({
        search: this.searchFilter || undefined,
        status: this.statusFilter || undefined,
      })
      .subscribe({
        next: (res) => (this.reservations = res.data),
        error: (err) => console.error(err),
      });
  }

  loadAvailableProducts(): void {
    this.productService.getAdminProducts({ status: 'disponible' }).subscribe({
      next: (res) => (this.availableProducts = res.data),
      error: (err) => console.error(err),
    });
  }

  // --- CONCRETAR VENTA ---
  openCompleteModal(reservation: Reservation): void {
    this.selectedReservation = reservation;
    const initialPrice = reservation.agreed_price && reservation.agreed_price > 0
      ? reservation.agreed_price
      : (reservation.product?.sale_price || 0);

    this.closeSaleData = {
      final_sale_price: initialPrice,
      update_catalog_price: false,
      include_in_dashboard: true,
      notes: '',
    };
    this.isCompleteModalOpen = true;
  }

  getDiscountAmount(): number {
    if (!this.selectedReservation || !this.selectedReservation.product) return 0;
    const original = this.selectedReservation.product.sale_price;
    const finalPrice = this.closeSaleData.final_sale_price;
    return Math.max(0, original - finalPrice);
  }

  getPendingToCollect(): number {
    if (!this.selectedReservation) return 0;
    const finalPrice = this.closeSaleData.final_sale_price;
    const advance = this.selectedReservation.advance_payment || 0;
    return Math.max(0, finalPrice - advance);
  }

  confirmCompleteSale(): void {
    if (!this.selectedReservation) return;
    if (this.closeSaleData.final_sale_price <= 0) {
      alert('Por favor ingresa un precio de venta final válido.');
      return;
    }

    this.completingSale = true;
    this.reservationService
      .completeReservation(this.selectedReservation.id, {
        final_sale_price: this.closeSaleData.final_sale_price,
        notes: this.closeSaleData.notes || undefined,
        update_catalog_price: this.closeSaleData.update_catalog_price,
        include_in_dashboard: this.closeSaleData.include_in_dashboard,
      })
      .subscribe({
        next: () => {
          this.completingSale = false;
          this.isCompleteModalOpen = false;
          this.loadReservations();
        },
        error: (err) => {
          this.completingSale = false;
          console.error(err);
          alert(err.error?.message || 'Error al completar la venta.');
        },
      });
  }

  // --- CREAR RESERVA MANUAL ---
  openCreateModal(): void {
    this.loadAvailableProducts();
    this.newReservation = {
      product_id: null,
      customer_name: '',
      customer_phone: '',
      advance_payment: 0,
      agreed_price: 0,
      notes: '',
      expires_days: 7,
    };
    this.isCreateModalOpen = true;
  }

  onProductSelected(productId: number | string | null): void {
    if (!productId) return;
    const prod = this.availableProducts.find((p) => String(p.id) === String(productId));
    if (prod) {
      this.newReservation.agreed_price = prod.sale_price;
    }
  }

  saveNewReservation(): void {
    if (!this.newReservation.product_id || !this.newReservation.customer_name.trim()) {
      alert('Por favor selecciona un producto e indica el nombre del cliente.');
      return;
    }

    this.savingReservation = true;
    this.reservationService
      .createAdminReservation({
        product_id: this.newReservation.product_id,
        customer_name: this.newReservation.customer_name.trim(),
        customer_phone: this.newReservation.customer_phone.trim() || undefined,
        advance_payment: this.newReservation.advance_payment || 0,
        agreed_price: this.newReservation.agreed_price || undefined,
        notes: this.newReservation.notes.trim() || undefined,
        expires_days: this.newReservation.expires_days || 7,
      })
      .subscribe({
        next: () => {
          this.savingReservation = false;
          this.isCreateModalOpen = false;
          this.loadReservations();
        },
        error: (err) => {
          this.savingReservation = false;
          console.error(err);
          alert(err.error?.message || 'Error al registrar la reserva.');
        },
      });
  }

  // --- EDITAR RESERVA ---
  openEditModal(reservation: Reservation): void {
    this.editingReservation = reservation;
    this.editForm = {
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone || '',
      advance_payment: reservation.advance_payment || 0,
      agreed_price: reservation.agreed_price || reservation.product?.sale_price || 0,
      notes: reservation.notes || '',
    };
    this.isEditModalOpen = true;
  }

  saveEditedReservation(): void {
    if (!this.editingReservation) return;

    this.savingReservation = true;
    this.reservationService
      .updateReservation(this.editingReservation.id, {
        customer_name: this.editForm.customer_name.trim(),
        customer_phone: this.editForm.customer_phone.trim() || undefined,
        advance_payment: this.editForm.advance_payment,
        agreed_price: this.editForm.agreed_price,
        notes: this.editForm.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.savingReservation = false;
          this.isEditModalOpen = false;
          this.loadReservations();
        },
        error: (err) => {
          this.savingReservation = false;
          console.error(err);
          alert(err.error?.message || 'Error al actualizar la reserva.');
        },
      });
  }

  // --- CANCELAR RESERVA ---
  cancelReservation(reservation: Reservation): void {
    if (
      confirm(
        `¿Liberar la reserva de ${reservation.customer_name}? El producto volverá a estar "Disponible" para el catálogo público.`
      )
    ) {
      this.reservationService.cancelReservation(reservation.id).subscribe({
        next: () => this.loadReservations(),
        error: (err) => console.error(err),
      });
    }
  }
}
