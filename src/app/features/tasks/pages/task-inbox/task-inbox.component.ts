import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-task-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-inbox.component.html',
  styleUrl: './task-inbox.component.css',
})
export class TaskInboxComponent implements OnInit, OnDestroy {
  private readonly taskService = inject(TaskInstanceService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected tasks: TareaInstancia[] = [];
  protected isLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected filterMode: 'pending' | 'all' = 'pending';

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private queryParamsSubscription?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.queryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      this.filterMode = mode === 'all' ? 'all' : 'pending';
      void this.loadTasks();
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSubscription?.unsubscribe();
    this.clearFeedbackTimer();
  }

  protected async refreshTasks(): Promise<void> {
    await this.loadTasks();
  }

  protected async showPending(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'pending' } });
  }

  protected async showAll(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'all' } });
  }

  protected goBack(): void {
    const isAdmin = this.authService.isAdmin();
    void this.router.navigate([isAdmin ? '/admin' : '/user']);
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected getProcessLabel(task: TareaInstancia): string {
    const processName = task.nombreProceso?.trim();
    if (processName) {
      return processName;
    }

    const processId = task.processDefinitionId?.trim();
    if (!processId) {
      return 'Proceso no identificado';
    }

    const [key] = processId.split(':');
    return key?.trim() || 'Proceso no identificado';
  }

  protected getTaskLabel(task: TareaInstancia): string {
    return task.name?.trim() || 'Tarea sin nombre';
  }

  protected getInstanceShortLabel(task: TareaInstancia): string {
    const instanceId = task.processInstanceId?.trim();
    if (!instanceId) {
      return 'Instancia no identificada';
    }

    return `Instancia #${instanceId.slice(-6)}`;
  }

  protected getAssigneeLabel(task: TareaInstancia): string {
    return task.assignee?.trim() || 'Sin asignar';
  }

  protected getAreaLabel(task: TareaInstancia): string {
    return task.areaNombre?.trim() || 'Área no identificada';
  }

  protected get filterSummary(): string {
    return this.filterMode === 'all' ? 'Todas las tareas de Camunda' : 'Tareas pendientes de Camunda';
  }

  protected get processOptions(): string[] {
    const values = this.tasks
      .map((task) => task.processDefinitionId?.trim())
      .filter((value): value is string => !!value);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }

  protected get instanceOptions(): TareaInstancia[] {
    const seen = new Set<string>();
    return this.tasks.filter((task) => {
      const id = task.processInstanceId ?? '';
      if (!id || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });
  }

  protected getInstanceLabel(task: TareaInstancia): string {
    return this.getInstanceShortLabel(task);
  }

  protected openTask(task: TareaInstancia): void {
    void this.router.navigate(['/tasks', task.id], { state: { task } });
  }

  protected trackByInstance(_: number, task: TareaInstancia): string {
    return task.processInstanceId ?? task.id;
  }

  protected async completeTask(task: TareaInstancia): Promise<void> {
    if (!task.id) {
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.taskService
      .completarTarea(task.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.showFeedback(`La tarea "${this.getTaskName(task)}" se completó correctamente.`, 'success');
          void this.loadTasks();
        },
        error: (error: any) => {
          this.showFeedback(error?.error?.message || 'No se pudo completar la tarea.', 'error');
        },
      });
  }

  private async loadTasks(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.taskService
      .listarTodas()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const tasks = response?.data ?? [];
          this.tasks = this.filterMode === 'pending'
            ? tasks.filter((task) => (task.id ? true : false))
            : tasks;
          this.showFeedback(`Se cargaron ${tasks.length} tareas activas de Camunda.`, 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.tasks = [];
          this.showFeedback(error?.error?.message || 'No se pudieron cargar las tareas de Camunda.', 'error');
          this.cdr.detectChanges();
        },
      });
  }

  private getTaskName(task: TareaInstancia): string {
    return task.name || task.nombreTarea || 'Tarea sin nombre';
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.clearFeedbackTimer();

    if (type === 'success') {
      this.successMessage = message;
      this.errorMessage = '';
    } else {
      this.errorMessage = message;
      this.successMessage = '';
    }

    this.feedbackTimer = setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3500);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }
}
