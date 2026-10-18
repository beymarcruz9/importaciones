import { Routes } from '@angular/router';
import { ProductCatalogComponent } from './components/product-catalog/product-catalog.component';
import { AdminLoginComponent } from './components/admin/admin-login/admin-login.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminProductsComponent } from './components/admin/admin-products/admin-products.component';
import { AdminReservationsComponent } from './components/admin/admin-reservations/admin-reservations.component';
import { AdminSalesHistoryComponent } from './components/admin/admin-sales-history/admin-sales-history.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // MÓDULO 1: FRONTEND PÚBLICO (CLIENTES) - Sin autenticación
  {
    path: '',
    component: ProductCatalogComponent,
    title: 'Importadora de productos - Catálogo Oficial',
  },

  // MÓDULO 2 & 3: PANEL ADMINISTRADOR - Protegido
  {
    path: 'admin/login',
    component: AdminLoginComponent,
    title: 'Importadora de productos - Acceso Administrador',
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        title: 'Importadora de productos - Dashboard & Contabilidad',
      },
      {
        path: 'products',
        component: AdminProductsComponent,
        title: 'Importadora de productos - Gestión de Productos',
      },
      {
        path: 'reservations',
        component: AdminReservationsComponent,
        title: 'Importadora de productos - Control de Reservas',
      },
      {
        path: 'sales-history',
        component: AdminSalesHistoryComponent,
        title: 'Importadora de productos - Historial de Ventas',
      },
    ],
  },

  // Ruta comodín de redirección
  {
    path: '**',
    redirectTo: '',
  },
];
