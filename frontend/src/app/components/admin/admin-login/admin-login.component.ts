import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        
        <!-- Tarjeta de Login -->
        <div class="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100">
          
          <div class="text-center mb-8">
            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/30">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 class="text-2xl font-black text-gray-900 tracking-tight">Acceso Administrador</h2>
            <p class="text-xs text-gray-500 mt-1">Importadora de productos &bull; Panel de Control</p>
          </div>

          @if (errorMessage) {
            <div class="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {{ errorMessage }}
            </div>
          }

          <form (ngSubmit)="onLogin()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="admin@importadora.com"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="••••••••"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading"
              class="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              @if (loading) {
                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Ingresando...</span>
              } @else {
                <span>Iniciar Sesión</span>
              }
            </button>
          </form>

          <div class="mt-6 pt-6 border-t border-gray-100 text-center">
            <a routerLink="/" class="text-xs text-gray-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Catálogo Público
            </a>
          </div>

        </div>

      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = 'admin@importadora.com';
  password = 'password123';
  loading = false;
  errorMessage = '';

  onLogin(): void {
    if (!this.email || !this.password) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 0) {
          this.errorMessage =
            'No se pudo conectar con el servidor backend (puerto 8000). Por favor verifica que el backend esté ejecutándose (ejecuta INICIAR_SISTEMA.bat).';
        } else {
          this.errorMessage =
            err.error?.message ||
            err.error?.errors?.email?.[0] ||
            'Credenciales no válidas. Inténtalo de nuevo.';
        }
      },
    });
  }
}
