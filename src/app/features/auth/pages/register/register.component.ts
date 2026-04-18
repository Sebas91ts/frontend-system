import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterRequest } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Crear Cuenta</h2>

        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="nombre">Nombre</label>
            <input
              id="nombre"
              type="text"
              [(ngModel)]="registerRequest.nombre"
              name="nombre"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Juan"
            />
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="apellido"
              >Apellido</label
            >
            <input
              id="apellido"
              type="text"
              [(ngModel)]="registerRequest.apellido"
              name="apellido"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pérez"
            />
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="registerRequest.email"
              name="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="password"
              >Contraseña</label
            >
            <input
              id="password"
              type="password"
              [(ngModel)]="registerRequest.password"
              name="password"
              required
              minlength="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div
            *ngIf="errorMessage"
            class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg"
          >
            {{ errorMessage }}
          </div>

          <div
            *ngIf="successMessage"
            class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg"
          >
            {{ successMessage }}
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 transition duration-200"
          >
            {{ isLoading ? 'Registrando...' : 'Registrarse' }}
          </button>
        </form>

        <div class="mt-4 text-center">
          <p class="text-gray-600 text-sm">
            ¿Ya tienes cuenta?
            <a routerLink="/auth/login" class="text-blue-600 hover:text-blue-800 font-bold"
              >Inicia sesión aquí</a
            >
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  registerRequest: RegisterRequest = { nombre: '', apellido: '', email: '', password: '' };
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.authService.register(this.registerRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = '¡Usuario registrado exitosamente! Redirigiendo al login...';
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        }
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Error al registrar. Intenta nuevamente.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
