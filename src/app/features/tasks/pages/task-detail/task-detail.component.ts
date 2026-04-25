import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { ApiResponse } from '../../../../core/models/auth.models';
import {
  FormDefinition,
  FormFieldDefinition,
  FormFieldOptionDefinition,
  UploadedFileMetadata,
} from '../../../../core/models/form.models';
import { HistoryDisplayField, TaskExecutionLog } from '../../../../core/models/task-history.models';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { AuthService } from '../../../../core/services/auth.service';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { FormService } from '../../../../core/services/form.service';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit {
  private static readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly taskService = inject(TaskInstanceService);
  private readonly formService = inject(FormService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected task: TareaInstancia | null = null;
  protected isLoading = false;
  protected isCompleting = false;
  protected showTechnicalDetails = false;
  protected formDefinition: FormDefinition | null = null;
  protected formValues: Record<string, unknown> = {};
  protected fileUploadState: Record<string, { error: string }> = {};
  protected formMessage = '';
  protected formLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected historyEntries: TaskExecutionLog[] = [];
  protected historyLoading = false;
  protected historyMessage = '';
  private loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const navigationTask = history.state?.task as TareaInstancia | undefined;

    if (navigationTask?.id) {
      this.task = navigationTask;
      this.loadFormForTask(navigationTask);
      this.loadHistory(navigationTask.processInstanceId || '');
    }

    if (!id) {
      this.errorMessage = 'No se recibio el identificador de la tarea.';
      return;
    }

    this.loadTask(id);
  }

  protected goBack(): void {
    void this.router.navigate(['/tasks']);
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected getProcessLabel(): string {
    const processName = this.task?.nombreProceso?.trim();
    if (processName) {
      return processName;
    }

    const processId = this.task?.processDefinitionId?.trim();
    if (!processId) {
      return 'Proceso no identificado';
    }

    const [key] = processId.split(':');
    return key?.trim() || 'Proceso no identificado';
  }

  protected getInstanceShortLabel(): string {
    const instanceId = this.task?.processInstanceId?.trim();
    if (!instanceId) {
      return 'Instancia no identificada';
    }

    return `Instancia #${instanceId.slice(-6)}`;
  }

  protected getAreaLabel(): string {
    return this.task?.areaNombre?.trim() || 'Area no identificada';
  }

  protected get historyAvailable(): boolean {
    return this.historyEntries.length > 0;
  }

  protected openPlaceholderAction(): void {
    void this.completeTask();
  }

  protected toggleTechnicalDetails(): void {
    this.showTechnicalDetails = !this.showTechnicalDetails;
  }

  protected get processVersion(): number {
    const processDefinitionId = this.task?.processDefinitionId?.trim();
    if (!processDefinitionId) {
      return 1;
    }

    const parts = processDefinitionId.split(':');
    if (parts.length < 2) {
      return 1;
    }

    const version = Number(parts[1]);
    return Number.isFinite(version) && version > 0 ? version : 1;
  }

  protected get hasForm(): boolean {
    return !!this.formDefinition;
  }

  protected get canCompleteTask(): boolean {
    return this.isTaskTakenByCurrentUser();
  }

  protected get taskActionHint(): string {
    if (!this.task) {
      return '';
    }

    if (!this.task.assignee) {
      return 'Primero debes tomar la tarea para poder completar el formulario.';
    }

    if (!this.isTaskTakenByCurrentUser()) {
      return `La tarea fue tomada por ${this.task.assignee}.`;
    }

    if (this.hasForm && !this.isFormValid) {
      return 'Completa los campos obligatorios antes de finalizar la tarea.';
    }

    return 'Puedes enviar el formulario y completar la tarea.';
  }

  protected get isFormValid(): boolean {
    if (!this.formDefinition) {
      return true;
    }

    return (this.formDefinition.fields ?? []).every((field) => {
      if (!field.required) {
        return true;
      }

      if (field.type === 'file') {
        const fileMeta = this.getSelectedFileMetadata(field.name);
        const fileValue = this.getSelectedFile(field.name);
        return !!fileMeta?.secureUrl || !!fileMeta?.publicId || !!fileValue;
      }

      if (field.type === 'checkbox') {
        return this.formValues[field.name] === true;
      }

      if (field.type === 'checklist') {
        return this.getChecklistValues(field.name).length > 0;
      }

      const value = this.formValues[field.name];
      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      return true;
    });
  }

  protected get isAnyFileUploading(): boolean {
    return false;
  }

  protected isFieldMissing(field: FormFieldDefinition): boolean {
    if (!field.required) {
      return false;
    }

    if (field.type === 'file') {
      const fileMeta = this.getSelectedFileMetadata(field.name);
      const fileValue = this.getSelectedFile(field.name);
      return !fileMeta?.secureUrl && !fileMeta?.publicId && !fileValue;
    }

    if (field.type === 'checkbox') {
      return this.formValues[field.name] !== true;
    }

    if (field.type === 'checklist') {
      return this.getChecklistValues(field.name).length === 0;
    }

    const value = this.formValues[field.name];
    if (value === undefined || value === null) {
      return true;
    }

    return typeof value === 'string' ? value.trim().length === 0 : false;
  }

  protected getFieldValue(field: FormFieldDefinition): string | number | boolean | '' {
    const value = this.formValues[field.name];
    if (typeof value === 'boolean' || typeof value === 'number') {
      return value;
    }

    return typeof value === 'string' ? value : '';
  }

  protected setFieldValue(fieldName: string, value: unknown): void {
    this.formValues[fieldName] = value as never;
  }

  protected getFieldOptions(field: FormFieldDefinition): FormFieldOptionDefinition[] {
    if (field.optionItems?.length) {
      return field.optionItems;
    }

    return (field.options ?? []).map((option) => ({
      label: option,
      value: option,
    }));
  }

  protected getChecklistValues(fieldName: string): string[] {
    const value = this.formValues[fieldName];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  protected isChecklistOptionSelected(fieldName: string, optionValue: string): boolean {
    return this.getChecklistValues(fieldName).includes(optionValue);
  }

  protected toggleChecklistValue(fieldName: string, optionValue: string, checked: boolean): void {
    const currentValues = this.getChecklistValues(fieldName);
    const nextValues = checked
      ? Array.from(new Set([...currentValues, optionValue]))
      : currentValues.filter((value) => value !== optionValue);

    this.formValues[fieldName] = nextValues;
  }

  protected getSelectedFile(fieldName: string): File | null {
    const value = this.formValues[fieldName];
    return value instanceof File ? value : null;
  }

  protected getFieldFile(field: FormFieldDefinition): UploadedFileMetadata | null {
    const value = this.formValues[field.name];
    if (!value || typeof value !== 'object' || value instanceof File) {
      return null;
    }

    return value as UploadedFileMetadata;
  }

  protected getSelectedFileName(fieldName: string): string {
    const file = this.getSelectedFile(fieldName);
    if (file) {
      return file.name;
    }

    const metadata = this.getSelectedFileMetadata(fieldName);
    return metadata?.fileName || '';
  }

  protected getSelectedFileMetadata(fieldName: string): UploadedFileMetadata | null {
    const value = this.formValues[fieldName];
    if (!value || typeof value !== 'object' || value instanceof File) {
      return null;
    }

    return value as UploadedFileMetadata;
  }

  protected isTaskTakenByCurrentUser(): boolean {
    const user = this.authService.currentUser();
    if (!user?.email || !this.task?.assignee) {
      return false;
    }

    return user.email.trim().toLowerCase() === this.task.assignee.trim().toLowerCase();
  }

  protected fileUploadError(field: FormFieldDefinition): string {
    return this.fileUploadState[field.name]?.error || '';
  }

  protected getHistoryTaskLabel(entry: TaskExecutionLog): string {
    return entry.taskName?.trim() || entry.taskDefinitionKey?.trim() || 'Tarea sin nombre';
  }

  protected getHistoryUserLabel(entry: TaskExecutionLog): string {
    return entry.completedBy?.trim() || entry.assignedTo?.trim() || 'Usuario no identificado';
  }

  protected getHistoryFields(entry: TaskExecutionLog): HistoryDisplayField[] {
    const data = entry.formData ?? {};
    return Object.entries(data)
      .map(([key, value]) => this.mapHistoryField(key, value))
      .filter((field): field is HistoryDisplayField => !!field);
  }

  protected onFileSelected(field: FormFieldDefinition, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.size > TaskDetailComponent.MAX_UPLOAD_BYTES) {
      this.fileUploadState[field.name] = { error: 'El archivo supera el limite de 10 MB.' };
      this.cdr.detectChanges();
      if (input) {
        input.value = '';
      }
      return;
    }

    this.formValues[field.name] = file;
    this.fileUploadState[field.name] = { error: '' };
    this.cdr.detectChanges();
  }

  private loadTask(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.clearLoadingTimeout();
    this.loadingTimeoutId = setTimeout(() => {
      if (!this.task && this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'La carga del detalle tardo demasiado. Intenta refrescar la pagina.';
        this.cdr.detectChanges();
      }
    }, 15000);

    this.taskService
      .obtenerPorId(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.clearLoadingTimeout();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.task = response.data ?? this.task;
          if (this.task) {
            this.loadFormForTask(this.task);
            this.loadHistory(this.task.processInstanceId || '');
          }
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'No se pudo cargar el detalle de la tarea.';
          this.cdr.detectChanges();
        },
      });
  }

  private async completeTask(): Promise<void> {
    if (!this.task?.id || this.isCompleting) {
      return;
    }

    if (!this.isTaskTakenByCurrentUser()) {
      this.errorMessage = this.task?.assignee
        ? `La tarea fue tomada por ${this.task.assignee}.`
        : 'Primero debes tomar la tarea para poder completar el formulario.';
      this.cdr.detectChanges();
      return;
    }

    if (this.formDefinition && !this.isFormValid) {
      this.errorMessage = 'Completa los campos obligatorios del formulario antes de finalizar la tarea.';
      this.cdr.detectChanges();
      return;
    }

    this.isCompleting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const variables = this.formDefinition ? await this.buildVariablesPayload() : {};

      await firstValueFrom(this.taskService.completarTareaConVariables(this.task.id, variables));
      this.successMessage = 'La tarea se completo correctamente.';
      this.prependCurrentExecutionToHistory(variables);
      this.cdr.detectChanges();
      setTimeout(() => void this.router.navigate(['/tasks']), 900);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'No se pudo completar la tarea.';
      this.cdr.detectChanges();
    } finally {
      this.isCompleting = false;
      this.cdr.detectChanges();
    }
  }

  private loadFormForTask(task: TareaInstancia): void {
    const processKey = this.extractProcessKey(task.processDefinitionId);
    if (!processKey) {
      this.formDefinition = null;
      this.formMessage = 'Esta tarea no tiene formulario configurado.';
      this.cdr.detectChanges();
      return;
    }

    this.formLoading = true;
    this.formMessage = '';
    this.cdr.detectChanges();

    this.formService
      .obtenerFormulario(processKey, this.processVersion, task.taskDefinitionKey || '')
      .pipe(
        finalize(() => {
          this.formLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response: ApiResponse<FormDefinition>) => {
          this.formDefinition = response.data ?? null;
          this.formValues = {};
          this.fileUploadState = {};
          if (!this.formDefinition) {
            this.formMessage = 'Esta tarea no tiene formulario configurado.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.formDefinition = null;
          this.fileUploadState = {};
          this.formMessage = 'Esta tarea no tiene formulario configurado.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadHistory(processInstanceId: string): void {
    if (!processInstanceId) {
      this.historyEntries = [];
      this.historyMessage = 'Esta tarea todavia no tiene historial disponible.';
      this.cdr.detectChanges();
      return;
    }

    this.historyLoading = true;
    this.historyMessage = '';
    this.cdr.detectChanges();

    this.taskService
      .obtenerHistorial(processInstanceId)
      .pipe(
        finalize(() => {
          this.historyLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.historyEntries = response.data ?? [];
          this.historyMessage = this.historyEntries.length
            ? ''
            : 'Aun no hay tareas completadas en esta instancia.';
          this.cdr.detectChanges();
        },
        error: () => {
          this.historyEntries = [];
          this.historyMessage = 'No se pudo cargar el historial de la instancia.';
          this.cdr.detectChanges();
        },
      });
  }

  private extractProcessKey(processDefinitionId?: string | null): string {
    const raw = processDefinitionId?.trim();
    if (!raw) {
      return '';
    }

    const [key] = raw.split(':');
    return key?.trim() || '';
  }

  private async buildVariablesPayload(): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {};
    if (!this.formDefinition) {
      return variables;
    }

    for (const field of this.formDefinition.fields ?? []) {
      const value = this.formValues[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (field.type === 'checklist' && Array.isArray(value) && value.length === 0) {
        continue;
      }

      if (field.type === 'file') {
        variables[field.name] = await this.uploadFileValue(value as File | UploadedFileMetadata | null);
        continue;
      }

      variables[field.name] = this.normalizeVariableValue(field, value);
    }

    return variables;
  }

  private async uploadFileValue(value: File | UploadedFileMetadata | null): Promise<UploadedFileMetadata | null> {
    if (!value) {
      return null;
    }

    if (!(value instanceof File)) {
      return value;
    }

    const response = await firstValueFrom(this.fileUploadService.upload(value));
    return response.data ?? {
      fileName: value.name,
      secureUrl: '',
      publicId: '',
      mimeType: value.type,
      size: value.size,
      resourceType: 'auto',
    };
  }

  private normalizeVariableValue(field: FormFieldDefinition, value: unknown): unknown {
    if (field.type === 'number') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }

    if (field.type === 'date') {
      return String(value);
    }

    if (field.type === 'checklist') {
      return JSON.stringify(Array.isArray(value) ? value : []);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value;
  }

  private mapHistoryField(key: string, value: unknown): HistoryDisplayField | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const file = this.asUploadedFile(value);
    if (file) {
      return {
        key,
        label: this.formatFieldLabel(key),
        value: file.fileName || 'Archivo adjunto',
        isFile: true,
        file,
      };
    }

    return {
      key,
      label: this.formatFieldLabel(key),
      value: this.formatHistoryValue(value),
      isFile: false,
    };
  }

  private asUploadedFile(value: unknown): UploadedFileMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = value as Partial<UploadedFileMetadata>;
    if (!candidate.fileName && !candidate.secureUrl && !candidate.publicId) {
      return null;
    }

    return {
      fileName: candidate.fileName || 'Archivo',
      secureUrl: candidate.secureUrl || '',
      publicId: candidate.publicId || '',
      mimeType: candidate.mimeType || null,
      size: candidate.size || null,
      resourceType: candidate.resourceType || null,
    };
  }

  private formatFieldLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  }

  private formatHistoryValue(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Si' : 'No';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatHistoryValue(item)).join(', ');
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '';
      }

      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          return this.formatHistoryValue(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([entryKey, entryValue]) => `${this.formatFieldLabel(entryKey)}: ${this.formatHistoryValue(entryValue)}`)
        .join(' | ');
    }

    return String(value);
  }

  private prependCurrentExecutionToHistory(variables: Record<string, unknown>): void {
    if (!this.task?.processInstanceId) {
      return;
    }

    const currentUser = this.authService.currentUser()?.email || this.task.assignee || '';
    const now = new Date().toISOString();
    this.historyEntries = [
      ...this.historyEntries,
      {
        id: `tmp-${now}`,
        processInstanceId: this.task.processInstanceId,
        processDefinitionId: this.task.processDefinitionId || '',
        processKey: this.extractProcessKey(this.task.processDefinitionId),
        processVersion: this.processVersion,
        taskDefinitionKey: this.task.taskDefinitionKey,
        taskName: this.task.name || this.task.nombreTarea,
        areaId: this.task.areaId,
        areaNombre: this.task.areaNombre,
        assignedTo: this.task.assignee || this.task.assignedTo,
        completedBy: currentUser,
        formData: variables,
        createdAt: this.task.created || this.task.createdAt,
        completedAt: now,
      },
    ];
    this.historyMessage = '';
  }

  private clearLoadingTimeout(): void {
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }
}
