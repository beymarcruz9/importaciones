import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FirebaseService } from '../../../services/firebase.service';
import { ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      <!-- Barra Superior de Navegación del Panel de Control -->
      <header class="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            
            <!-- Marca y Nombre -->
            <div class="flex items-center gap-3">
              <a routerLink="/admin/dashboard" class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  IP
                </div>
                <div>
                  <span class="text-sm font-bold tracking-tight block">Importadora de productos</span>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-indigo-300 font-medium block uppercase tracking-wider">Panel Admin</span>
                    @if (firebaseService.isConfigured()) {
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Firebase Conectado
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-800" title="Configura tus credenciales de Firebase en environment.ts para sincronizar en tiempo real">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Modo Local
                      </span>
                    }
                  </div>
                </div>
              </a>
            </div>

            <!-- Navegación Desktop -->
            <nav class="hidden md:flex items-center gap-1">
              <a 
                routerLink="/admin/dashboard" 
                routerLinkActive="bg-slate-800 text-white font-semibold"
                class="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Dashboard
              </a>
              <a 
                routerLink="/admin/products" 
                routerLinkActive="bg-slate-800 text-white font-semibold"
                class="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Productos (CRUD)
              </a>
              <a 
                routerLink="/admin/reservations" 
                routerLinkActive="bg-slate-800 text-white font-semibold"
                class="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Reservas (7 días)
              </a>
              <a 
                routerLink="/admin/sales-history" 
                routerLinkActive="bg-slate-800 text-white font-semibold"
                class="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Historial de Ventas
              </a>
            </nav>

            <!-- Acciones Derecha -->
            <div class="flex items-center gap-2">
              
              <!-- Usuario actual -->
              @if (authService.currentUser(); as user) {
                <span class="hidden lg:inline-block text-[11px] text-slate-300 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  {{ user.email }}
                </span>
              }

              @if (firebaseService.isConfigured()) {
                <button
                  (click)="syncInitialData()"
                  [disabled]="isSyncing"
                  title="Sincronizar catálogo inicial completo con Cloud Firestore"
                  class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/50 transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ isSyncing ? 'Sincronizando...' : 'Cargar a Firestore' }}</span>
                </button>
              }

              <a 
                routerLink="/" 
                target="_blank"
                class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Ver Catálogo</span>
              </a>

              <button 
                (click)="authService.logout()"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/90 hover:bg-red-600 text-white transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Salir</span>
              </button>
            </div>

          </div>

          <!-- Navegación Móvil -->
          <div class="md:hidden flex items-center justify-between pb-3 pt-1 border-t border-slate-800 overflow-x-auto text-xs gap-1">
            <a routerLink="/admin/dashboard" routerLinkActive="text-indigo-400 font-bold" class="px-2 py-1 text-slate-300">Dashboard</a>
            <a routerLink="/admin/products" routerLinkActive="text-indigo-400 font-bold" class="px-2 py-1 text-slate-300">Productos</a>
            <a routerLink="/admin/reservations" routerLinkActive="text-indigo-400 font-bold" class="px-2 py-1 text-slate-300">Reservas</a>
            <a routerLink="/admin/sales-history" routerLinkActive="text-indigo-400 font-bold" class="px-2 py-1 text-slate-300">Ventas</a>
          </div>

        </div>
      </header>

      <!-- Contenido Principal -->
      <main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>

    </div>
  `,
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  firebaseService = inject(FirebaseService);
  productService = inject(ProductService);
  isSyncing = false;

  syncInitialData(): void {
    if (confirm('¿Deseas sincronizar todos los datos iniciales (categorías, productos, reservas, ventas) con tu base de datos Cloud Firestore?')) {
      this.isSyncing = true;
      this.productService.seedInitialDataToFirestore()
        .then(() => {
          this.isSyncing = false;
          alert('¡Datos sincronizados exitosamente con Google Cloud Firestore!');
          window.location.reload();
        })
        .catch((err) => {
          this.isSyncing = false;
          alert('Error sincronizando datos con Firestore: ' + (err.message || err));
        });
    }
  }
}
