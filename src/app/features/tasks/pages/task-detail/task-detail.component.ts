import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { TareaInstancia } from '../../../../core/models/task-instance.models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly taskService = inject(TaskInstanceService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected task: TareaInstancia | null = null;
  protected isLoading = false;
  protected isCompleting = false;
  protected showTechnicalDetails = false;
  protected errorMessage = '';
  protected successMessage = '';
  private loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const navigationTask = history.state?.task as TareaInstancia | undefined;

    if (navigationTask?.id) {
      this.task = navigationTask;
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

  protected openPlaceholderAction(): void {
    void this.completeTask();
  }

  protected toggleTechnicalDetails(): void {
    this.showTechnicalDetails = !this.showTechnicalDetails;
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

    this.isCompleting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.taskService
      .completarTarea(this.task.id)
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

  private clearLoadingTimeout(): void {
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }
}
