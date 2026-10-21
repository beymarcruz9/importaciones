import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../services/product.service';
import { Category, Product, ProductStatus } from '../../../models/product.model';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      
      <!-- Encabezado de Sección -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Gestión de Productos</h1>
          <p class="text-xs text-gray-500 mt-1">
            Administra el catálogo, costos confidenciales, precios de venta en Bolivianos (Bs) y fotos desde tu PC o celular.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button 
            (click)="openCategoryModal()"
            class="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>Gestionar Categorías</span>
          </button>

          <button 
            (click)="openCreateModal()"
            class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Añadir Producto</span>
          </button>
        </div>
      </div>

      <!-- Filtros y Búsqueda -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div class="w-full sm:w-72 relative">
          <input 
            type="text" 
            [(ngModel)]="searchTerm" 
            (ngModelChange)="onSearchChange()"
            placeholder="Buscar por nombre..." 
            class="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <select 
            [(ngModel)]="statusFilter" 
            (ngModelChange)="loadProducts()"
            class="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">Todos los Estados</option>
            <option value="disponible">Disponible</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
          </select>
        </div>
      </div>

      <!-- TABLA DE PRODUCTOS -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
              <tr>
                <th class="px-4 py-3.5">Producto</th>
                <th class="px-4 py-3.5">Categoría</th>
                <th class="px-4 py-3.5">Precio Costo (Base)</th>
                <th class="px-4 py-3.5">Precio Venta</th>
                <th class="px-4 py-3.5">Margen Unitario</th>
                <th class="px-4 py-3.5">Estado</th>
                <th class="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (product of products; track product.id) {
                <tr class="hover:bg-slate-50/70 transition-colors">
                  
                  <!-- Producto con Miniatura -->
                  <td class="px-4 py-3.5">
                    <div class="flex items-center gap-3">
                      <img 
                        [src]="product.primary_image || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&w=150&q=80'" 
                        class="w-11 h-11 rounded-lg object-cover border border-gray-200 flex-shrink-0" 
                        [alt]="product.name" 
                      />
                      <div>
                        <p class="font-bold text-gray-900 line-clamp-1">{{ product.name }}</p>
                        <p class="text-[10px] text-gray-400 font-mono">ID: #{{ product.id }}</p>
                      </div>
                    </div>
                  </td>

                  <!-- Categoría -->
                  <td class="px-4 py-3.5 text-gray-600">
                    <span class="px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
                      {{ product.category?.name || 'General' }}
                    </span>
                  </td>

                  <!-- Costo (Confidencial Admin) en Bolivianos -->
                  <td class="px-4 py-3.5 font-mono font-medium text-gray-600">
                    Bs {{ product.cost_price | number:'1.2-2' }}
                  </td>

                  <!-- Venta en Bolivianos -->
                  <td class="px-4 py-3.5 font-mono font-bold text-gray-900">
                    Bs {{ product.sale_price | number:'1.2-2' }}
                  </td>

                  <!-- Margen Unitario en Bolivianos -->
                  <td class="px-4 py-3.5 font-mono font-bold text-emerald-600">
                    +Bs {{ ((product.sale_price || 0) - (product.cost_price || 0)) | number:'1.2-2' }}
                  </td>

                  <!-- Estado -->
                  <td class="px-4 py-3.5">
                    <select 
                      [ngModel]="product.status"
                      (ngModelChange)="onStatusChange(product, $event)"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': product.status === 'disponible',
                        'bg-amber-50 text-amber-700 border-amber-200': product.status === 'reservado',
                        'bg-slate-100 text-slate-700 border-slate-300': product.status === 'vendido'
                      }"
                      class="px-2.5 py-1 text-[11px] font-bold rounded-lg border focus:outline-none cursor-pointer">
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </td>

                  <!-- Acciones -->
                  <td class="px-4 py-3.5 text-right space-x-1">
                    <button 
                      (click)="openEditModal(product)"
                      title="Editar Producto"
                      class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      (click)="deleteProduct(product)"
                      title="Eliminar"
                      class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>

                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-4 py-8 text-center text-gray-400 text-xs">
                    No se encontraron productos registrados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL FORMULARIO DE CREAR / EDITAR PRODUCTO -->
      @if (isModalOpen) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col">
            
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 class="text-base font-bold text-gray-900">
                {{ isEditing ? 'Editar Producto #' + editingId : 'Añadir Nuevo Producto' }}
              </h3>
              <button (click)="isModalOpen = false" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form (ngSubmit)="saveProduct()" class="p-6 overflow-y-auto space-y-4 flex-1">
              
              <!-- Nombre -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Producto <span class="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="formData.name" 
                  name="name" 
                  required 
                  placeholder="Ej: Smartwatch Deportivo 4K"
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <!-- Categoría y Estado -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">Categoría</label>
                    <button 
                      type="button" 
                      (click)="openCategoryModal()"
                      class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                      + Nueva categoría
                    </button>
                  </div>
                  <select 
                    [(ngModel)]="formData.category_id" 
                    name="category_id"
                    class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option [ngValue]="null">Sin Categoría</option>
                    @for (cat of categories; track cat.id) {
                      <option [ngValue]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Estado</label>
                  <select 
                    [(ngModel)]="formData.status" 
                    name="status"
                    class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="disponible">Disponible</option>
                    <option value="reservado">Reservado</option>
                    <option value="vendido">Vendido</option>
                  </select>
                </div>
              </div>

              <!-- Precios en Bolivianos: Costo y Venta -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Precio de Costo (Oculto) <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs text-gray-400 font-bold">Bs</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      [(ngModel)]="formData.cost_price" 
                      name="cost_price" 
                      required
                      placeholder="0.00"
                      class="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                  <span class="text-[10px] text-gray-400">Solo visible para administradores</span>
                </div>

                <div>
                  <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Precio de Venta al Público <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs text-gray-400 font-bold">Bs</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      [(ngModel)]="formData.sale_price" 
                      name="sale_price" 
                      required
                      placeholder="0.00"
                      class="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <!-- Descripción -->
              <div>
                <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Descripción</label>
                <textarea 
                  rows="3" 
                  [(ngModel)]="formData.description" 
                  name="description"
                  placeholder="Detalles y características técnicas..."
                  class="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
              </div>

              <!-- SECCIÓN DE FOTOS: ARCHIVOS LOCALES (PC / CELULAR) O ENLACE URL -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Fotos del Producto (1 a 3 fotos para el carrusel)
                    </label>
                    <p class="text-[10px] text-gray-400">
                      Sube fotos desde tu computadora o la galería de tu celular
                    </p>
                  </div>
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    {{ formData.images.length }} / 3 fotos
                  </span>
                </div>

                <!-- Lista de imágenes con preview y cargador -->
                <div class="space-y-3">
                  @for (url of formData.images; track $index) {
                    <div class="p-3 rounded-2xl bg-slate-50 border border-gray-200/80 space-y-2">
                      <div class="flex items-center gap-3">
                        
                        <!-- Vista previa miniatura -->
                        <div class="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0 relative group">
                          @if (url) {
                            <img [src]="url" class="w-full h-full object-cover" alt="Preview" />
                          } @else {
                            <div class="w-full h-full flex items-center justify-center text-gray-400">
                              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          }

                          @if (isUploading[$index]) {
                            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center text-white">
                              <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                              </svg>
                            </div>
                          }
                        </div>

                        <!-- Opciones de carga: Botón PC/Celular + Input URL -->
                        <div class="flex-1 space-y-1.5 min-w-0">
                          <div class="flex items-center justify-between">
                            <span class="text-[11px] font-bold text-gray-700">
                              {{ $index === 0 ? '⭐ Foto 1 (Portada Principal)' : 'Foto ' + ($index + 1) }}
                            </span>
                            @if (formData.images.length > 1) {
                              <button 
                                type="button" 
                                (click)="removeImageInput($index)"
                                class="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                                </svg>
                                <span>Eliminar</span>
                              </button>
                            }
                          </div>

                          <div class="flex items-center gap-2">
                            <!-- Input de Archivo nativo para PC y Celular -->
                            <input 
                              type="file" 
                              #fileInput
                              (change)="onFileSelected($event, $index)"
                              accept="image/png, image/jpeg, image/jpg, image/webp" 
                              class="hidden" 
                            />

                            <!-- Botón que activa la cámara / galería o explorador de PC -->
                            <button 
                              type="button" 
                              (click)="fileInput.click()"
                              class="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors flex items-center gap-1.5 flex-shrink-0">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>Subir desde este dispositivo</span>
                            </button>

                            <!-- Campo URL opcional -->
                            <input 
                              type="text" 
                              [(ngModel)]="formData.images[$index]" 
                              [name]="'image_url_' + $index"
                              placeholder="O pega enlace URL aquí..."
                              class="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                            />
                          </div>

                        </div>

                      </div>
                    </div>
                  }
                </div>

                <!-- Botón Añadir otra imagen -->
                @if (formData.images.length < 3) {
                  <button 
                    type="button" 
                    (click)="addImageInput()"
                    class="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-xs font-bold text-gray-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Añadir otra foto (máximo 3 fotos)</span>
                  </button>
                }
              </div>

              <!-- Botones Modal -->
              <div class="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  (click)="isModalOpen = false" 
                  class="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  [disabled]="saving"
                  class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">
                  {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar Producto') }}
                </button>
              </div>

            </form>
          </div>
        </div>
      }

      <!-- MODAL GESTIÓN DE CATEGORÍAS (CREAR / ELIMINAR) -->
      @if (isCategoryModalOpen) {
        <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            
            <!-- Encabezado Modal Categorías -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-base font-black text-gray-900 tracking-tight">Gestión de Categorías</h3>
                  <p class="text-[11px] text-gray-500">Agrega o elimina categorías para clasificar los productos.</p>
                </div>
              </div>
              <button 
                type="button" 
                (click)="closeCategoryModal()" 
                class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Formulario para Crear Nueva Categoría -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Categoría</span>
              </h4>
              <div class="space-y-2">
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 mb-1">Nombre de la categoría <span class="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    [(ngModel)]="newCategoryName" 
                    placeholder="Ej. Ropa Deportiva, Relojes, Herramientas..." 
                    class="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    (keydown.enter)="createCategory()"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 mb-1">Descripción breve (opcional)</label>
                  <input 
                    type="text" 
                    [(ngModel)]="newCategoryDesc" 
                    placeholder="Ej. Artículos para entrenamiento y gimnasio" 
                    class="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    (keydown.enter)="createCategory()"
                  />
                </div>
                <div class="flex justify-end pt-1">
                  <button 
                    type="button" 
                    (click)="createCategory()" 
                    [disabled]="creatingCategory || !newCategoryName.trim()"
                    class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5">
                    @if (creatingCategory) {
                      <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Guardando...</span>
                    } @else {
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Agregar Categoría</span>
                    }
                  </button>
                </div>
              </div>
            </div>

            <!-- Lista de Categorías Existentes -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Categorías Existentes</h4>
                <span class="text-[11px] text-gray-400 font-medium">{{ adminCategories.length }} registradas</span>
              </div>

              <div class="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                @for (cat of adminCategories; track cat.id) {
                  <div class="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div class="space-y-0.5 pr-2">
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-900">{{ cat.name }}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {{ cat.products_count ?? 0 }} productos
                        </span>
                      </div>
                      @if (cat.description) {
                        <p class="text-[11px] text-gray-500 line-clamp-1">{{ cat.description }}</p>
                      }
                    </div>

                    <button 
                      type="button" 
                      (click)="deleteCategory(cat)"
                      [disabled]="deletingCategoryId === cat.id"
                      title="Eliminar categoría"
                      class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50">
                      @if (deletingCategoryId === cat.id) {
                        <svg class="animate-spin w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                      } @else {
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      }
                    </button>
                  </div>
                } @empty {
                  <div class="p-6 text-center text-xs text-gray-400">
                    No hay categorías registradas aún. Agrega una arriba.
                  </div>
                }
              </div>
              <p class="text-[10px] text-gray-400 italic">
                * Nota: Al eliminar una categoría, los productos asignados pasarán a "Sin Categoría" sin borrarse del sistema.
              </p>
            </div>

            <!-- Botón Cerrar Modal -->
            <div class="pt-3 border-t border-gray-100 flex justify-end">
              <button 
                type="button" 
                (click)="closeCategoryModal()" 
                class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm">
                Listo / Cerrar
              </button>
            </div>

          </div>
        </div>
      }

      <!-- MODAL CERRAR VENTA DIRECTA (CON REBAJA PERSONALIZADA) -->
      @if (isSaleModalOpen && saleProduct) {
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
                  <p class="text-[11px] text-gray-500">Registra el precio final cobrado con rebaja acordada.</p>
                </div>
              </div>
              <button 
                type="button" 
                (click)="cancelDirectSale()" 
                class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Resumen de Costo y Venta -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Producto:</span>
                <span class="text-xs font-bold text-gray-900 line-clamp-1">{{ saleProduct.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Precio de lista catálogo:</span>
                <span class="text-xs font-mono font-bold text-gray-700">Bs {{ saleProduct.sale_price | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 font-medium">Costo confidencial:</span>
                <span class="text-xs font-mono text-gray-500">Bs {{ (saleProduct.cost_price || 0) | number:'1.2-2' }}</span>
              </div>
            </div>

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
                    [(ngModel)]="saleFinalPrice" 
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <p class="text-[11px] text-gray-400 mt-1">
                  Si pactaste una rebaja con el cliente, modifica este valor para registrar la ganancia exacta.
                </p>
              </div>

              <!-- Rebaja Concedida -->
              @if (saleProduct.sale_price - saleFinalPrice > 0) {
                <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span class="text-emerald-800 font-semibold">Rebaja aplicada al cliente:</span>
                  <span class="font-mono font-bold text-emerald-700">-Bs {{ (saleProduct.sale_price - saleFinalPrice) | number:'1.2-2' }}</span>
                </div>
              }

              <!-- Ganancia Neta Calculada -->
              <div class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <span class="text-indigo-900 font-semibold">Ganancia neta real de la venta:</span>
                <span class="font-mono font-bold text-indigo-700">+Bs {{ (saleFinalPrice - (saleProduct.cost_price || 0)) | number:'1.2-2' }}</span>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre del cliente (opcional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="saleCustomerName" 
                  placeholder="Ej: Carlos Rojas"
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div class="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="updateCatalogCheckDirect"
                  [(ngModel)]="saleUpdateCatalogPrice" 
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label for="updateCatalogCheckDirect" class="text-xs text-gray-700 select-none cursor-pointer">
                  Actualizar también el precio del producto en el catálogo con este nuevo monto
                </label>
              </div>

              <!-- Control de Exclusión del Dashboard -->
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div class="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="includeInDashboardDirect"
                    [(ngModel)]="saleIncludeInDashboard" 
                    class="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                  />
                  <label for="includeInDashboardDirect" class="text-xs font-bold text-amber-950 select-none cursor-pointer">
                    Sumar esta venta al Dashboard (Ingresos y Ganancia Neta)
                  </label>
                </div>
                <p class="text-[11px] text-amber-800/90 pl-6">
                  Si este producto se vendió por fuera o es un retiro que <strong>NO debe sumarse a tus ingresos del Dashboard</strong>, desmarca esta casilla.
                </p>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Notas u observaciones (opcional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="saleNotes" 
                  placeholder="Ej: Rebaja aceptada por pago en efectivo"
                  class="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <!-- Botones -->
            <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button 
                type="button" 
                (click)="cancelDirectSale()" 
                class="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button 
                type="button" 
                (click)="confirmDirectSale()" 
                [disabled]="confirmingSale || saleFinalPrice <= 0"
                class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50">
                {{ confirmingSale ? 'Guardando...' : 'Confirmar Venta' }}
              </button>
            </div>

          </div>
        </div>
      }

    </div>
  `,
})
export class AdminProductsComponent implements OnInit {
  private productService = inject(ProductService);

  products: Product[] = [];
  categories: Category[] = [];
  searchTerm = '';
  statusFilter = '';

  // Modal Productos
  isModalOpen = false;
  isEditing = false;
  editingId: number | string | null = null;
  saving = false;
  isUploading: boolean[] = [false, false, false];

  // Modal Categorías
  isCategoryModalOpen = false;
  adminCategories: Category[] = [];
  newCategoryName = '';
  newCategoryDesc = '';
  creatingCategory = false;
  deletingCategoryId: number | string | null = null;

  // Modal Cerrar Venta con Rebaja
  isSaleModalOpen = false;
  saleProduct: Product | null = null;
  saleFinalPrice = 0;
  saleCustomerName = '';
  saleNotes = '';
  saleUpdateCatalogPrice = false;
  saleIncludeInDashboard = true;
  confirmingSale = false;

  formData = {
    category_id: null as number | string | null,
    name: '',
    description: '',
    cost_price: 0,
    sale_price: 0,
    status: 'disponible' as ProductStatus,
    images: [''] as string[],
  };

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (res) => (this.categories = res.data),
    });
  }

  loadProducts(): void {
    this.productService
      .getAdminProducts({
        search: this.searchTerm || undefined,
        status: this.statusFilter || undefined,
      })
      .subscribe({
        next: (res) => (this.products = res.data),
        error: (err) => console.error(err),
      });
  }

  onSearchChange(): void {
    this.loadProducts();
  }

  onStatusChange(product: Product, newStatus: ProductStatus): void {
    if (newStatus === 'vendido') {
      this.saleProduct = product;
      this.saleFinalPrice = product.sale_price;
      this.saleCustomerName = '';
      this.saleNotes = '';
      this.saleUpdateCatalogPrice = false;
      this.saleIncludeInDashboard = true;
      this.isSaleModalOpen = true;
      return;
    }

    this.productService.updateStatus(product.id, newStatus).subscribe({
      next: () => {
        product.status = newStatus;
      },
      error: (err) => console.error(err),
    });
  }

  cancelDirectSale(): void {
    this.isSaleModalOpen = false;
    this.saleProduct = null;
    this.loadProducts(); // reestablece el valor previo del select
  }

  confirmDirectSale(): void {
    if (!this.saleProduct) return;
    if (this.saleFinalPrice <= 0) {
      alert('Por favor ingresa un precio de venta final válido.');
      return;
    }

    this.confirmingSale = true;
    this.productService
      .updateStatus(this.saleProduct.id, 'vendido', {
        final_sale_price: this.saleFinalPrice,
        customer_name: this.saleCustomerName.trim() || undefined,
        notes: this.saleNotes.trim() || undefined,
        update_catalog_price: this.saleUpdateCatalogPrice,
        include_in_dashboard: this.saleIncludeInDashboard,
      })
      .subscribe({
        next: () => {
          this.confirmingSale = false;
          this.isSaleModalOpen = false;
          if (this.saleProduct) {
            this.saleProduct.status = 'vendido';
            if (this.saleUpdateCatalogPrice) {
              this.saleProduct.sale_price = this.saleFinalPrice;
            }
          }
          this.loadProducts();
        },
        error: (err) => {
          this.confirmingSale = false;
          console.error(err);
          alert(err.error?.message || 'Error al registrar la venta.');
        },
      });
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.isUploading = [false, false, false];
    this.formData = {
      category_id: null,
      name: '',
      description: '',
      cost_price: 0,
      sale_price: 0,
      status: 'disponible',
      images: [''],
    };
    this.isModalOpen = true;
  }

  openEditModal(product: Product): void {
    this.isEditing = true;
    this.editingId = product.id;
    this.isUploading = [false, false, false];
    const imageUrls =
      product.images && product.images.length > 0
        ? product.images.map((img) => img.image_url)
        : [product.primary_image || ''];

    this.formData = {
      category_id: product.category_id || null,
      name: product.name,
      description: product.description || '',
      cost_price: product.cost_price || 0,
      sale_price: product.sale_price,
      status: product.status,
      images: imageUrls.slice(0, 3),
    };
    this.isModalOpen = true;
  }

  addImageInput(): void {
    if (this.formData.images.length < 3) {
      this.formData.images.push('');
      this.isUploading.push(false);
    }
  }

  removeImageInput(index: number): void {
    if (this.formData.images.length > 1) {
      this.formData.images.splice(index, 1);
      this.isUploading.splice(index, 1);
    }
  }

  /**
   * Manejador de selección de archivo desde la computadora o celular
   */
  onFileSelected(event: Event, index: number): void {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    this.isUploading[index] = true;

    this.productService.uploadImage(file).subscribe({
      next: (res) => {
        this.formData.images[index] = res.url;
        this.isUploading[index] = false;
        // Limpiar input file para permitir volver a seleccionar el mismo archivo si se desea
        target.value = '';
      },
      error: (err) => {
        this.isUploading[index] = false;
        console.error('Error subiendo imagen:', err);
        alert(err.error?.message || 'Error al subir la imagen. Verifica que sea un formato válido (JPG, PNG, WEBP).');
        target.value = '';
      },
    });
  }

  saveProduct(): void {
    const validImages = this.formData.images.filter((img) => img && img.trim().length > 0);
    if (validImages.length === 0) {
      alert('Debes subir o ingresar al menos una imagen para el producto.');
      return;
    }

    this.saving = true;
    const payload = {
      ...this.formData,
      images: validImages,
    };

    if (this.isEditing && this.editingId) {
      this.productService.updateProduct(this.editingId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.isModalOpen = false;
          this.loadProducts();
        },
        error: (err) => {
          this.saving = false;
          console.error('Error actualizando producto:', err);
          let msg = err.error?.message;
          if (!msg) {
            if (err.status === 0) {
              msg = 'No se pudo conectar con el servidor backend (puerto 8000). Verifica que el servidor PHP esté iniciado.';
            } else if (err.status === 401) {
              msg = 'Sesión expirada o no autorizada. Por favor vuelve a iniciar sesión en el panel.';
            } else {
              msg = `Error al actualizar el producto (Código ${err.status}).`;
            }
          }
          alert(msg);
        },
      });
    } else {
      this.productService.createProduct(payload).subscribe({
        next: () => {
          this.saving = false;
          this.isModalOpen = false;
          this.loadProducts();
        },
        error: (err) => {
          this.saving = false;
          console.error('Error creando producto:', err);
          let msg = err.error?.message;
          if (!msg) {
            if (err.status === 0) {
              msg = 'No se pudo conectar con el servidor backend (puerto 8000). Verifica que el servidor PHP esté iniciado.';
            } else if (err.status === 401) {
              msg = 'Sesión expirada o no autorizada. Por favor vuelve a iniciar sesión en el panel.';
            } else {
              msg = `Error al crear el producto (Código ${err.status}).`;
            }
          }
          alert(msg);
        },
      });
    }
  }

  deleteProduct(product: Product): void {
    if (confirm(`¿Estás seguro de eliminar el producto "${product.name}"?`)) {
      this.productService.deleteProduct(product.id).subscribe({
        next: () => this.loadProducts(),
        error: (err) => console.error(err),
      });
    }
  }

  // -----------------------------------------------------------------
  // MÉTODOS DE GESTIÓN DE CATEGORÍAS
  // -----------------------------------------------------------------

  openCategoryModal(): void {
    this.isCategoryModalOpen = true;
    this.newCategoryName = '';
    this.newCategoryDesc = '';
    this.loadAdminCategories();
  }

  closeCategoryModal(): void {
    this.isCategoryModalOpen = false;
    this.newCategoryName = '';
    this.newCategoryDesc = '';
    // Recargar listas para sincronizar el formulario y la tabla de productos
    this.loadCategories();
    this.loadProducts();
  }

  loadAdminCategories(): void {
    this.productService.getAdminCategories().subscribe({
      next: (res) => (this.adminCategories = res.data),
      error: (err) => console.error('Error cargando categorías de admin:', err),
    });
  }

  createCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) {
      alert('Por favor ingresa un nombre para la categoría.');
      return;
    }

    this.creatingCategory = true;
    this.productService
      .createCategory({
        name,
        description: this.newCategoryDesc.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.creatingCategory = false;
          this.newCategoryName = '';
          this.newCategoryDesc = '';
          this.loadAdminCategories();
          this.loadCategories();
        },
        error: (err) => {
          this.creatingCategory = false;
          console.error('Error creando categoría:', err);
          let msg = err.error?.message;
          if (!msg) {
            if (err.status === 0) {
              msg = 'No se pudo conectar con el servidor backend (puerto 8000). Por favor verifica que el servidor PHP esté iniciado.';
            } else if (err.status === 401) {
              msg = 'Sesión expirada o no autorizada. Por favor vuelve a iniciar sesión en el panel.';
            } else {
              msg = `Error al crear la categoría (Código ${err.status}).`;
            }
          }
          alert(msg);
        },
      });
  }

  deleteCategory(cat: Category): void {
    const msg =
      cat.products_count && cat.products_count > 0
        ? `¿Estás seguro de eliminar la categoría "${cat.name}"? Los ${cat.products_count} producto(s) asignados pasarán a "Sin Categoría".`
        : `¿Estás seguro de eliminar la categoría "${cat.name}"?`;

    if (!confirm(msg)) return;

    this.deletingCategoryId = cat.id;
    this.productService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.deletingCategoryId = null;
        this.loadAdminCategories();
        this.loadCategories();
        this.loadProducts();
      },
      error: (err) => {
        this.deletingCategoryId = null;
        console.error('Error eliminando categoría:', err);
        let msg = err.error?.message;
        if (!msg) {
          if (err.status === 0) {
            msg = 'No se pudo conectar con el servidor backend (puerto 8000).';
          } else if (err.status === 401) {
            msg = 'Sesión expirada o no autorizada.';
          } else {
            msg = `Error al eliminar la categoría (Código ${err.status}).`;
          }
        }
        alert(msg);
      },
    });
  }
}

