import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Area } from '../../../../core/models/area.models';
import { AreaService } from '../../../../core/services/area.service';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { AuthService } from '../../../../core/services/auth.service';

type InboxFilterMode = 'pending' | 'instance' | 'area' | 'user' | 'process' | 'all';

@Component({
  selector: 'app-task-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-inbox.component.html',
  styleUrl: './task-inbox.component.css',
})
export class TaskInboxComponent implements OnInit, OnDestroy {
  private readonly taskService = inject(TaskInstanceService);
  private readonly areaService = inject(AreaService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected tasks: TareaInstancia[] = [];
  protected allTasks: TareaInstancia[] = [];
  protected areas: Area[] = [];
  protected isLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected filterMode: InboxFilterMode = 'pending';
  protected processInstanceId = '';
  protected areaId = '';
  protected assignedTo = '';
  protected selectedProcessName = '';
  protected selectedInstanceId = '';
  protected selectedAreaId = '';

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private queryParamsSubscription?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.queryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const processInstanceId = params.get('processInstanceId') ?? '';
      const areaId = params.get('areaId') ?? '';
      const assignedTo = params.get('assignedTo') ?? '';
      const processName = params.get('processName') ?? '';
      const mode = params.get('mode') as InboxFilterMode | null;

      this.processInstanceId = processInstanceId;
      this.areaId = areaId;
      this.assignedTo = assignedTo;
      this.selectedProcessName = processName;
      this.selectedInstanceId = processInstanceId;
      this.selectedAreaId = areaId;

      this.filterMode = this.resolveMode(mode, processInstanceId, areaId, assignedTo, processName);
      void this.loadAreas();
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

  protected async applyFriendlyFilters(): Promise<void> {
    const queryParams: Record<string, string> = {};

    if (this.selectedProcessName) {
      queryParams['processName'] = this.selectedProcessName;
    }

    if (this.selectedInstanceId) {
      queryParams['processInstanceId'] = this.selectedInstanceId;
    }

    if (this.selectedAreaId) {
      queryParams['areaId'] = this.selectedAreaId;
    }

    if (this.selectedAreaId) {
      queryParams['mode'] = 'area';
    } else if (this.selectedInstanceId) {
      queryParams['mode'] = 'instance';
    } else if (this.selectedProcessName) {
      queryParams['mode'] = 'process';
    } else {
      queryParams['mode'] = 'pending';
    }

    await this.router.navigate(['/tasks'], { queryParams });
  }

  protected async clearFilters(): Promise<void> {
    this.selectedProcessName = '';
    this.selectedInstanceId = '';
    this.selectedAreaId = '';
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'pending' } });
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

  protected get filterSummary(): string {
    if (this.selectedProcessName && this.selectedInstanceId) {
      return `${this.selectedProcessName} · Instancia ${this.selectedInstanceId}`;
    }

    if (this.selectedProcessName) {
      return this.selectedProcessName;
    }

    if (this.selectedAreaId) {
      const area = this.areas.find((item) => item.id === this.selectedAreaId);
      return area ? `Área ${area.nombre}` : 'Área seleccionada';
    }

    if (this.filterMode === 'user' && this.assignedTo) {
      return `Usuario ${this.assignedTo}`;
    }

    if (this.filterMode === 'all') {
      return 'Todas las tareas';
    }

    if (this.filterMode === 'process' && this.selectedProcessName) {
      return `Proceso ${this.selectedProcessName}`;
    }

    return 'Tareas pendientes';
  }

  protected get processOptions(): string[] {
    const values = this.allTasks
      .map((task) => task.nombreProceso?.trim())
      .filter((value): value is string => !!value);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }

  protected get instanceOptions(): TareaInstancia[] {
    const seen = new Set<string>();
    return this.allTasks.filter((task) => {
      if (seen.has(task.processInstanceId)) {
        return false;
      }

      seen.add(task.processInstanceId);
      return true;
    });
  }

  protected getInstanceLabel(task: TareaInstancia): string {
    const processName = task.nombreProceso?.trim() || 'Proceso';
    const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '';
    const suffix = createdAt ? ` · ${createdAt}` : '';

    return `${processName} · Instancia ${this.instanceSequence(task.processInstanceId)}${suffix}`;
  }

  protected openTask(task: TareaInstancia): void {
    void this.router.navigate(['/tasks', task.id]);
  }

  protected trackByInstance(_: number, task: TareaInstancia): string {
    return task.processInstanceId;
  }

  private async loadTasks(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.getSource()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const tasks = response?.data ?? [];
          this.allTasks = tasks;
          this.refreshVisibleTasks();
          this.showFeedback(`Se cargaron ${tasks.length} tareas.`, 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.tasks = [];
          this.allTasks = [];
          this.showFeedback(error?.error?.message || 'No se pudieron cargar las tareas.', 'error');
          this.cdr.detectChanges();
        },
      });
  }

  private loadAreas(): void {
    this.areaService.listarAreasActivas().subscribe({
      next: (response) => {
        this.areas = response.data ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.areas = [];
        this.cdr.detectChanges();
      },
    });
  }

  private getSource() {
    switch (this.filterMode) {
      case 'instance':
        return this.taskService.listarPorInstancia(this.processInstanceId);
      case 'area':
        return this.taskService.listarPorArea(this.areaId);
      case 'user':
        return this.taskService.listarPorUsuario(this.assignedTo);
      case 'process':
        return this.taskService.listarPorProceso(this.selectedProcessName);
      case 'all':
        return this.taskService.listarTodas();
      case 'pending':
      default:
        return this.taskService.listarPendientes();
    }
  }

  private resolveMode(
    mode: InboxFilterMode | null,
    processInstanceId: string,
    areaId: string,
    assignedTo: string,
    processName: string,
  ): InboxFilterMode {
    if (mode && ['pending', 'instance', 'area', 'user', 'process', 'all'].includes(mode)) {
      return mode;
    }

    if (processInstanceId) {
      return 'instance';
    }

    if (areaId) {
      return 'area';
    }

    if (assignedTo) {
      return 'user';
    }

    if (processName) {
      return 'process';
    }

    return 'pending';
  }

  private refreshVisibleTasks(): void {
    const selectedArea = this.selectedAreaId.trim();
    const selectedInstance = this.selectedInstanceId.trim();
    const selectedProcessName = this.selectedProcessName.trim().toLowerCase();

    this.tasks = this.allTasks.filter((task) => {
      const matchesArea = !selectedArea || task.areaId === selectedArea;
      const matchesInstance = !selectedInstance || task.processInstanceId === selectedInstance;
      const matchesProcess =
        !selectedProcessName || (task.nombreProceso ?? '').toLowerCase().includes(selectedProcessName);

      return matchesArea && matchesInstance && matchesProcess;
    });
  }

  private instanceSequence(processInstanceId: string): number {
    const index = this.instanceOptions.findIndex((task) => task.processInstanceId === processInstanceId);
    return index >= 0 ? index + 1 : 1;
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
