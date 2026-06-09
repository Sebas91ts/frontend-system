import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuditAction, AuditEntityType, AuditEvent, AuditSearchRequest } from '../../../../core/models/audit.models';
import { AuditService } from '../../../../core/services/audit.service';

type RangePreset = 'today' | '7d' | '30d' | 'all';

interface AuditStats {
  visible: number;
  documents: number;
  tasks: number;
  forms: number;
  alerts: number;
}

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-audit.component.html',
  styleUrl: './admin-audit.component.css',
})
export class AdminAuditComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly router = inject(Router);

  protected isLoading = false;
  protected errorMessage = '';
  protected events: AuditEvent[] = [];
  protected totalElements = 0;
  protected stats: AuditStats = {
    visible: 0,
    documents: 0,
    tasks: 0,
    forms: 0,
    alerts: 0,
  };
  protected page = 0;
  protected size = 80;
  protected rangePreset: RangePreset = 'today';
  protected selectedAction = '';
  protected selectedEntityType = '';
  protected actorEmail = '';
  protected areaId = '';
  protected processInstanceId = '';
  protected processKey = '';
  protected documentId = '';
  protected taskInstanceId = '';
  protected customFrom = '';
  protected customTo = '';

  protected readonly actionOptions: Array<{ value: AuditAction; label: string }> = [
    { value: 'DOCUMENT_UPLOADED', label: 'Documento subido' },
    { value: 'DOCUMENT_METADATA_VIEWED', label: 'Metadata consultada' },
    { value: 'DOCUMENT_DOWNLOAD_REQUESTED', label: 'Descarga solicitada' },
    { value: 'DOCUMENT_TAG_ADDED', label: 'Etiqueta agregada' },
    { value: 'DOCUMENT_TAG_REMOVED', label: 'Etiqueta retirada' },
    { value: 'DOCUMENT_EDITING_STARTED', label: 'Edicion iniciada' },
    { value: 'DOCUMENT_EDITING_FINISHED', label: 'Edicion finalizada' },
    { value: 'DOCUMENT_SAVED_FROM_ONLYOFFICE', label: 'Guardado desde OnlyOffice' },
    { value: 'DOCUMENT_APPROVED', label: 'Documento aprobado' },
    { value: 'DOCUMENT_REJECTED', label: 'Documento rechazado' },
    { value: 'DOCUMENT_LOCKED', label: 'Documento bloqueado' },
    { value: 'DOCUMENT_UNLOCKED', label: 'Documento desbloqueado' },
    { value: 'DOCUMENT_WORKFLOW_UPDATED', label: 'Actualizado por workflow' },
    { value: 'TASK_CLAIMED', label: 'Tarea tomada' },
    { value: 'TASK_COMPLETED', label: 'Tarea completada' },
    { value: 'FORM_SUBMITTED', label: 'Formulario enviado' },
  ];

  protected readonly entityTypeOptions: Array<{ value: AuditEntityType; label: string }> = [
    { value: 'DOCUMENT', label: 'Documento' },
    { value: 'TASK', label: 'Tarea' },
    { value: 'FORM', label: 'Formulario' },
    { value: 'PROCESS_INSTANCE', label: 'Instancia' },
  ];

  ngOnInit(): void {
    this.applyRange('today');
  }

  protected get activeRangeLabel(): string {
    if (this.rangePreset === 'today') {
      return 'Actividad de hoy';
    }
    if (this.rangePreset === '7d') {
      return 'Ultimos 7 dias';
    }
    if (this.rangePreset === '30d') {
      return 'Ultimos 30 dias';
    }
    return 'Todo el historial';
  }

  protected applyRange(range: RangePreset): void {
    this.rangePreset = range;
    const now = new Date();
    if (range === 'all') {
      this.customFrom = '';
      this.customTo = '';
      this.search();
      return;
    }

    const from = new Date(now);
    if (range === 'today') {
      from.setHours(0, 0, 0, 0);
    } else {
      from.setDate(now.getDate() - (range === '7d' ? 7 : 30));
      from.setHours(0, 0, 0, 0);
    }
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    this.customFrom = this.toDatetimeLocal(from);
    this.customTo = this.toDatetimeLocal(to);
    this.search();
  }

  protected search(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const request: AuditSearchRequest = {
      action: this.selectedAction as AuditAction || undefined,
      entityType: this.selectedEntityType as AuditEntityType || undefined,
      actorEmail: this.actorEmail.trim() || undefined,
      areaId: this.areaId.trim() || undefined,
      processInstanceId: this.processInstanceId.trim() || undefined,
      processKey: this.processKey.trim() || undefined,
      documentId: this.documentId.trim() || undefined,
      taskInstanceId: this.taskInstanceId.trim() || undefined,
      createdAtFrom: this.fromDatetimeLocal(this.customFrom),
      createdAtTo: this.fromDatetimeLocal(this.customTo, true),
      page: this.page,
      size: this.size,
    };

    this.auditService
      .search(request)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.events = response.data?.content ?? [];
          this.totalElements = response.data?.totalElements ?? this.events.length;
          this.recalculateStats();
        },
        error: (error) => {
          this.events = [];
          this.totalElements = 0;
          this.recalculateStats();
          this.errorMessage = error?.error?.message || 'No se pudo cargar la auditoria.';
        },
      });
  }

  protected clearFilters(): void {
    this.selectedAction = '';
    this.selectedEntityType = '';
    this.actorEmail = '';
    this.areaId = '';
    this.processInstanceId = '';
    this.processKey = '';
    this.documentId = '';
    this.taskInstanceId = '';
    this.applyRange('today');
  }

  protected actionLabel(action?: string | null): string {
    return this.actionOptions.find((item) => item.value === action)?.label ?? this.humanize(action);
  }

  protected entityLabel(entityType?: string | null): string {
    return this.entityTypeOptions.find((item) => item.value === entityType)?.label ?? this.humanize(entityType);
  }

  protected eventTitle(event: AuditEvent): string {
    if (event.documentName) {
      return event.documentName;
    }
    if (event.taskName) {
      return event.taskName;
    }
    if (event.entityName) {
      return event.entityName;
    }
    return this.actionLabel(event.action);
  }

  protected eventContext(event: AuditEvent): string {
    const parts = [
      event.processKey ? `${event.processKey}${event.processVersion ? ` v${event.processVersion}` : ''}` : '',
      event.processInstanceId ? `Instancia ${this.shortId(event.processInstanceId)}` : '',
      event.areaName || event.areaId ? `Area ${event.areaName || this.shortId(event.areaId)}` : '',
    ].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Sin contexto BPM vinculado';
  }

  protected eventActor(event: AuditEvent): string {
    return event.actorName || event.actorEmail || 'Usuario no identificado';
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }
    return new Date(value).toLocaleString();
  }

  protected shortId(value?: string | null): string {
    if (!value) {
      return 'N/D';
    }
    return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  }

  protected goToDocument(event: AuditEvent): void {
    if (!event.documentId) {
      return;
    }
    void this.router.navigate(['/documents'], { queryParams: { documentId: event.documentId } });
  }

  protected goToTracking(event: AuditEvent): void {
    if (!event.processInstanceId) {
      return;
    }
    void this.router.navigate(['/process-instances', event.processInstanceId, 'tracking']);
  }

  protected goBack(): void {
    void this.router.navigate(['/admin']);
  }

  protected trackByEvent(_: number, event: AuditEvent): string {
    return event.id;
  }

  private humanize(value?: string | null): string {
    if (!value) {
      return 'Sin dato';
    }
    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
  }

  private toDatetimeLocal(date: Date): string {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  }

  private fromDatetimeLocal(value: string, endOfMinute = false): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    if (endOfMinute) {
      date.setSeconds(59, 999);
    }
    return date.toISOString();
  }

  private recalculateStats(): void {
    this.stats = {
      visible: Math.max(this.totalElements, this.events.length),
      documents: this.events.filter((event) => event.entityType === 'DOCUMENT').length,
      tasks: this.events.filter((event) => event.entityType === 'TASK').length,
      forms: this.events.filter((event) => event.entityType === 'FORM').length,
      alerts: this.events.filter((event) => event.action === 'DOCUMENT_REJECTED' || event.action === 'DOCUMENT_LOCKED').length,
    };
  }
}
