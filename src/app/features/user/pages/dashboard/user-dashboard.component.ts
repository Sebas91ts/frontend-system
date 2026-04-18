import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <header class="bg-green-600 text-white p-4 shadow-md">
        <div class="container mx-auto flex justify-between items-center">
          <h1 class="text-2xl font-bold">Panel de Usuario</h1>
          <div class="flex items-center gap-4">
            <span class="text-sm"
              >Hola, {{ authService.currentUser()?.nombre }}
              {{ authService.currentUser()?.apellido }}</span
            >
            <button
              (click)="logout()"
              class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition duration-200"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="container mx-auto p-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-bold mb-4 text-gray-800">Bienvenido a tu Panel</h2>
          <p class="text-gray-600 mb-4">Este es un dashboard para usuarios regulares.</p>

          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 class="font-bold text-green-800 mb-2">Tu Información:</h3>
            <ul class="text-green-700">
              <li>
                <strong>Nombre:</strong> {{ authService.currentUser()?.nombre }}
                {{ authService.currentUser()?.apellido }}
              </li>
              <li><strong>Email:</strong> {{ authService.currentUser()?.email }}</li>
              <li><strong>Roles:</strong> {{ authService.currentUser()?.roles?.join(', ') }}</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class UserDashboardComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
  }
}
