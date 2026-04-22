import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, of } from 'rxjs';
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
  protected viewMode: 'mine' | 'area' | 'all' = 'mine';
  protected myTasksCount = 0;
  protected myAreaTasksCount = 0;
  protected allTasksCount = 0;

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private queryParamsSubscription?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.queryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      this.viewMode = mode === 'area' ? 'area' : mode === 'all' ? 'all' : 'mine';
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

  protected async showMine(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'mine' } });
  }

  protected async showArea(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'area' } });
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

  protected canClaimTask(task: TareaInstancia): boolean {
    const user = this.authService.currentUser();
    if (!user?.areaId || !task?.areaId || task.assignee) {
      return false;
    }

    return user.areaId.trim().toLowerCase() === task.areaId.trim().toLowerCase();
  }

  protected getClaimHint(task: TareaInstancia): string {
    if (task.assignee) {
      return `Asignada a ${this.getAssigneeLabel(task)}`;
    }

    const user = this.authService.currentUser();
    if (!task.areaId) {
      return 'Area no identificada';
    }

    if (!user?.areaId) {
      return `Solo usuarios del area ${this.getAreaLabel(task)} pueden tomar esta tarea`;
    }

    if (user.areaId.trim().toLowerCase() !== task.areaId.trim().toLowerCase()) {
      return `Solo usuarios del area ${this.getAreaLabel(task)} pueden tomar esta tarea`;
    }

    return 'Puedes tomar esta tarea';
  }

  protected get filterSummary(): string {
    if (this.viewMode === 'all') {
      return 'Todas las tareas de Camunda';
    }

    if (this.viewMode === 'area') {
      return 'Tareas de mi area';
    }

    return 'Mis tareas';
  }

  protected get showAllTab(): boolean {
    return this.authService.isAdmin();
  }

  protected get myTasksTabLabel(): string {
    return `Mis tareas${this.myTasksCount > 0 ? ` (${this.myTasksCount})` : ''}`;
  }

  protected get myAreaTabLabel(): string {
    return `Tareas de mi area${this.myAreaTasksCount > 0 ? ` (${this.myAreaTasksCount})` : ''}`;
  }

  protected get allTasksTabLabel(): string {
    return `Todas${this.allTasksCount > 0 ? ` (${this.allTasksCount})` : ''}`;
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

  protected takeTask(task: TareaInstancia): void {
    if (!task.id || !this.canClaimTask(task)) {
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.taskService
      .tomarTarea(task.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.showFeedback(`La tarea "${this.getTaskName(task)}" fue tomada correctamente.`, 'success');
          void this.loadTasks();
        },
        error: (error: any) => {
          this.showFeedback(error?.error?.message || 'No se pudo tomar la tarea.', 'error');
        },
      });
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

    const request$ = this.viewMode === 'all'
      ? this.taskService.listarTodasCamunda()
      : this.viewMode === 'area'
        ? this.taskService.listarTareasDeMiArea()
        : this.taskService.listarMisTareas();

    forkJoin({
      current: request$,
      mine: this.taskService.listarMisTareas().pipe(finalize(() => undefined)),
      area: this.taskService.listarTareasDeMiArea().pipe(finalize(() => undefined)),
      all: this.showAllTab ? this.taskService.listarTodasCamunda().pipe(finalize(() => undefined)) : of(null),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          const tasks = result.current?.data ?? [];
          this.tasks = tasks;
          this.myTasksCount = result.mine?.data?.length ?? 0;
          this.myAreaTasksCount = result.area?.data?.length ?? 0;
          this.allTasksCount = this.showAllTab ? (result.all?.data?.length ?? 0) : 0;
          this.showFeedback(`Se cargaron ${tasks.length} tareas activas de Camunda.`, 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.tasks = [];
          this.myTasksCount = 0;
          this.myAreaTasksCount = 0;
          this.allTasksCount = 0;
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
