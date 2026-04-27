import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { ApiResponse } from '../../../../core/models/auth.models';
import { AuthService } from '../../../../core/services/auth.service';

interface ClientAssistantMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-client-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="client-shell">
      <div class="client-shell__glow client-shell__glow--one"></div>
      <div class="client-shell__glow client-shell__glow--two"></div>

      <div class="client-shell__content">
        <header class="client-hero">
          <div class="client-hero__copy">
            <p class="eyebrow">Portal cliente</p>
            <h1>Mis tramites</h1>
            <p class="hero-copy">
              Acceso simple para clientes externos. Aqui solo veras lo que el sistema publique para ti.
            </p>
          </div>

          <div class="client-hero__actions">
            <button type="button" class="ghost-button" (click)="logout()">Salir</button>

            <div class="client-hero__more">
              <button type="button" class="more-button" (click)="toggleMoreMenu()" aria-label="Mas opciones">...</button>
              <div class="more-menu" *ngIf="isMoreMenuOpen">
                <button type="button" class="more-menu__item" (click)="openSettings()">Ajustes</button>
                <button type="button" class="more-menu__item" (click)="openAssistant()">Ayuda IA</button>
                <button type="button" class="more-menu__item" (click)="closeMoreMenu()">Cerrar menu</button>
              </div>
            </div>
          </div>
        </header>

        <nav class="client-nav">
          <a routerLink="/client/home" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
          <a routerLink="/client/processes" routerLinkActive="is-active">Mis tramites</a>
          <a routerLink="/client/instances" routerLinkActive="is-active">Instancias</a>
          <a routerLink="/client/notifications" routerLinkActive="is-active">Notificaciones</a>
        </nav>

        <main class="client-content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <button type="button" class="assistant-launcher" (click)="openAssistant()" aria-label="Abrir asistente">
        <span class="assistant-launcher__icon">?</span>
        <span class="assistant-launcher__text">Ayuda IA</span>
      </button>

      <section class="assistant-modal" *ngIf="isAssistantOpen">
        <div class="assistant-modal__backdrop" (click)="closeAssistant()"></div>
        <div class="assistant-modal__panel" role="dialog" aria-modal="true" aria-labelledby="client-assistant-title">
          <header class="assistant-modal__header">
            <div>
              <p class="eyebrow">Asistente interno</p>
              <h2 id="client-assistant-title">Consulta tu sistema BPM</h2>
            </div>
            <button type="button" class="assistant-close" (click)="closeAssistant()" [disabled]="assistantLoading" aria-label="Cerrar asistente">×</button>
          </header>

          <div class="assistant-modal__messages">
            <article
              class="assistant-message"
              *ngFor="let message of assistantMessages"
              [class.assistant-message--user]="message.role === 'user'"
              [class.assistant-message--bot]="message.role === 'assistant'"
            >
              {{ message.text }}
            </article>
            <div class="assistant-message assistant-message--bot" *ngIf="assistantLoading">Pensando...</div>
          </div>

          <div class="assistant-modal__error" *ngIf="assistantError">{{ assistantError }}</div>

          <footer class="assistant-modal__footer">
            <input
              type="text"
              [(ngModel)]="assistantInput"
              [ngModelOptions]="{ standalone: true }"
              placeholder="Escribe una duda sobre el sistema..."
              (keydown.enter)="sendAssistantMessage()"
              [disabled]="assistantLoading"
            />
            <button
              type="button"
              class="primary-button"
              (click)="sendAssistantMessage()"
              [disabled]="assistantLoading || !assistantInput.trim()"
            >
              {{ assistantLoading ? 'Consultando...' : 'Preguntar' }}
            </button>
          </footer>
        </div>
      </section>
    </div>
  `,
  styleUrl: './client-shell.component.css',
})
export class ClientShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  protected isMoreMenuOpen = false;
  protected isAssistantOpen = false;
  protected assistantInput = '';
  protected assistantLoading = false;
  protected assistantError = '';
  protected assistantMessages: ClientAssistantMessage[] = [
    {
      role: 'assistant',
      text: 'Hola, soy tu asistente interno. Puedo ayudarte con tramites, seguimiento, notificaciones y uso basico del sistema.',
    },
  ];

  logout(): void {
    this.authService.logout();
  }

  toggleMoreMenu(): void {
    this.isMoreMenuOpen = !this.isMoreMenuOpen;
  }

  closeMoreMenu(): void {
    this.isMoreMenuOpen = false;
  }

  openSettings(): void {
    this.isMoreMenuOpen = false;
    void this.router.navigate(['/settings']);
  }

  openAssistant(): void {
    this.isAssistantOpen = true;
    this.isMoreMenuOpen = false;
  }

  closeAssistant(): void {
    if (this.assistantLoading) {
      return;
    }

    this.isAssistantOpen = false;
  }

  async sendAssistantMessage(): Promise<void> {
    const text = this.assistantInput.trim();
    if (!text || this.assistantLoading) {
      return;
    }

    this.assistantMessages = [...this.assistantMessages, { role: 'user', text }];
    this.assistantInput = '';
    this.assistantLoading = true;
    this.assistantError = '';

    try {
      const response = await this.http
        .post<ApiResponse<{ response: string }>>(`${this.apiBaseUrl}/ai/assistant`, { message: text })
        .toPromise();

      const answer = response?.data?.response?.trim() || 'No pude generar una respuesta en este momento.';
      this.assistantMessages = [...this.assistantMessages, { role: 'assistant', text: answer }];
    } catch (error: any) {
      this.assistantError = error?.error?.message || 'No se pudo conectar con el asistente.';
    } finally {
      this.assistantLoading = false;
    }
  }
}
