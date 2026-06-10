import { CommonModule } from '@angular/common';
import { Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AiProcessRecommendationResponse } from '../../../../core/models/enterprise-ai.models';
import { FormFieldDefinition } from '../../../../core/models/form.models';
import { ClientProcessListItem, ClientProcessStartPreview } from '../../../../core/models/process.models';
import { AiService, FormFillRequest, FormFillSuggestion } from '../../../../core/services/ai.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProcessService } from '../../../../core/services/process.service';

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface ClientAssistantMessage {
  role: 'user' | 'assistant';
  text: string;
  actionLabel?: string;
  actionRoute?: unknown[];
}

type ClientAssistantStage = 'idle' | 'choosing-process' | 'confirm-process' | 'collecting-form' | 'review-form';

interface ClientAssistantSession {
  stage: ClientAssistantStage;
  candidateProcesses: ClientProcessListItem[];
  selectedProcess: ClientProcessListItem | null;
  startPreview: ClientProcessStartPreview | null;
  collectedValues: Record<string, unknown>;
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
          <a routerLink="/client/tasks" routerLinkActive="is-active">Tareas</a>
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
              <h2 id="client-assistant-title">Asistente de tramites</h2>
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
              <button
                type="button"
                class="assistant-message__action"
                *ngIf="message.actionLabel && message.actionRoute"
                (click)="navigateAssistantAction(message.actionRoute)"
              >
                {{ message.actionLabel }}
              </button>
            </article>
            <div class="assistant-message assistant-message--bot" *ngIf="assistantLoading">Pensando...</div>
          </div>

          <div class="assistant-modal__error" *ngIf="assistantError">{{ assistantError }}</div>

          <footer class="assistant-modal__footer">
            <input
              type="text"
              [(ngModel)]="assistantInput"
              [ngModelOptions]="{ standalone: true }"
              placeholder="Ej. Quiero registrar una solicitud..."
              (keydown.enter)="sendAssistantMessage()"
              [disabled]="assistantLoading"
            />
            <button
              type="button"
              class="assistant-voice-button"
              [class.assistant-voice-button--recording]="isAssistantVoiceRecording"
              (click)="toggleAssistantVoiceInput()"
              [disabled]="assistantLoading || !isVoiceInputSupported"
              [attr.aria-label]="isAssistantVoiceRecording ? 'Detener dictado' : 'Dictar por voz'"
              [title]="isVoiceInputSupported ? (isAssistantVoiceRecording ? 'Detener dictado' : 'Dictar por voz') : 'Tu navegador no soporta dictado por voz'"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"></path>
                <path d="M18 11a6 6 0 0 1-12 0"></path>
                <path d="M12 17v4"></path>
                <path d="M8 21h8"></path>
              </svg>
            </button>
            <button
              type="button"
              class="primary-button"
              (click)="sendAssistantMessage()"
              [disabled]="assistantLoading || !assistantInput.trim()"
            >
              {{ assistantLoading ? 'Consultando...' : 'Enviar' }}
            </button>
          </footer>
          <p class="assistant-voice-hint" *ngIf="isAssistantVoiceRecording">
            Escuchando... revisa el texto antes de enviarlo.
          </p>
          <p class="assistant-voice-error" *ngIf="assistantVoiceError">{{ assistantVoiceError }}</p>
        </div>
      </section>
    </div>
  `,
  styleUrl: './client-shell.component.css',
})
export class ClientShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly processService = inject(ProcessService);
  private readonly aiService = inject(AiService);
  private readonly ngZone = inject(NgZone);

  protected isMoreMenuOpen = false;
  protected isAssistantOpen = false;
  protected assistantInput = '';
  protected assistantLoading = false;
  protected assistantError = '';
  protected assistantVoiceError = '';
  protected isAssistantVoiceRecording = false;
  protected readonly isVoiceInputSupported = this.getSpeechRecognitionConstructor() !== null;
  protected assistantMessages: ClientAssistantMessage[] = [
    {
      role: 'assistant',
      text: 'Hola. En que puedo ayudarte? Puedo orientarte para iniciar un tramite, explicarte procesos disponibles o ayudarte a completar los datos iniciales.',
    },
  ];

  private clientProcesses: ClientProcessListItem[] = [];
  private assistantSession: ClientAssistantSession = this.createAssistantSession();
  private speechRecognition?: BrowserSpeechRecognition;
  private speechRecognitionConstructor = this.getSpeechRecognitionConstructor();
  private voiceBaseText = '';
  private shouldSendVoiceInputOnEnd = false;

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

    this.stopAssistantVoiceInput();
    this.isAssistantOpen = false;
  }

  async sendAssistantMessage(): Promise<void> {
    const text = this.assistantInput.trim();
    if (!text || this.assistantLoading) {
      return;
    }

    this.stopAssistantVoiceInput();
    this.assistantMessages = [...this.assistantMessages, { role: 'user', text }];
    this.assistantInput = '';
    this.assistantLoading = true;
    this.assistantError = '';

    try {
      await this.handleClientAssistantTurn(text);
    } catch (error: any) {
      this.assistantError = error?.error?.message || 'No se pudo conectar con el asistente.';
    } finally {
      this.assistantLoading = false;
    }
  }

  protected toggleAssistantVoiceInput(): void {
    if (this.isAssistantVoiceRecording) {
      this.stopAssistantVoiceInput();
      return;
    }

    this.startAssistantVoiceInput();
  }

  private startAssistantVoiceInput(): void {
    if (!this.speechRecognitionConstructor || this.assistantLoading) {
      this.assistantVoiceError = 'Tu navegador no soporta dictado por voz.';
      return;
    }

    this.stopAssistantVoiceInput();
    this.assistantVoiceError = '';
    this.voiceBaseText = this.assistantInput.trim();
    this.shouldSendVoiceInputOnEnd = false;

    const recognition = new this.speechRecognitionConstructor();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      this.ngZone.run(() => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = result[0]?.transcript?.trim() ?? '';
          if (!transcript) {
            continue;
          }
          if (result.isFinal) {
            finalTranscript += ` ${transcript}`;
          } else {
            interimTranscript += ` ${transcript}`;
          }
        }

        const nextText = [this.voiceBaseText, finalTranscript.trim(), interimTranscript.trim()]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        this.assistantInput = nextText;
        if (finalTranscript.trim()) {
          this.voiceBaseText = [this.voiceBaseText, finalTranscript.trim()]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          this.shouldSendVoiceInputOnEnd = this.assistantInput.trim().length > 0;
        }
      });
    };
    recognition.onerror = (event: { error?: string }) => {
      this.ngZone.run(() => {
        this.assistantVoiceError = event.error === 'not-allowed'
          ? 'No se concedió permiso al micrófono. Revisa los permisos del navegador.'
          : 'No pude escuchar correctamente. Intenta de nuevo.';
        this.isAssistantVoiceRecording = false;
      });
    };
    recognition.onend = () => {
      this.ngZone.run(() => {
        const shouldSend = this.shouldSendVoiceInputOnEnd && this.assistantInput.trim().length > 0 && !this.assistantLoading;
        this.isAssistantVoiceRecording = false;
        this.speechRecognition = undefined;
        this.shouldSendVoiceInputOnEnd = false;

        if (shouldSend) {
          void this.sendAssistantMessage();
        }
      });
    };

    try {
      recognition.start();
      this.speechRecognition = recognition;
      this.isAssistantVoiceRecording = true;
    } catch {
      this.assistantVoiceError = 'No se pudo iniciar el micrófono. Intenta nuevamente.';
      this.isAssistantVoiceRecording = false;
    }
  }

  private stopAssistantVoiceInput(): void {
    if (!this.speechRecognition) {
      this.isAssistantVoiceRecording = false;
      return;
    }

    try {
      this.speechRecognition.stop();
    } catch {
      // El navegador puede lanzar error si el reconocimiento ya finalizó.
    }
    this.speechRecognition = undefined;
    this.isAssistantVoiceRecording = false;
    this.shouldSendVoiceInputOnEnd = false;
  }

  private createAssistantSession(): ClientAssistantSession {
    return {
      stage: 'idle',
      candidateProcesses: [],
      selectedProcess: null,
      startPreview: null,
      collectedValues: {},
    };
  }

  private async handleClientAssistantTurn(text: string): Promise<void> {
    if (this.isNegative(text) && !['collecting-form', 'review-form'].includes(this.assistantSession.stage)) {
      this.assistantSession = this.createAssistantSession();
      this.appendAssistant('Perfecto, cancelamos eso. Dime que tramite necesitas iniciar o que duda tienes.');
      return;
    }

    if (this.assistantSession.stage === 'choosing-process') {
      await this.handleProcessChoice(text);
      return;
    }

    if (this.assistantSession.stage === 'confirm-process') {
      await this.handleProcessConfirmation(text);
      return;
    }

    if (this.assistantSession.stage === 'collecting-form') {
      await this.handleFormCollection(text);
      return;
    }

    if (this.assistantSession.stage === 'review-form') {
      await this.handleFormReview(text);
      return;
    }

    await this.handleInitialRequest(text);
  }

  private async handleInitialRequest(text: string): Promise<void> {
    await this.ensureClientProcessesLoaded();

    if (!this.clientProcesses.length) {
      this.appendAssistant('Aun no hay tramites disponibles para clientes. Cuando el sistema publique uno para ti, podre ayudarte a iniciarlo desde aqui.');
      return;
    }

    const recommendation = await this.safeRecommendProcess(text);
    const candidates = this.resolveCandidateProcesses(text, recommendation);

    if (!candidates.length && this.looksLikeQuestion(text)) {
      await this.answerContextualQuestion(text);
      return;
    }

    const options = candidates.length ? candidates : this.clientProcesses.slice(0, 5);
    this.assistantSession = {
      ...this.createAssistantSession(),
      stage: options.length === 1 ? 'confirm-process' : 'choosing-process',
      candidateProcesses: options,
      selectedProcess: options.length === 1 ? options[0] : null,
    };

    if (options.length === 1) {
      const process = options[0];
      this.appendAssistant(
        `Creo que el tramite correcto es "${process.nombre}". ${recommendation?.reason || 'Coincide con lo que me comentaste.'}\n\nQuieres iniciar este tramite? Responde "si" para continuar o "no" para buscar otro.`,
      );
      return;
    }

    this.appendAssistant(
      `Tenemos estos tramites que pueden coincidir con tu solicitud:\n\n${this.formatProcessOptions(options)}\n\nIndica el numero o el nombre del tramite que quieres iniciar.`,
    );
  }

  private async handleProcessChoice(text: string): Promise<void> {
    const selected = this.selectProcessFromMessage(text, this.assistantSession.candidateProcesses);
    if (!selected) {
      const candidates = this.resolveCandidateProcesses(text, null);
      if (candidates.length) {
        this.assistantSession.candidateProcesses = candidates;
        this.appendAssistant(
          `Encontre estas opciones nuevas:\n\n${this.formatProcessOptions(candidates)}\n\nIndica el numero o el nombre del tramite.`,
        );
        return;
      }

      await this.answerContextualQuestion(text);
      this.appendAssistant('Si quieres iniciar un tramite, dime el numero o el nombre de una opcion disponible.');
      return;
    }

    this.assistantSession.stage = 'confirm-process';
    this.assistantSession.selectedProcess = selected;
    this.appendAssistant(`Seleccionaste "${selected.nombre}". Estas seguro de iniciar este tramite? Responde "si" para continuar.`);
  }

  private async handleProcessConfirmation(text: string): Promise<void> {
    if (!this.isAffirmative(text)) {
      if (this.looksLikeQuestion(text)) {
        await this.answerContextualQuestion(text);
        this.appendAssistant(`Si quieres iniciar "${this.assistantSession.selectedProcess?.nombre || 'este tramite'}", responde "si". Si prefieres buscar otro, responde "no".`);
        return;
      }

      this.appendAssistant('Sin problema. Puedes elegir otro tramite o describirme nuevamente lo que necesitas.');
      this.assistantSession.stage = 'choosing-process';
      return;
    }

    const process = this.assistantSession.selectedProcess;
    if (!process) {
      this.assistantSession = this.createAssistantSession();
      this.appendAssistant('Perdi la seleccion del tramite. Dime nuevamente que necesitas iniciar.');
      return;
    }

    const preview = await this.loadStartPreview(process);
    this.assistantSession.startPreview = preview;
    this.assistantSession.collectedValues = {};

    const fields = this.sortedFormFields(preview);
    if (!fields.length) {
      await this.startSelectedProcess();
      return;
    }

    const fileFields = fields.filter((field) => field.type === 'file' && field.required);
    if (fileFields.length) {
      this.assistantSession.stage = 'idle';
      this.appendAssistant(
        `Este tramite necesita archivos obligatorios (${fileFields.map((field) => field.label || field.name).join(', ')}). Por ahora el chat puede ayudarte con datos de texto, pero los archivos debes subirlos desde "Mis tramites".`,
      );
      return;
    }

    this.assistantSession.stage = 'collecting-form';
    this.appendAssistant(
      `Perfecto. Para iniciar "${preview.processName || process.nombre}" necesito estos datos de la primera tarea "${preview.firstTaskName || 'Formulario inicial'}":\n\n${this.formatMissingFields(this.getMissingRequiredFields())}\n\nPuedes enviarlos en una sola frase. Ejemplo: "Mi nombre es Ana, mi telefono es 70000000..."`,
    );
  }

  private async handleFormCollection(text: string): Promise<void> {
    if (this.looksLikeQuestion(text) && !this.looksLikeFormData(text)) {
      await this.answerContextualQuestion(text);
      const missingBeforeData = this.getMissingRequiredFields();
      if (missingBeforeData.length) {
        this.appendAssistant(`Para continuar con el inicio del tramite, todavia necesito:\n\n${this.formatMissingFields(missingBeforeData)}`);
      }
      return;
    }

    await this.mergeFormSuggestions(text);

    const missing = this.getMissingRequiredFields();
    if (missing.length) {
      this.appendAssistant(
        `Ya tome los datos que pude detectar. Aun falta:\n\n${this.formatMissingFields(missing)}\n\nEnviame esos datos para poder iniciar el tramite.`,
      );
      return;
    }

    this.assistantSession.stage = 'review-form';
    this.appendAssistant(
      `Listo, ya tengo todos los datos necesarios. Confirmame si es correcto:\n\n${this.formatCollectedValues()}\n\nSi algo esta mal, dime la correccion. Si todo esta bien, responde "si" y yo inicio el tramite.`,
    );
  }

  private async handleFormReview(text: string): Promise<void> {
    if (this.isAffirmative(text)) {
      this.appendAssistant('Perfecto, voy a iniciar tu tramite ahora.');
      await this.startSelectedProcess();
      return;
    }

    if (this.isNegative(text) && !this.looksLikeFormData(text)) {
      this.assistantSession = this.createAssistantSession();
      this.appendAssistant('Perfecto, no inicio el tramite. Si quieres, dime nuevamente que tramite necesitas.');
      return;
    }

    if (this.looksLikeQuestion(text) && !this.looksLikeFormData(text)) {
      await this.answerContextualQuestion(text);
      this.appendAssistant(`Cuando quieras continuar, confirma estos datos o enviame una correccion:\n\n${this.formatCollectedValues()}`);
      return;
    }

    await this.mergeFormSuggestions(text);

    const missing = this.getMissingRequiredFields();
    if (missing.length) {
      this.assistantSession.stage = 'collecting-form';
      this.appendAssistant(
        `Actualice los datos que pude detectar, pero aun falta:\n\n${this.formatMissingFields(missing)}\n\nEnviame esos datos para poder iniciar el tramite.`,
      );
      return;
    }

    this.appendAssistant(
      `Actualice la informacion. Confirmame si ahora esta correcto:\n\n${this.formatCollectedValues()}\n\nResponde "si" para iniciar el tramite o dime que debo corregir.`,
    );
  }

  private looksLikeFormData(text: string): boolean {
    const normalized = this.normalize(text);
    const fields = this.sortedFormFields(this.assistantSession.startPreview);
    const fieldHints = fields.flatMap((field) => [
      field.name,
      field.label,
      field.placeholder ?? '',
      ...this.formFieldAliases(field),
    ]);

    return fieldHints.some((hint) => {
      const normalizedHint = this.normalize(hint);
      return normalizedHint.length > 1 && normalized.includes(normalizedHint);
    }) || /\d{4,}/.test(normalized);
  }

  private formatCollectedValues(): string {
    const lines = this.sortedFormFields(this.assistantSession.startPreview)
      .filter((field) => this.hasValue(field, this.assistantSession.collectedValues[field.name]))
      .map((field) => `- ${field.label || field.name}: ${this.formatFormValue(this.assistantSession.collectedValues[field.name])}`);

    return lines.length ? lines.join('\n') : '- Sin datos capturados todavia.';
  }

  private formatFormValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Si' : 'No';
    }
    return String(value ?? '');
  }

  protected async navigateAssistantAction(route: unknown[]): Promise<void> {
    this.isAssistantOpen = false;
    await this.router.navigate(route);
  }

  private async ensureClientProcessesLoaded(): Promise<void> {
    if (this.clientProcesses.length) {
      return;
    }

    const response = await firstValueFrom(this.processService.listarProcesosCliente());
    this.clientProcesses = Array.isArray(response.data) ? response.data : [];
  }

  private async safeRecommendProcess(text: string): Promise<AiProcessRecommendationResponse | null> {
    try {
      const response = await firstValueFrom(this.aiService.recomendarProceso({ message: text }));
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  private resolveCandidateProcesses(
    text: string,
    recommendation: AiProcessRecommendationResponse | null,
  ): ClientProcessListItem[] {
    const normalizedText = this.normalize(text);
    const keys = new Set<string>();
    if (recommendation?.processKey) {
      keys.add(this.normalize(recommendation.processKey));
    }
    for (const alternative of recommendation?.alternatives ?? []) {
      keys.add(this.normalize(alternative));
    }

    const recommended = this.clientProcesses.filter((process) => {
      const processKey = this.normalize(process.processKey);
      const name = this.normalize(process.nombre);
      return keys.has(processKey) || keys.has(name);
    });

    const lexical = this.clientProcesses
      .map((process) => ({
        process,
        score: this.scoreProcessMatch(normalizedText, process),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.process);

    return Array.from(new Map([...recommended, ...lexical].map((process) => [process.processId, process])).values()).slice(0, 5);
  }

  private scoreProcessMatch(normalizedText: string, process: ClientProcessListItem): number {
    const haystack = this.normalize(`${process.nombre} ${process.descripcion ?? ''} ${process.processKey}`);
    const words = normalizedText.split(' ').filter((word) => word.length > 2);
    if (!words.length) {
      return 0;
    }
    let score = 0;
    for (const word of words) {
      if (haystack.includes(word)) {
        score += word.length;
      }
    }
    if (haystack.includes(normalizedText)) {
      score += 20;
    }
    return score;
  }

  private selectProcessFromMessage(text: string, candidates: ClientProcessListItem[]): ClientProcessListItem | null {
    const numericChoice = Number.parseInt(text.trim(), 10);
    if (Number.isFinite(numericChoice) && numericChoice >= 1 && numericChoice <= candidates.length) {
      return candidates[numericChoice - 1];
    }

    const normalizedText = this.normalize(text);
    return candidates.find((process) => {
      const name = this.normalize(process.nombre);
      const key = this.normalize(process.processKey);
      return normalizedText.includes(name) || name.includes(normalizedText) || normalizedText.includes(key);
    }) ?? null;
  }

  private async loadStartPreview(process: ClientProcessListItem): Promise<ClientProcessStartPreview> {
    const response = await firstValueFrom(this.processService.obtenerVistaInicioTramite(process.processId));
    if (!response.data) {
      throw new Error('No se pudo cargar el formulario inicial del tramite.');
    }
    return response.data;
  }

  private async mergeFormSuggestions(text: string): Promise<void> {
    const preview = this.assistantSession.startPreview;
    if (!preview?.formDefinition) {
      return;
    }

    const request: FormFillRequest = {
      transcript: text,
      processName: preview.processName,
      taskName: preview.firstTaskName ?? undefined,
      areaName: preview.firstTaskAreaName ?? undefined,
      currentValues: this.assistantSession.collectedValues,
      fields: this.sortedFormFields(preview).map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        helpText: field.helpText,
        options: this.getFieldOptions(field),
      })),
    };

    const response = await firstValueFrom(this.aiService.sugerirFormulario(request));
    for (const suggestion of response.data?.suggestions ?? []) {
      this.applyFormSuggestion(suggestion);
    }
  }

  private applyFormSuggestion(suggestion: FormFillSuggestion): void {
    const preview = this.assistantSession.startPreview;
    const field = this.findFieldForSuggestion(suggestion.fieldName, preview);
    if (!field || suggestion.value === null || suggestion.value === undefined || field.type === 'file') {
      return;
    }

    this.assistantSession.collectedValues[field.name] = this.normalizeFormValue(field, suggestion.value);
  }

  private findFieldForSuggestion(fieldName: string, preview: ClientProcessStartPreview | null): FormFieldDefinition | null {
    const fields = preview?.formDefinition?.fields ?? [];
    const normalizedFieldName = this.normalize(fieldName);

    return fields.find((field) => this.normalize(field.name) === normalizedFieldName)
      ?? fields.find((field) => this.normalize(field.label) === normalizedFieldName)
      ?? fields.find((field) => this.formFieldAliases(field).some((alias) => this.normalize(alias) === normalizedFieldName))
      ?? fields.find((field) => {
        const fieldText = this.normalize(`${field.name} ${field.label} ${this.formFieldAliases(field).join(' ')}`);
        return normalizedFieldName.length > 1 && (fieldText.includes(normalizedFieldName) || normalizedFieldName.includes(fieldText));
      })
      ?? null;
  }

  private formFieldAliases(field: FormFieldDefinition): string[] {
    const normalized = this.normalize(`${field.name} ${field.label}`);
    const aliases: string[] = [];

    if (normalized.includes('nombre') || normalized.includes('name')) {
      aliases.push('name', 'nombre', 'nombre completo', 'mi nombre');
    }
    if (normalized.includes('telefono') || normalized.includes('celular') || normalized.includes('phone')) {
      aliases.push('telefono', 'celular', 'numero de telefono', 'phone');
    }
    if (normalized.includes('carnet') || normalized.includes('ci') || normalized.includes('cedula') || normalized.includes('documento')) {
      aliases.push('carnet', 'ci', 'cedula', 'documento', 'numero de documento');
    }
    if (normalized.includes('correo') || normalized.includes('email')) {
      aliases.push('correo', 'email', 'correo electronico');
    }
    if (normalized.includes('direccion')) {
      aliases.push('direccion', 'domicilio');
    }

    return aliases;
  }

  private normalizeFormValue(field: FormFieldDefinition, value: unknown): unknown {
    if (field.type === 'number') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    if (field.type === 'checkbox') {
      if (typeof value === 'boolean') {
        return value;
      }
      const normalized = this.normalize(String(value));
      return ['si', 'true', 'verdadero', 'acepto', 'confirmo'].includes(normalized);
    }
    if (field.type === 'checklist') {
      return Array.isArray(value) ? value : String(value).split(',').map((item) => item.trim()).filter(Boolean);
    }
    return value;
  }

  private getMissingRequiredFields(): FormFieldDefinition[] {
    const preview = this.assistantSession.startPreview;
    return this.sortedFormFields(preview).filter((field) => field.required && !this.hasValue(field, this.assistantSession.collectedValues[field.name]));
  }

  private hasValue(field: FormFieldDefinition, value: unknown): boolean {
    if (field.type === 'checkbox') {
      return value === true;
    }
    if (field.type === 'checklist') {
      return Array.isArray(value) && value.length > 0;
    }
    if (value === null || value === undefined) {
      return false;
    }
    return typeof value === 'string' ? value.trim().length > 0 : true;
  }

  private async startSelectedProcess(): Promise<void> {
    const process = this.assistantSession.selectedProcess;
    if (!process) {
      throw new Error('No hay tramite seleccionado.');
    }

    const variables = this.buildVariablesPayload();
    const response = await firstValueFrom(
      this.processService.iniciarTramiteCliente(process.processId, { variables }),
    );

    const result = response.data;
    this.assistantSession = this.createAssistantSession();
    const trackingRoute = result?.processInstanceId
      ? ['/client/instances', result.processInstanceId, 'tracking']
      : ['/client/instances'];
    this.appendAssistant(
      `Listo, tu tramite "${result?.processName || process.nombre}" ya esta iniciado.\n\nNumero de instancia: ${result?.processInstanceId || 'generado por el sistema'}.\nSi deseas trackearlo o hacerle seguimiento, haz click aqui:`,
      'Ver seguimiento',
      trackingRoute,
    );
  }

  private buildVariablesPayload(): Record<string, unknown> {
    const preview = this.assistantSession.startPreview;
    const variables: Record<string, unknown> = {};
    for (const field of this.sortedFormFields(preview)) {
      const value = this.assistantSession.collectedValues[field.name];
      if (!this.hasValue(field, value)) {
        continue;
      }
      variables[field.name] = field.type === 'checklist' && Array.isArray(value) ? JSON.stringify(value) : value;
    }
    return variables;
  }

  private async answerContextualQuestion(text: string): Promise<void> {
    const selectedProcess = this.assistantSession.selectedProcess;
    if (selectedProcess && this.isProcessExplanationQuestion(text)) {
      const description = selectedProcess.descripcion?.trim();
      this.appendAssistant(
        description
          ? `El tramite "${selectedProcess.nombre}" consiste en: ${description}`
          : `El tramite "${selectedProcess.nombre}" esta disponible para iniciar desde el portal cliente. El sistema te pedira los datos iniciales definidos por la primera tarea y luego podras hacer seguimiento desde "Instancias".`,
      );
      return;
    }

    try {
      const response = await firstValueFrom(this.aiService.asistir({
        message: text,
        processKey: this.assistantSession.selectedProcess?.processKey ?? null,
        formId: this.assistantSession.startPreview?.formDefinition?.id ?? null,
        currentFormValues: this.assistantSession.collectedValues,
      }));
      this.appendAssistant(response.data?.response?.trim() || 'No pude generar una respuesta clara en este momento.');
    } catch {
      this.appendAssistant('Puedo ayudarte a iniciar tramites publicados para clientes. Dime que necesitas hacer y buscare el proceso mas cercano.');
    }
  }

  private isProcessExplanationQuestion(text: string): boolean {
    const normalized = this.normalize(text);
    return ['consiste', 'que hace', 'para que', 'explica', 'detalle', 'informacion', 'registro'].some((word) => normalized.includes(word));
  }

  private sortedFormFields(preview: ClientProcessStartPreview | null): FormFieldDefinition[] {
    return [...(preview?.formDefinition?.fields ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  private getFieldOptions(field: FormFieldDefinition): string[] {
    if (field.optionItems?.length) {
      return field.optionItems.map((option) => option.value || option.label).filter(Boolean);
    }
    return field.options ?? [];
  }

  private formatProcessOptions(processes: ClientProcessListItem[]): string {
    return processes
      .map((process, index) => `${index + 1}. ${process.nombre}${process.descripcion ? ` - ${process.descripcion}` : ''}`)
      .join('\n');
  }

  private formatMissingFields(fields: FormFieldDefinition[]): string {
    return fields.map((field) => `- ${field.label || field.name}${field.helpText ? `: ${field.helpText}` : ''}`).join('\n');
  }

  private appendAssistant(text: string, actionLabel?: string, actionRoute?: unknown[]): void {
    this.assistantMessages = [...this.assistantMessages, { role: 'assistant', text, actionLabel, actionRoute }];
  }

  private isAffirmative(text: string): boolean {
    const normalized = this.normalize(text);
    if (normalized === 's') {
      return true;
    }
    return ['si', 'sí', 'ok', 'dale', 'confirmo', 'iniciar', 'claro', 'correcto', 'acepto'].some((word) => normalized.includes(this.normalize(word)));
  }

  private isNegative(text: string): boolean {
    const normalized = this.normalize(text);
    return ['no', 'cancelar', 'cancela', 'salir', 'olvidalo'].some((word) => {
      return normalized === word || normalized.startsWith(`${word} `) || normalized.includes(` ${word} `);
    });
  }

  private looksLikeQuestion(text: string): boolean {
    const normalized = this.normalize(text);
    return ['que', 'como', 'donde', 'cuando', 'porque', 'ayuda', 'duda', '?'].some((word) => normalized.includes(word));
  }

  private getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
