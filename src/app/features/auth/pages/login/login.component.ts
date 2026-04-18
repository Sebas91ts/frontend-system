import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequest } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Iniciar Sesión</h2>

        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2" for="email">Email</label>
            <input
              id="email"
              type="email"
              [(ngModel)]="loginRequest.email"
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
              [(ngModel)]="loginRequest.password"
              name="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
            />
          </div>

          <div
            *ngIf="errorMessage"
            class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 transition duration-200"
          >
            {{ isLoading ? 'Iniciando...' : 'Iniciar Sesión' }}
          </button>
        </form>

        <div class="mt-4 text-center">
          <p class="text-gray-600 text-sm">
            ¿No tienes cuenta?
            <a routerLink="/auth/register" class="text-blue-600 hover:text-blue-800 font-bold"
              >Regístrate aquí</a
            >
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginRequest: LoginRequest = { email: '', password: '' };
  errorMessage: string = '';
  isLoading: boolean = false;

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    this.authService.login(this.loginRequest).subscribe({
      next: (response) => {
        if (response.success) {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/user']);
          }
        }
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
