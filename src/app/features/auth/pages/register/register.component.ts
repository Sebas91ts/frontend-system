import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { RegisterRequest } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_32%)]"
      ></div>
      <div
        class="absolute inset-0 opacity-25 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-size-[36px_36px]"
      ></div>

      <div class="relative min-h-screen grid lg:grid-cols-[0.9fr_1.1fr]">
        <section class="hidden lg:flex flex-col justify-between px-16 py-14">
          <div class="max-w-xl">
            <div
              class="inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.65)]"
              ></span>
              Nuevo acceso al sistema
            </div>

            <h1 class="mt-8 text-5xl font-semibold tracking-tight leading-tight text-white">
              Crea cuentas listas para trabajar dentro del BPM.
            </h1>

            <p class="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              El registro está diseñado para incorporar usuarios con estructura, claridad y un flujo
              pensado para crecer sin fricción.
            </p>

            <div class="mt-10 space-y-4 max-w-lg text-slate-300">
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p class="font-medium text-white">Datos limpios</p>
                <p class="mt-1 text-sm leading-6 text-slate-400">
                  Nombre, apellido, correo y contraseña con validación visual.
                </p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p class="font-medium text-white">Preparado para roles</p>
                <p class="mt-1 text-sm leading-6 text-slate-400">
                  Ideal para asignar permisos y segmentar acceso por perfil.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div
            class="w-full max-w-xl rounded-4xl border border-white/10 bg-slate-900/80 p-8 shadow-[0_30px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl sm:p-10"
          >
            <div class="mb-8">
              <p class="text-sm font-medium uppercase tracking-[0.3em] text-emerald-300">
                Alta de usuarios
              </p>
              <h2 class="mt-3 text-3xl font-semibold text-white">Crear cuenta</h2>
              <p class="mt-3 text-sm leading-6 text-slate-400">
                Completa los datos para registrar un usuario nuevo en la plataforma BPM.
              </p>
            </div>

            <form class="grid gap-5 sm:grid-cols-2" (ngSubmit)="onSubmit()">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-300" for="nombre"
                  >Nombre</label
                >
                <input
                  id="nombre"
                  type="text"
                  [(ngModel)]="registerRequest.nombre"
                  name="nombre"
                  required
                  autocomplete="given-name"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
                  placeholder="Juan"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-300" for="apellido"
                  >Apellido</label
                >
                <input
                  id="apellido"
                  type="text"
                  [(ngModel)]="registerRequest.apellido"
                  name="apellido"
                  required
                  autocomplete="family-name"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
                  placeholder="Pérez"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="mb-2 block text-sm font-medium text-slate-300" for="email"
                  >Correo electrónico</label
                >
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="registerRequest.email"
                  name="email"
                  required
                  autocomplete="email"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
                  placeholder="tu@empresa.com"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="mb-2 block text-sm font-medium text-slate-300" for="password"
                  >Contraseña</label
                >
                <input
                  id="password"
                  type="password"
                  [(ngModel)]="registerRequest.password"
                  name="password"
                  required
                  minlength="6"
                  autocomplete="new-password"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
                  placeholder="Mínimo 6 caracteres"
                />
                <p class="mt-2 text-xs text-slate-500">
                  Usa una contraseña segura para proteger el acceso al sistema.
                </p>
              </div>

              <div
                *ngIf="errorMessage"
                class="sm:col-span-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {{ errorMessage }}
              </div>

              <div
                *ngIf="successMessage"
                class="sm:col-span-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              >
                {{ successMessage }}
              </div>

              <button
                type="submit"
                [disabled]="isLoading"
                class="sm:col-span-2 group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-4 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  class="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[120%]"
                ></span>
                <span class="relative">{{
                  isLoading ? 'Creando usuario...' : 'Registrar usuario'
                }}</span>
              </button>
            </form>

            <div
              class="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300"
            >
              <p>
                ¿Ya tienes cuenta?
                <a
                  routerLink="/auth/login"
                  class="font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  Volver al login
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  registerRequest: RegisterRequest = { nombre: '', apellido: '', email: '', password: '' };
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.authService.register(this.registerRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Usuario creado correctamente. Redirigiendo al inicio de sesión...';
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
        }
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No pudimos registrar el usuario. Intenta nuevamente.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
