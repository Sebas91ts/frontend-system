import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Ruta por defecto
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // Rutas de Autenticación (públicas)
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/pages/register/register.component')
          .then(m => m.RegisterComponent)
      }
    ]
  },

  // Rutas de Administrador (solo ROLE_ADMIN)
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/pages/dashboard/admin-dashboard.component')
      .then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  // Rutas de Usuario (ROLE_USER o ROLE_ADMIN)
  {
    path: 'user',
    loadComponent: () => import('./features/user/pages/dashboard/user-dashboard.component')
      .then(m => m.UserDashboardComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] }
  },

  // Diseñador de procesos BPMN
  {
    path: 'processes/designer',
    loadComponent: () => import('./features/processes/pages/designer/process-designer.component')
      .then(m => m.ProcessDesignerComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },

  // Ruta comodín - redirigir al dashboard correspondiente
  { path: '**', redirectTo: 'auth/login' }
];
