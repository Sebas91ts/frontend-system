import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { ClientTaskCompleteResponse, ClientTaskFormResponse, ClientTaskListItem } from '../../../../core/models/client-task.models';
import { FormDefinition, FormFieldDefinition, FormFieldOptionDefinition, UploadedFileMetadata } from '../../../../core/models/form.models';
import { ClientTaskService } from '../../../../core/services/client-task.service';

@Component({
  selector: 'app-client-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-tasks.component.html',
  styleUrl: './client-tasks.component.css',
})
export class ClientTasksComponent implements OnInit {
  private static readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  private readonly taskService = inject(ClientTaskService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected errorMessage = '';
  protected tasks: ClientTaskListItem[] = [];

  protected selectedTask: ClientTaskListItem | null = null;
  protected selectedTaskForm: ClientTaskFormResponse | null = null;
  protected formLoading = false;
  protected formSubmitting = false;
  protected formError = '';
  protected fileStates: Record<string, { error: string }> = {};
  protected formValues: Record<string, unknown> = {};

  ngOnInit(): void {
    this.loadTasks();
  }

  get hasTasks(): boolean {
    return this.tasks.length > 0;
  }

  get formDefinition(): FormDefinition | null {
    return this.selectedTaskForm?.formDefinition ?? null;
  }

  get formFields(): FormFieldDefinition[] {
    return [...(this.formDefinition?.fields ?? [])].sort((a, b) => a.order - b.order);
  }

  loadTasks(): void {
    this.loading = true;
    this.errorMessage = '';
    this.tasks = [];
    this.cdr.detectChanges();

    this.taskService
      .listarTareas()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.tasks = Array.isArray(response.data) ? response.data : [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.tasks = [];
          this.errorMessage = error?.error?.message || 'No se pudieron cargar tus tareas.';
          this.cdr.detectChanges();
        },
      });
  }

  trackByTaskId(_: number, item: ClientTaskListItem): string {
    return item.taskId;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  formatDescription(text?: string | null): string {
    const value = (text ?? '').trim();
    return value || 'Pendiente de tu parte.';
  }

  openTask(task: ClientTaskListItem): void {
    this.selectedTask = task;
    this.selectedTaskForm = null;
    this.formValues = {};
    this.fileStates = {};
    this.formError = '';
    this.formLoading = true;
    this.cdr.detectChanges();

    this.taskService
      .obtenerFormulario(task.taskId)
      .pipe(
        finalize(() => {
          this.formLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.selectedTaskForm = response.data ?? null;
          this.formValues = { ...(this.selectedTaskForm?.currentValues ?? {}) };
          this.fileStates = {};
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.formError = error?.error?.message || 'No se pudo cargar el formulario de la tarea.';
          this.selectedTaskForm = null;
          this.cdr.detectChanges();
        },
      });
  }

  closeTask(): void {
    if (this.formSubmitting) {
      return;
    }

    this.selectedTask = null;
    this.selectedTaskForm = null;
    this.formValues = {};
    this.fileStates = {};
    this.formError = '';
    this.cdr.detectChanges();
  }

  isTaskPending(task: ClientTaskListItem): boolean {
    return !!task.assignedToClient || !task.assignee;
  }

  getFieldValue(field: FormFieldDefinition): string | number | boolean | '' {
    const value = this.formValues[field.name];
    if (typeof value === 'boolean' || typeof value === 'number') {
      return value;
    }

    return typeof value === 'string' ? value : '';
  }

  setFieldValue(fieldName: string, value: unknown): void {
    this.formValues[fieldName] = value as never;
  }

  getFieldOptions(field: FormFieldDefinition): FormFieldOptionDefinition[] {
    if (field.optionItems?.length) {
      return field.optionItems;
    }

    return (field.options ?? []).map((option) => ({ label: option, value: option }));
  }

  getChecklistValues(fieldName: string): string[] {
    const value = this.formValues[fieldName];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  isChecklistOptionSelected(fieldName: string, optionValue: string): boolean {
    return this.getChecklistValues(fieldName).includes(optionValue);
  }

  toggleChecklistValue(fieldName: string, optionValue: string, checked: boolean): void {
    const currentValues = this.getChecklistValues(fieldName);
    const nextValues = checked
      ? Array.from(new Set([...currentValues, optionValue]))
      : currentValues.filter((value) => value !== optionValue);

    this.formValues[fieldName] = nextValues;
  }

  getSelectedFile(fieldName: string): File | null {
    const value = this.formValues[fieldName];
    return value instanceof File ? value : null;
  }

  getSelectedFileMetadata(fieldName: string): UploadedFileMetadata | null {
    const value = this.formValues[fieldName];
    if (!value || typeof value !== 'object' || value instanceof File) {
      return null;
    }

    return value as UploadedFileMetadata;
  }

  getSelectedFileName(fieldName: string): string {
    const file = this.getSelectedFile(fieldName);
    if (file) {
      return file.name;
    }

    const metadata = this.getSelectedFileMetadata(fieldName);
    return metadata?.fileName || '';
  }

  onFileSelected(field: FormFieldDefinition, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.size > ClientTasksComponent.MAX_UPLOAD_BYTES) {
      this.fileStates[field.name] = { error: 'El archivo supera el tamaño maximo permitido.' };
      this.cdr.detectChanges();
      if (input) {
        input.value = '';
      }
      return;
    }

    this.formValues[field.name] = file;
    this.fileStates[field.name] = { error: '' };
    this.cdr.detectChanges();
  }

  fileUploadError(field: FormFieldDefinition): string {
    return this.fileStates[field.name]?.error || '';
  }

  isFieldMissing(field: FormFieldDefinition): boolean {
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

  get currentTaskTitle(): string {
    return this.selectedTaskForm?.taskName?.trim()
      || this.selectedTask?.taskName?.trim()
      || 'Completar tarea';
  }

  get currentProcessTitle(): string {
    return this.selectedTaskForm?.processName?.trim()
      || this.selectedTask?.processName?.trim()
      || 'Tramite';
  }

  get currentAreaTitle(): string {
    return this.selectedTaskForm?.areaName?.trim()
      || this.selectedTask?.areaName?.trim()
      || 'Pendiente de tu parte';
  }

  get hasForm(): boolean {
    return !!this.formDefinition;
  }

  async submitTask(): Promise<void> {
    if (!this.selectedTask || this.formSubmitting) {
      return;
    }

    if (this.hasForm && !this.isFormValid()) {
      this.formError = 'Completa los campos obligatorios antes de continuar.';
      this.cdr.detectChanges();
      return;
    }

    this.formSubmitting = true;
    this.formError = '';
    this.cdr.detectChanges();

    try {
      const payload = await this.buildPayload();
      await firstValueFrom(this.taskService.completarTarea(this.selectedTask.taskId, payload));
      await this.router.navigate(['/client/instances', this.selectedTask.processInstanceId, 'tracking']);
    } catch (error: any) {
      this.formError = error?.error?.message || 'No se pudo completar la tarea.';
      this.cdr.detectChanges();
    } finally {
      this.formSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  private isFormValid(): boolean {
    if (!this.formDefinition) {
      return true;
    }

    return (this.formDefinition.fields ?? []).every((field) => !this.isFieldMissing(field));
  }

  private async buildPayload(): Promise<FormData> {
    const payload = new FormData();
    const jsonPayload: Record<string, unknown> = {};

    for (const field of this.formFields) {
      const value = this.formValues[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (field.type === 'file') {
        if (value instanceof File) {
          payload.append(field.name, value, value.name);
          continue;
        }
      }

      jsonPayload[field.name] = this.normalizeFieldValue(field, value);
    }

    payload.append('formData', JSON.stringify(jsonPayload));
    return payload;
  }

  private normalizeFieldValue(field: FormFieldDefinition, value: unknown): unknown {
    if (field.type === 'number') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }

    if (field.type === 'date') {
      return String(value);
    }

    if (field.type === 'checklist') {
      return Array.isArray(value) ? value : [];
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value;
  }
}
