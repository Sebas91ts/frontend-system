import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginRequest } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_30%)]"
      ></div>
      <div
        class="absolute inset-0 opacity-30 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-size-[36px_36px]"
      ></div>

      <div class="relative min-h-screen grid lg:grid-cols-[1.05fr_0.95fr]">
        <section class="hidden lg:flex flex-col justify-between px-16 py-14">
          <div class="max-w-xl">
            <div
              class="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200"
            >
              <span
                class="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.65)]"
              ></span>
              Sistema BPM Colaborativo
            </div>

            <h1 class="mt-8 text-5xl font-semibold tracking-tight leading-tight text-white">
              Gestiona procesos, usuarios y tareas con una experiencia clara y profesional.
            </h1>

            <p class="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              Accede a tu entorno de trabajo, supervisa operaciones y mantiene el control del flujo
              del negocio desde una interfaz pensada para equipos reales.
            </p>

            <div class="mt-10 grid grid-cols-2 gap-4 max-w-lg">
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p class="text-sm text-slate-400">Seguridad</p>
                <p class="mt-2 text-lg font-semibold text-white">JWT en cookie HttpOnly</p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p class="text-sm text-slate-400">Acceso</p>
                <p class="mt-2 text-lg font-semibold text-white">Roles y guards</p>
              </div>
            </div>
          </div>

          <div class="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p class="text-sm uppercase tracking-[0.3em] text-slate-400">Plataforma BPM</p>
            <p class="mt-3 text-slate-200 leading-7">
              Diseñada para escalar a módulos de procesos, aprobaciones, bandejas de tareas y
              paneles de control.
            </p>
          </div>
        </section>

        <section class="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div
            class="w-full max-w-lg rounded-4xl border border-white/10 bg-slate-900/80 p-8 shadow-[0_30px_80px_rgba(2,6,23,0.65)] backdrop-blur-xl sm:p-10"
          >
            <div class="mb-8">
              <p class="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                Acceso seguro
              </p>
              <h2 class="mt-3 text-3xl font-semibold text-white">Iniciar sesión</h2>
              <p class="mt-3 text-sm leading-6 text-slate-400">
                Ingresa con tu correo y contraseña para entrar al panel correspondiente a tu rol.
              </p>
            </div>

            <form class="space-y-5" (ngSubmit)="onSubmit()">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-300" for="email"
                  >Correo electrónico</label
                >
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="loginRequest.email"
                  name="email"
                  required
                  autocomplete="email"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10"
                  placeholder="tu@empresa.com"
                />
              </div>

              <div>
                <label class="mb-2 block text-sm font-medium text-slate-300" for="password"
                  >Contraseña</label
                >
                <input
                  id="password"
                  type="password"
                  [(ngModel)]="loginRequest.password"
                  name="password"
                  required
                  autocomplete="current-password"
                  class="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/10"
                  placeholder="••••••••••"
                />
              </div>

              <div
                *ngIf="errorMessage"
                class="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {{ errorMessage }}
              </div>

              <button
                type="submit"
                [disabled]="isLoading"
                class="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-cyan-400 px-4 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  class="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] translate-x-[-120%] transition-transform duration-700 group-hover:translate-x-[120%]"
                ></span>
                <span class="relative">{{ isLoading ? 'Validando...' : 'Entrar al sistema' }}</span>
              </button>
            </form>

            <div
              class="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300"
            >
              <p>
                ¿Aún no tienes cuenta?
                <a
                  routerLink="/auth/register"
                  class="font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Crear usuario
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginRequest: LoginRequest = { email: '', password: '' };
  errorMessage = '';
  isLoading = false;

  ngOnInit(): void {
    if (this.authService.getToken()) {
      this.authService.ensureSession().pipe(take(1)).subscribe((isAuthenticated) => {
        if (isAuthenticated) {
          void this.router.navigate(this.authService.getLandingRoute());
        }
      });
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.isLoading = true;

    this.authService.login(this.loginRequest).subscribe({
      next: (response) => {
        if (response.success) {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          if (this.authService.isAdmin() || this.authService.isClient()) {
            void this.router.navigate(this.authService.getLandingRoute());
          } else if (returnUrl !== '/') {
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/user']);
          }
        }
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No pudimos iniciar sesión. Revisa tus credenciales.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
