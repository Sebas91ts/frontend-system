import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { FormDefinition, FormFieldDefinition } from '../../../../core/models/form.models';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { FormService } from '../../../../core/services/form.service';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { ApiResponse } from '../../../../core/models/auth.models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly taskService = inject(TaskInstanceService);
  private readonly formService = inject(FormService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected task: TareaInstancia | null = null;
  protected isLoading = false;
  protected isCompleting = false;
  protected showTechnicalDetails = false;
  protected formDefinition: FormDefinition | null = null;
  protected formValues: Record<string, unknown> = {};
  protected formMessage = '';
  protected formLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  private loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const navigationTask = history.state?.task as TareaInstancia | undefined;

    if (navigationTask?.id) {
      this.task = navigationTask;
      void this.loadFormForTask(navigationTask);
    }

    if (!id) {
      this.errorMessage = 'No se recibió el identificador de la tarea.';
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
    return this.task?.areaNombre?.trim() || 'Área no identificada';
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

  protected get isFormValid(): boolean {
    if (!this.formDefinition) {
      return true;
    }

    return (this.formDefinition.fields ?? []).every((field) => {
      if (!field.required) {
        return true;
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

  protected isFieldMissing(field: FormFieldDefinition): boolean {
    if (!field.required) {
      return false;
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

  private loadTask(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.clearLoadingTimeout();
    this.loadingTimeoutId = setTimeout(() => {
      if (!this.task && this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'La carga del detalle tardó demasiado. Intenta refrescar la página.';
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
            void this.loadFormForTask(this.task);
          }
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'No se pudo cargar el detalle de la tarea.';
          this.cdr.detectChanges();
        },
      });
  }

  private completeTask(): void {
    if (!this.task?.id || this.isCompleting) {
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

    const variables = this.formDefinition
      ? this.buildVariablesPayload()
      : {};

    this.taskService
      .completarTareaConVariables(this.task.id, variables)
      .pipe(
        finalize(() => {
          this.isCompleting = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = 'La tarea se completó correctamente.';
          this.cdr.detectChanges();
          setTimeout(() => void this.router.navigate(['/tasks']), 900);
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'No se pudo completar la tarea.';
          this.cdr.detectChanges();
        },
      });
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
          if (!this.formDefinition) {
            this.formMessage = 'Esta tarea no tiene formulario configurado.';
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.formDefinition = null;
          this.formMessage = 'Esta tarea no tiene formulario configurado.';
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

  private buildVariablesPayload(): Record<string, unknown> {
    const variables: Record<string, unknown> = {};
    if (!this.formDefinition) {
      return variables;
    }

    for (const field of this.formDefinition.fields ?? []) {
      const value = this.formValues[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      variables[field.name] = this.normalizeVariableValue(field, value);
    }

    return variables;
  }

  private normalizeVariableValue(field: FormFieldDefinition, value: unknown): unknown {
    if (field.type === 'number') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }

    if (field.type === 'date') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return value;
  }

  private clearLoadingTimeout(): void {
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }
}
