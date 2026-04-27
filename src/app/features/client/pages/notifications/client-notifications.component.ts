import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-client-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.45)]">
      <p class="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">Notificaciones</p>
      <h2 class="mt-2 text-2xl font-semibold text-white">Novedades del sistema</h2>
      <p class="mt-2 text-sm text-slate-300">
        Aqui apareceran avisos sobre tus tramites, cambios de estado y mensajes del sistema.
      </p>

      <div class="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
        No tienes notificaciones por ahora.
      </div>
    </section>
  `,
})
export class ClientNotificationsComponent {}
