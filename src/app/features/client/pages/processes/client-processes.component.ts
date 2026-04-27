import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import {
  ClientProcessListItem,
  ClientProcessStartPreview,
} from '../../../../core/models/process.models';
import {
  FormDefinition,
  FormFieldDefinition,
  FormFieldOptionDefinition,
  UploadedFileMetadata,
} from '../../../../core/models/form.models';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { ProcessService } from '../../../../core/services/process.service';

@Component({
  selector: 'app-client-processes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-processes.component.html',
  styleUrl: './client-processes.component.css',
})
export class ClientProcessesComponent implements OnInit {
  private static readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  private readonly processService = inject(ProcessService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected errorMessage = '';
  protected processes: ClientProcessListItem[] = [];

  protected selectedProcess: ClientProcessListItem | null = null;
  protected previewLoading = false;
  protected previewError = '';

  protected startPreview: ClientProcessStartPreview | null = null;
  protected isStartFormOpen = false;
  protected startSubmitting = false;
  protected startFormError = '';
  protected startFormValues: Record<string, unknown> = {};
  protected startFileState: Record<string, { error: string }> = {};

  ngOnInit(): void {
    this.cargarProcesos();
  }

  cargarProcesos(): void {
    this.loading = true;
    this.errorMessage = '';
    this.processes = [];
    this.selectedProcess = null;
    this.previewError = '';
    this.isStartFormOpen = false;
    this.startPreview = null;
    this.cdr.detectChanges();

    this.processService
      .listarProcesosCliente()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.processes = Array.isArray(response.data) ? response.data : [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.processes = [];
          this.errorMessage = error?.error?.message || 'No se pudieron cargar los tramites disponibles.';
          this.cdr.detectChanges();
        },
      });
  }

  trackByProcessId(_: number, item: ClientProcessListItem): string {
    return item.processId;
  }

  isProcessStarting(processId: string): boolean {
    return this.previewLoading || this.startSubmitting || (this.selectedProcess?.processId === processId && !this.isStartFormOpen);
  }

  get startFields(): FormFieldDefinition[] {
    return [...(this.startFormDefinition?.fields ?? [])].sort((a, b) => a.order - b.order);
  }

  formatDescription(description?: string | null): string {
    const value = (description ?? '').trim();
    return value || 'Sin descripcion disponible.';
  }

  openStartConfirmation(process: ClientProcessListItem): void {
    this.selectedProcess = process;
    this.previewError = '';
    this.startFormError = '';
    this.startPreview = null;
    this.isStartFormOpen = false;
    this.startFormValues = {};
    this.startFileState = {};
    this.cdr.detectChanges();
  }

  closeStartConfirmation(): void {
    if (this.previewLoading || this.startSubmitting) {
      return;
    }

    this.selectedProcess = null;
    this.previewError = '';
    this.startFormError = '';
    this.startPreview = null;
    this.isStartFormOpen = false;
    this.cdr.detectChanges();
  }

  async confirmStart(): Promise<void> {
    await this.prepareStartPreview();
  }

  async prepareStartPreview(): Promise<void> {
    if (!this.selectedProcess || this.previewLoading) {
      return;
    }

    const process = this.selectedProcess;
    this.previewLoading = true;
    this.previewError = '';
    this.cdr.detectChanges();

    this.processService
      .obtenerVistaInicioTramite(process.processId)
      .pipe(
        finalize(() => {
          this.previewLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.startPreview = response.data ?? null;
          this.startFormValues = {};
          this.startFileState = {};
          this.selectedProcess = null;
          this.isStartFormOpen = true;
          this.startFormError = '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.previewError = error?.error?.message || 'No se pudo cargar el formulario inicial del tramite.';
          this.startPreview = null;
          this.isStartFormOpen = false;
          this.cdr.detectChanges();
        },
      });
  }

  closeStartForm(): void {
    if (this.startSubmitting) {
      return;
    }

    this.isStartFormOpen = false;
    this.startPreview = null;
    this.startFormError = '';
    this.startFormValues = {};
    this.startFileState = {};
    this.selectedProcess = null;
    this.cdr.detectChanges();
  }

  get hasStartForm(): boolean {
    return !!this.startPreview?.formDefinition;
  }

  get startFormDefinition(): FormDefinition | null {
    return this.startPreview?.formDefinition ?? null;
  }

  get startTitle(): string {
    return this.startPreview?.firstTaskName?.trim() || this.startPreview?.processName?.trim() || 'Completar tramite';
  }

  getStartFieldValue(field: FormFieldDefinition): string | number | boolean | '' {
    const value = this.startFormValues[field.name];
    if (typeof value === 'boolean' || typeof value === 'number') {
      return value;
    }

    return typeof value === 'string' ? value : '';
  }

  setStartFieldValue(fieldName: string, value: unknown): void {
    this.startFormValues[fieldName] = value as never;
  }

  getStartFieldOptions(field: FormFieldDefinition): FormFieldOptionDefinition[] {
    if (field.optionItems?.length) {
      return field.optionItems;
    }

    return (field.options ?? []).map((option) => ({ label: option, value: option }));
  }

  getStartChecklistValues(fieldName: string): string[] {
    const value = this.startFormValues[fieldName];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  isStartChecklistOptionSelected(fieldName: string, optionValue: string): boolean {
    return this.getStartChecklistValues(fieldName).includes(optionValue);
  }

  toggleStartChecklistValue(fieldName: string, optionValue: string, checked: boolean): void {
    const currentValues = this.getStartChecklistValues(fieldName);
    const nextValues = checked
      ? Array.from(new Set([...currentValues, optionValue]))
      : currentValues.filter((value) => value !== optionValue);

    this.startFormValues[fieldName] = nextValues;
  }

  getStartSelectedFile(fieldName: string): File | null {
    const value = this.startFormValues[fieldName];
    return value instanceof File ? value : null;
  }

  getStartSelectedFileMetadata(fieldName: string): UploadedFileMetadata | null {
    const value = this.startFormValues[fieldName];
    if (!value || typeof value !== 'object' || value instanceof File) {
      return null;
    }

    return value as UploadedFileMetadata;
  }

  getStartSelectedFileName(fieldName: string): string {
    const file = this.getStartSelectedFile(fieldName);
    if (file) {
      return file.name;
    }

    const metadata = this.getStartSelectedFileMetadata(fieldName);
    return metadata?.fileName || '';
  }

  startFileUploadError(field: FormFieldDefinition): string {
    return this.startFileState[field.name]?.error || '';
  }

  isStartFieldMissing(field: FormFieldDefinition): boolean {
    if (!field.required) {
      return false;
    }

    if (field.type === 'file') {
      const fileMeta = this.getStartSelectedFileMetadata(field.name);
      const fileValue = this.getStartSelectedFile(field.name);
      return !fileMeta?.secureUrl && !fileMeta?.publicId && !fileValue;
    }

    if (field.type === 'checkbox') {
      return this.startFormValues[field.name] !== true;
    }

    if (field.type === 'checklist') {
      return this.getStartChecklistValues(field.name).length === 0;
    }

    const value = this.startFormValues[field.name];
    if (value === undefined || value === null) {
      return true;
    }

    return typeof value === 'string' ? value.trim().length === 0 : false;
  }

  async onStartFileSelected(field: FormFieldDefinition, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.size > ClientProcessesComponent.MAX_UPLOAD_BYTES) {
      this.startFileState[field.name] = { error: 'El archivo supera el tamaño maximo permitido.' };
      this.cdr.detectChanges();
      if (input) {
        input.value = '';
      }
      return;
    }

    this.startFormValues[field.name] = file;
    this.startFileState[field.name] = { error: '' };
    this.cdr.detectChanges();
  }

  async submitStartForm(): Promise<void> {
    if (!this.startPreview || this.startSubmitting) {
      return;
    }

    if (this.startFormDefinition && !this.isStartFormValid()) {
      this.startFormError = 'Completa los campos obligatorios antes de continuar.';
      this.cdr.detectChanges();
      return;
    }

    this.startSubmitting = true;
    this.startFormError = '';
    this.cdr.detectChanges();

    try {
      const variables = this.startFormDefinition ? await this.buildStartVariablesPayload() : {};
      await firstValueFrom(
        this.processService.iniciarTramiteCliente(this.startPreview.processId, { variables }),
      );

      this.isStartFormOpen = false;
      this.startPreview = null;
      this.startFormValues = {};
      this.startFileState = {};
      await this.router.navigate(['/client/instances']);
    } catch (error: any) {
      this.startFormError = error?.error?.message || 'No se pudo iniciar el tramite.';
    } finally {
      this.startSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  private isStartFormValid(): boolean {
    if (!this.startFormDefinition) {
      return true;
    }

    return (this.startFormDefinition.fields ?? []).every((field) => !this.isStartFieldMissing(field));
  }

  private async buildStartVariablesPayload(): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {};
    if (!this.startFormDefinition) {
      return variables;
    }

    for (const field of this.startFormDefinition.fields ?? []) {
      const value = this.startFormValues[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (field.type === 'checklist' && Array.isArray(value) && value.length === 0) {
        continue;
      }

      if (field.type === 'file') {
        variables[field.name] = await this.uploadStartFileValue(value as File | UploadedFileMetadata | null);
        continue;
      }

      variables[field.name] = this.normalizeStartVariableValue(field, value);
    }

    return variables;
  }

  private async uploadStartFileValue(value: File | UploadedFileMetadata | null): Promise<UploadedFileMetadata | null> {
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

  private normalizeStartVariableValue(field: FormFieldDefinition, value: unknown): unknown {
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
}
