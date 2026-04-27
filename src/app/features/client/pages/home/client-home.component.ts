import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-client-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.45)]">
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Bienvenida</p>
        <h2 class="mt-3 text-3xl font-semibold text-white">Tu espacio de seguimiento</h2>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Desde aqui podras revisar los tramites habilitados para clientes, ver el estado de tus
          instancias y leer notificaciones sin entrar al entorno interno del BPM.
        </p>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Tramites</p>
            <p class="mt-2 text-3xl font-semibold text-white">0</p>
            <p class="mt-1 text-sm text-slate-400">Disponibles por ahora</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Instancias</p>
            <p class="mt-2 text-3xl font-semibold text-white">0</p>
            <p class="mt-1 text-sm text-slate-400">En seguimiento</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Notificaciones</p>
            <p class="mt-2 text-3xl font-semibold text-white">0</p>
            <p class="mt-1 text-sm text-slate-400">Pendientes de leer</p>
          </article>
        </div>
      </div>

      <aside class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.35)]">
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">Como funciona</p>
        <h3 class="mt-3 text-2xl font-semibold text-white">Navegacion simple</h3>
        <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-200">
          <li>Inicio para ver resumen rapido.</li>
          <li>Mis tramites para consultar procesos habilitados.</li>
          <li>Instancias para seguir solicitudes activas.</li>
          <li>Notificaciones para novedades del sistema.</li>
        </ul>

        <div class="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          El portal cliente es independiente del panel interno y usa tus preferencias de tema e idioma.
        </div>
      </aside>
    </section>
  `,
})
export class ClientHomeComponent {}
