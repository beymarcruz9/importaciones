import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

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
                  <span class="text-[10px] text-indigo-300 font-medium block uppercase tracking-wider">Panel Administrativo</span>
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
              <a 
                routerLink="/" 
                target="_blank"
                class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Ver Tienda</span>
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
}
