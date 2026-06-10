import { CommonModule } from '@angular/common';
import { Component, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuditEvent, AuditSearchRequest } from '../../../../core/models/audit.models';
import { AiReportPlanResponse } from '../../../../core/models/enterprise-ai.models';
import { DocumentLifecycleState, DocumentMetadata } from '../../../../core/models/document-lifecycle.models';
import { DocumentSearchRequest } from '../../../../core/models/document-search.models';
import { ProcessInstance } from '../../../../core/models/process-instance.models';
import { AiService } from '../../../../core/services/ai.service';
import { AuditService } from '../../../../core/services/audit.service';
import { DocumentSearchService } from '../../../../core/services/document-search.service';
import { ProcessInstanceService } from '../../../../core/services/process-instance.service';

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
type ReportType = 'audit' | 'documents' | 'tasks' | 'forms' | 'processes';
type ExportFormat = 'PDF' | 'WORD' | 'EXCEL';

type ReportRow = {
  type: string;
  title: string;
  detail: string;
  actor: string;
  area: string;
  process: string;
  status: string;
  date: string;
  extra?: Record<string, string>;
};

type ReportSummary = {
  total: number;
  documents: number;
  tasks: number;
  forms: number;
  alerts: number;
};

@Component({
  selector: 'app-enterprise-ai',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enterprise-ai.component.html',
  styleUrl: './enterprise-ai.component.css',
})
export class EnterpriseAiComponent {
  private readonly aiService = inject(AiService);
  private readonly auditService = inject(AuditService);
  private readonly documentSearchService = inject(DocumentSearchService);
  private readonly processInstanceService = inject(ProcessInstanceService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  protected prompt = 'Dame un reporte de documentos rechazados de los ultimos 3 dias';
  protected reportType: ReportType = 'audit';
  protected datePreset: 'today' | '3d' | '7d' | '30d' | 'custom' = '3d';
  protected fromDate = this.toDateInput(this.addDays(new Date(), -2));
  protected toDate = this.toDateInput(new Date());
  protected processKey = '';
  protected areaId = '';
  protected actorEmail = '';
  protected documentState = '';
  protected isLoading = false;
  protected errorMessage = '';
  protected plan: AiReportPlanResponse | null = null;
  protected rows: ReportRow[] = [];
  protected dynamicColumns: string[] = [];
  protected reportTitle = 'Reporte dinámico';
  protected reportReason = 'Genera reportes con datos reales del sistema.';
  protected lastPrompt = '';
  protected generationMode: 'filters' | 'ai' = 'filters';
  protected isVoiceRecording = false;
  protected voiceError = '';
  protected readonly isVoiceInputSupported = this.getSpeechRecognitionConstructor() !== null;

  private speechRecognition?: BrowserSpeechRecognition;
  private speechRecognitionConstructor = this.getSpeechRecognitionConstructor();
  private voiceBaseText = '';
  private shouldSendVoiceInputOnEnd = false;

  protected readonly quickReports = [
    {
      label: 'Documentos rechazados',
      prompt: 'Dame un reporte de documentos rechazados de los ultimos 7 dias',
      type: 'documents' as ReportType,
    },
    {
      label: 'Tareas completadas hoy',
      prompt: 'Muestrame las tareas completadas hoy por usuario',
      type: 'tasks' as ReportType,
    },
    {
      label: 'Actividad documental',
      prompt: 'Genera un reporte de documentos subidos, editados y aprobados en los ultimos 3 dias',
      type: 'audit' as ReportType,
    },
    {
      label: 'Formularios enviados',
      prompt: 'Reporte de formularios enviados esta semana por proceso',
      type: 'forms' as ReportType,
    },
    {
      label: 'Procesos activos',
      prompt: 'Dame un reporte de los procesos actualmente activos y sin completar con el tiempo que llevan abiertos',
      type: 'processes' as ReportType,
    },
  ];

  protected get summary(): ReportSummary {
    return {
      total: this.rows.length,
      documents: this.rows.filter((row) => row.type === 'Documento').length,
      tasks: this.rows.filter((row) => row.type === 'Tarea').length,
      forms: this.rows.filter((row) => row.type === 'Formulario').length,
      alerts: this.rows.filter((row) => ['REJECTED', 'Rechazado', 'Bloqueado'].includes(row.status)).length,
    };
  }

  protected useQuickReport(item: { prompt: string; type: ReportType }): void {
    this.prompt = item.prompt;
    this.reportType = item.type;
    this.applyPromptDateHints(item.prompt);
    void this.generateReportFromFilters();
  }

  protected applyPreset(preset: 'today' | '3d' | '7d' | '30d' | 'custom'): void {
    this.datePreset = preset;
    const today = new Date();
    if (preset === 'today') {
      this.fromDate = this.toDateInput(today);
      this.toDate = this.toDateInput(today);
    }
    if (preset === '3d') {
      this.fromDate = this.toDateInput(this.addDays(today, -2));
      this.toDate = this.toDateInput(today);
    }
    if (preset === '7d') {
      this.fromDate = this.toDateInput(this.addDays(today, -6));
      this.toDate = this.toDateInput(today);
    }
    if (preset === '30d') {
      this.fromDate = this.toDateInput(this.addDays(today, -29));
      this.toDate = this.toDateInput(today);
    }
  }

  protected async generateReport(): Promise<void> {
    const message = this.prompt.trim();
    if (!message) {
      this.errorMessage = 'Escribe qué reporte necesitas generar.';
      return;
    }

    this.stopVoiceInput();
    this.isLoading = true;
    this.errorMessage = '';
    this.rows = [];
    this.dynamicColumns = [];
    this.plan = null;
    this.lastPrompt = message;
    this.generationMode = 'ai';

    try {
      this.applyPromptDateHints(message);
      this.reportType = this.inferReportType(message, this.reportType);
      const plan = await this.safePlanReport(message);
      this.plan = plan;
      if (plan) {
        this.applyPlan(plan);
      }

      await this.loadReportRows();
      this.reportTitle = this.buildReportTitle();
      this.reportReason = plan?.reason || 'Reporte construido desde auditoría y repositorio documental con filtros reales.';

      const requestedFormat = this.inferRequestedExportFormat(message, plan?.format);
      if (requestedFormat) {
        setTimeout(() => this.exportReport(requestedFormat), 250);
      }
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'No se pudo generar el reporte.';
    } finally {
      this.isLoading = false;
    }
  }

  protected async generateReportFromFilters(): Promise<void> {
    this.stopVoiceInput();
    this.isLoading = true;
    this.errorMessage = '';
    this.rows = [];
    this.dynamicColumns = [];
    this.plan = null;
    this.lastPrompt = '';
    this.generationMode = 'filters';

    try {
      await this.loadReportRows();
      this.reportTitle = this.buildReportTitle();
      this.reportReason = 'Reporte generado directamente con filtros, sin usar IA.';
    } catch (error: any) {
      this.errorMessage = error?.error?.message || error?.message || 'No se pudo generar el reporte con filtros.';
    } finally {
      this.isLoading = false;
    }
  }

  protected exportReport(format: ExportFormat): void {
    if (!this.rows.length) {
      this.errorMessage = 'Primero genera un reporte con resultados para exportar.';
      return;
    }

    if (format === 'PDF') {
      this.openPrintableReport();
      return;
    }

    const table = this.buildHtmlTable();
    const title = this.escapeHtml(this.reportTitle);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><p>${this.escapeHtml(this.reportReason)}</p>${table}</body></html>`;
    const extension = format === 'WORD' ? 'doc' : 'xls';
    const type = format === 'WORD' ? 'application/msword;charset=utf-8' : 'application/vnd.ms-excel;charset=utf-8';
    this.downloadBlob(html, `${this.slugify(this.reportTitle)}.${extension}`, type);
  }

  protected toggleVoiceInput(): void {
    if (this.isVoiceRecording) {
      this.stopVoiceInput();
      return;
    }

    this.startVoiceInput();
  }

  protected goBack(): void {
    void this.router.navigate(['/dashboard']);
  }

  protected formatDate(value: string): string {
    if (!value) {
      return 'Sin fecha';
    }
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private async safePlanReport(message: string): Promise<AiReportPlanResponse | null> {
    try {
      const response = await firstValueFrom(this.aiService.planificarReporte({ message }));
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  private applyPlan(plan: AiReportPlanResponse): void {
    const reportType = this.normalize(String(plan.reportType || ''));
    if (reportType.includes('document')) {
      this.reportType = 'documents';
    } else if (reportType.includes('task') || reportType.includes('tarea')) {
      this.reportType = 'tasks';
    } else if (reportType.includes('form')) {
      this.reportType = 'forms';
    } else if (reportType.includes('process') || reportType.includes('proceso') || reportType.includes('instancia')) {
      this.reportType = 'processes';
    }

    const filters = plan.filters ?? {};
    const status = String(filters['status'] ?? filters['documentState'] ?? '').toUpperCase();
    if (status) {
      this.documentState = this.normalizeDocumentState(status) ?? this.documentState;
    }
    this.processKey = String(filters['processKey'] ?? this.processKey ?? '').trim();
    this.areaId = String(filters['areaId'] ?? filters['tenantId'] ?? this.areaId ?? '').trim();
    if (plan.columns?.length) {
      this.dynamicColumns = plan.columns
        .map((column) => String(column || '').trim())
        .filter(Boolean);
    }
  }

  private async loadReportRows(): Promise<void> {
    if (this.reportType === 'documents') {
      await this.loadDocumentRows();
      return;
    }
    if (this.reportType === 'processes') {
      await this.loadProcessRows();
      return;
    }

    await this.loadAuditRows();
  }

  private async loadProcessRows(): Promise<void> {
    this.dynamicColumns = this.dynamicColumns.length
      ? this.dynamicColumns
      : ['Tiempo abierto', 'Inicio', 'Estado'];
    const response = await firstValueFrom(this.processInstanceService.listar());
    const instances = response.data ?? [];
    const from = new Date(this.startOfDayIso(this.fromDate)).getTime();
    const to = new Date(this.endOfDayIso(this.toDate)).getTime();

    this.rows = instances
      .filter((instance) => this.isActiveInstance(instance))
      .filter((instance) => !this.processKey.trim() || this.normalize(instance.processKey || instance.nombreProceso || '').includes(this.normalize(this.processKey)))
      .filter((instance) => {
        const started = instance.startedAt ? new Date(instance.startedAt).getTime() : 0;
        return !started || (started >= from && started <= to);
      })
      .map((instance) => this.mapProcessInstanceRow(instance));
  }

  private async loadDocumentRows(): Promise<void> {
    const request: DocumentSearchRequest = {
      documentState: (this.documentState || undefined) as DocumentLifecycleState | undefined,
      processKey: this.processKey.trim() || undefined,
      tenantId: this.areaId.trim() || undefined,
      uploadedAtFrom: this.startOfDayIso(this.fromDate),
      uploadedAtTo: this.endOfDayIso(this.toDate),
      page: 0,
      size: 200,
      sortBy: 'updatedAt',
      sortDirection: 'DESC',
    };

    const response = await firstValueFrom(this.documentSearchService.search(request));
    const content = response.data?.content ?? [];
    this.rows = content.map((document) => this.mapDocumentRow(document));
  }

  private async loadAuditRows(): Promise<void> {
    const request: AuditSearchRequest = {
      actorEmail: this.actorEmail.trim() || undefined,
      areaId: this.areaId.trim() || undefined,
      processKey: this.processKey.trim() || undefined,
      entityType: this.reportType === 'tasks' ? 'TASK' : this.reportType === 'forms' ? 'FORM' : undefined,
      createdAtFrom: this.startOfDayIso(this.fromDate),
      createdAtTo: this.endOfDayIso(this.toDate),
      page: 0,
      size: 250,
    };

    const response = await firstValueFrom(this.auditService.search(request));
    const content = response.data?.content ?? [];
    this.rows = content
      .filter((event) => this.matchesPrompt(event, this.lastPrompt))
      .map((event) => this.mapAuditRow(event));
  }

  private mapDocumentRow(document: DocumentMetadata): ReportRow {
    return {
      type: 'Documento',
      title: document.originalName || document.fileName || 'Documento',
      detail: `${document.mimeType || 'Sin tipo'} · v${document.version || 1}`,
      actor: document.updatedBy || document.uploadedBy || 'Sin usuario',
      area: document.ownerAreaId || document.tenantId || 'Sin área',
      process: document.processKey || document.processInstanceId || 'No vinculado',
      status: document.documentState || document.status || 'Sin estado',
      date: document.updatedAt || document.uploadedAt || document.createdAt || '',
    };
  }

  private mapAuditRow(event: AuditEvent): ReportRow {
    return {
      type: this.entityLabel(event.entityType),
      title: event.documentName || event.taskName || event.entityName || event.action,
      detail: this.actionLabel(event.action),
      actor: event.actorName || event.actorEmail || 'Sistema',
      area: event.areaName || event.areaId || event.tenantId || 'Sin área',
      process: event.processKey || event.processInstanceId || 'No vinculado',
      status: event.documentState || this.actionStatus(event.action),
      date: event.createdAt,
    };
  }

  private mapProcessInstanceRow(instance: ProcessInstance): ReportRow {
    const startedAt = instance.startedAt || '';
    return {
      type: 'Proceso',
      title: instance.nombreProceso || instance.processKey || 'Proceso sin nombre',
      detail: `Instancia ${this.shortId(instance.id)}`,
      actor: instance.iniciadoPor || 'Sin usuario',
      area: 'Todas las areas visibles',
      process: instance.processKey || instance.processDefinitionId || 'No vinculado',
      status: instance.estado || 'Activo',
      date: startedAt,
      extra: {
        'Proceso': instance.nombreProceso || instance.processKey || 'Proceso sin nombre',
        'Tiempo abierto': this.openDuration(startedAt),
        'Inicio': startedAt ? this.formatDate(startedAt) : 'Sin fecha',
        'Estado': instance.estado || 'Activo',
        'Instancia': instance.id,
        'Iniciado por': instance.iniciadoPor || 'Sin usuario',
      },
    };
  }

  private isActiveInstance(instance: ProcessInstance): boolean {
    if (instance.finishedAt) {
      return false;
    }
    const state = this.normalize(instance.estado || '');
    return !state.includes('complet') && !state.includes('final') && !state.includes('termin') && !state.includes('finished');
  }

  private matchesPrompt(event: AuditEvent, prompt: string): boolean {
    const normalized = this.normalize(prompt);
    if (normalized.includes('rechaz')) {
      return event.action === 'DOCUMENT_REJECTED' || event.documentState === 'REJECTED';
    }
    if (normalized.includes('aprob')) {
      return event.action === 'DOCUMENT_APPROVED' || event.documentState === 'APPROVED';
    }
    if (normalized.includes('subid') || normalized.includes('cargad')) {
      return event.action === 'DOCUMENT_UPLOADED';
    }
    if (normalized.includes('edit')) {
      return event.action === 'DOCUMENT_EDITING_STARTED'
        || event.action === 'DOCUMENT_EDITING_FINISHED'
        || event.action === 'DOCUMENT_SAVED_FROM_ONLYOFFICE';
    }
    if (normalized.includes('complet')) {
      return event.action === 'TASK_COMPLETED' || event.action === 'FORM_SUBMITTED';
    }
    return true;
  }

  private inferReportType(prompt: string, current: ReportType): ReportType {
    const normalized = this.normalize(prompt);
    if (normalized.includes('document')) {
      return 'documents';
    }
    if (normalized.includes('tarea')) {
      return 'tasks';
    }
    if (normalized.includes('formulario')) {
      return 'forms';
    }
    if (normalized.includes('proceso') || normalized.includes('tramite') || normalized.includes('instancia')) {
      return 'processes';
    }
    return current;
  }

  private applyPromptDateHints(prompt: string): void {
    const normalized = this.normalize(prompt);
    const lastDays = normalized.match(/ultim(?:os|as)?\s+(\d+)\s+dias?/);
    if (lastDays?.[1]) {
      const days = Math.max(Number(lastDays[1]), 1);
      this.datePreset = 'custom';
      this.fromDate = this.toDateInput(this.addDays(new Date(), -(days - 1)));
      this.toDate = this.toDateInput(new Date());
    } else if (normalized.includes('hoy')) {
      this.applyPreset('today');
    } else if (normalized.includes('semana') || normalized.includes('7 dias')) {
      this.applyPreset('7d');
    } else if (normalized.includes('mes') || normalized.includes('30 dias')) {
      this.applyPreset('30d');
    }

    const state = this.normalizeDocumentState(prompt);
    if (state) {
      this.documentState = state;
    }
  }

  private normalizeDocumentState(value: string): DocumentLifecycleState | '' {
    const normalized = this.normalize(value);
    if (normalized.includes('rechaz')) return 'REJECTED';
    if (normalized.includes('aprob')) return 'APPROVED';
    if (normalized.includes('revision')) return 'IN_REVIEW';
    if (normalized.includes('pend')) return 'PENDING';
    if (normalized.includes('subid') || normalized.includes('cargad')) return 'UPLOADED';
    if (normalized.includes('final')) return 'FINAL';
    if (normalized.includes('archiv')) return 'ARCHIVED';
    return '';
  }

  private inferRequestedExportFormat(prompt: string, plannedFormat?: string | null): ExportFormat | null {
    const source = this.normalize(`${prompt} ${plannedFormat ?? ''}`);
    if (!source.includes('export') && !source.includes('descarg') && !source.includes('pdf') && !source.includes('excel') && !source.includes('word')) {
      return null;
    }
    if (source.includes('pdf')) return 'PDF';
    if (source.includes('excel') || source.includes('xls')) return 'EXCEL';
    if (source.includes('word') || source.includes('doc')) return 'WORD';
    return null;
  }

  private startVoiceInput(): void {
    if (!this.speechRecognitionConstructor || this.isLoading) {
      this.voiceError = 'Tu navegador no soporta dictado por voz.';
      return;
    }

    this.stopVoiceInput();
    this.voiceError = '';
    this.voiceBaseText = this.prompt.trim();
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
          if (!transcript) continue;
          if (result.isFinal) {
            finalTranscript += ` ${transcript}`;
          } else {
            interimTranscript += ` ${transcript}`;
          }
        }

        this.prompt = [this.voiceBaseText, finalTranscript.trim(), interimTranscript.trim()]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (finalTranscript.trim()) {
          this.voiceBaseText = [this.voiceBaseText, finalTranscript.trim()]
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          this.shouldSendVoiceInputOnEnd = this.prompt.trim().length > 0;
        }
      });
    };
    recognition.onerror = (event: { error?: string }) => {
      this.ngZone.run(() => {
        this.voiceError = event.error === 'not-allowed'
          ? 'No se concedió permiso al micrófono. Revisa los permisos del navegador.'
          : 'No pude escuchar correctamente. Intenta de nuevo.';
        this.isVoiceRecording = false;
      });
    };
    recognition.onend = () => {
      this.ngZone.run(() => {
        const shouldSend = this.shouldSendVoiceInputOnEnd && this.prompt.trim().length > 0 && !this.isLoading;
        this.isVoiceRecording = false;
        this.speechRecognition = undefined;
        this.shouldSendVoiceInputOnEnd = false;
        if (shouldSend) {
          void this.generateReport();
        }
      });
    };

    try {
      recognition.start();
      this.speechRecognition = recognition;
      this.isVoiceRecording = true;
    } catch {
      this.voiceError = 'No se pudo iniciar el micrófono. Intenta nuevamente.';
      this.isVoiceRecording = false;
    }
  }

  private stopVoiceInput(): void {
    if (!this.speechRecognition) {
      this.isVoiceRecording = false;
      return;
    }

    try {
      this.speechRecognition.stop();
    } catch {
      // Puede ocurrir si el navegador ya detuvo el reconocimiento.
    }
    this.speechRecognition = undefined;
    this.isVoiceRecording = false;
    this.shouldSendVoiceInputOnEnd = false;
  }

  private buildReportTitle(): string {
    const type = {
      audit: 'Actividad general',
      documents: 'Documentos',
      tasks: 'Tareas',
      forms: 'Formularios',
      processes: 'Procesos activos',
    }[this.reportType];
    return `${type} · ${this.fromDate} a ${this.toDate}`;
  }

  private entityLabel(type: string): string {
    if (type === 'DOCUMENT') return 'Documento';
    if (type === 'TASK') return 'Tarea';
    if (type === 'FORM') return 'Formulario';
    return 'Proceso';
  }

  private actionLabel(action: string): string {
    return action
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/^\w/, (letter) => letter.toUpperCase());
  }

  private actionStatus(action: string): string {
    if (action.includes('REJECTED')) return 'Rechazado';
    if (action.includes('APPROVED')) return 'Aprobado';
    if (action.includes('LOCKED')) return 'Bloqueado';
    if (action.includes('COMPLETED')) return 'Completado';
    return 'Registrado';
  }

  private buildHtmlTable(): string {
    const dynamicHeaders = this.dynamicColumns.map((column) => `<th>${this.escapeHtml(column)}</th>`).join('');
    const rows = this.rows.map((row) => `
      <tr>
        <td>${this.escapeHtml(row.type)}</td>
        <td>${this.escapeHtml(row.title)}</td>
        <td>${this.escapeHtml(row.detail)}</td>
        <td>${this.escapeHtml(row.actor)}</td>
        <td>${this.escapeHtml(row.area)}</td>
        <td>${this.escapeHtml(row.process)}</td>
        <td>${this.escapeHtml(row.status)}</td>
        <td>${this.escapeHtml(this.formatDate(row.date))}</td>
        ${this.dynamicColumns.map((column) => `<td>${this.escapeHtml(row.extra?.[column] ?? '')}</td>`).join('')}
      </tr>
    `).join('');
    return `<table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Tipo</th><th>Elemento</th><th>Detalle</th><th>Usuario</th><th>Área</th><th>Proceso</th><th>Estado</th><th>Fecha</th>${dynamicHeaders}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  private openPrintableReport(): void {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      this.errorMessage = 'El navegador bloqueó la ventana de impresión.';
      return;
    }
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${this.escapeHtml(this.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { margin-bottom: 4px; }
            p { color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #e0f2fe; text-align: left; }
            th, td { border: 1px solid #cbd5e1; padding: 7px; vertical-align: top; }
          </style>
        </head>
        <body>
          <h1>${this.escapeHtml(this.reportTitle)}</h1>
          <p>${this.escapeHtml(this.reportReason)}</p>
          ${this.buildHtmlTable()}
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  private downloadBlob(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private openDuration(startedAt: string): string {
    if (!startedAt) {
      return 'Sin fecha de inicio';
    }
    const elapsed = Date.now() - new Date(startedAt).getTime();
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      return 'Sin calcular';
    }
    const totalMinutes = Math.max(Math.floor(elapsed / 60000), 0);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) {
      return `${days} d ${hours} h`;
    }
    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${minutes} min`;
  }

  private shortId(value: string): string {
    if (!value) {
      return 'N/D';
    }
    return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
  }

  private startOfDayIso(value: string): string {
    return `${value}T00:00:00`;
  }

  private endOfDayIso(value: string): string {
    return `${value}T23:59:59`;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private toDateInput(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private slugify(value: string): string {
    return this.normalize(value).replace(/\s+/g, '-').slice(0, 80) || 'reporte';
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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
    return String(text ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
