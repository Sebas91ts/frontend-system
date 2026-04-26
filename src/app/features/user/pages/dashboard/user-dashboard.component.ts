import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { AuthService } from '../../../../core/services/auth.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';
import { NotificationBellComponent } from '../../../../shared/components/notification-bell/notification-bell.component';

type WorkloadStatus = 'healthy' | 'attention' | 'empty';

interface WorkMetric {
  label: string;
  value: number;
  hint: string;
  tone: 'primary' | 'success' | 'warning';
}

interface StartableProcessCard {
  id: string;
  processKey: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, NotificationBellComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.css',
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly taskService = inject(TaskInstanceService);
  private readonly realtimeService = inject(RealtimeService);
  protected readonly preferences = inject(UiPreferencesService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly user = computed(() => this.authService.currentUser());
  protected myTasks: TareaInstancia[] = [];
  protected areaTasks: TareaInstancia[] = [];
  protected isLoading = false;
  protected errorMessage = '';
  protected lastUpdatedAt: Date | null = null;

  private realtimeSubscription?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.subscribeRealtime();
    this.loadWorkspace();
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
  }

  protected get displayName(): string {
    const currentUser = this.user();
    const fullName = `${currentUser?.nombre ?? ''} ${currentUser?.apellido ?? ''}`.trim();
    return fullName || currentUser?.email || 'Funcionario';
  }

  protected get userInitials(): string {
    const currentUser = this.user();
    const first = currentUser?.nombre?.trim()?.[0] ?? '';
    const last = currentUser?.apellido?.trim()?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'U';
  }

  protected get roleLabel(): string {
    return this.user()?.roles?.includes('ROLE_ADMIN') ? 'Administrador operativo' : 'Funcionario BPM';
  }

  protected get areaLabel(): string {
    return this.user()?.areaNombre || this.t('user.unassignedArea');
  }

  protected get workloadStatus(): WorkloadStatus {
    if (!this.myTasks.length && !this.areaTasks.length) {
      return 'empty';
    }

    return this.myTasks.length > 0 ? 'attention' : 'healthy';
  }

  protected get workloadTitle(): string {
    if (this.workloadStatus === 'attention') {
      return this.t('user.workloadAttentionTitle');
    }

    if (this.workloadStatus === 'healthy') {
      return this.t('user.workloadHealthyTitle');
    }

    return this.t('user.workloadEmptyTitle');
  }

  protected get workloadDescription(): string {
    if (this.workloadStatus === 'attention') {
      return this.t('user.workloadAttentionDescription');
    }

    if (this.workloadStatus === 'healthy') {
      return this.t('user.workloadHealthyDescription');
    }

    return this.t('user.workloadEmptyDescription');
  }

  protected get metrics(): WorkMetric[] {
    return [
      {
        label: this.t('user.mine'),
        value: this.myTasks.length,
        hint: this.t('user.metricMineHint'),
        tone: 'primary',
      },
      {
        label: this.t('user.areaTasks'),
        value: this.areaTasks.length,
        hint: this.t('user.metricAreaHint'),
        tone: 'success',
      },
      {
        label: this.t('user.total'),
        value: this.myTasks.length + this.areaTasks.length,
        hint: this.t('user.metricTotalHint'),
        tone: 'warning',
      },
    ];
  }

  protected get priorityTasks(): TareaInstancia[] {
    return [...this.myTasks, ...this.areaTasks]
      .sort((left, right) => this.dateValue(left.created) - this.dateValue(right.created))
      .slice(0, 5);
  }

  protected get lastUpdatedLabel(): string {
    return this.lastUpdatedAt ? this.lastUpdatedAt.toLocaleTimeString() : this.t('user.notUpdated');
  }

  protected t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  protected refresh(): void {
    this.loadWorkspace();
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected goToMyTasks(): void {
    void this.router.navigate(['/tasks'], { queryParams: { mode: 'mine' } });
  }

  protected goToAreaTasks(): void {
    void this.router.navigate(['/tasks'], { queryParams: { mode: 'area' } });
  }

  protected goToStartableProcesses(): void {
    void this.router.navigate(['/user/processes']);
  }

  protected openTask(task: TareaInstancia): void {
    if (this.isAssignedToMe(task)) {
      void this.router.navigate(['/tasks'], { queryParams: { mode: 'mine' } });
      return;
    }

    void this.router.navigate(['/tasks'], { queryParams: { mode: 'area' } });
  }

  protected getTaskName(task: TareaInstancia): string {
    return task.name?.trim() || task.nombreTarea?.trim() || 'Tarea sin nombre';
  }

  protected getProcessName(task: TareaInstancia): string {
    if (task.nombreProceso?.trim()) {
      return task.nombreProceso.trim();
    }

    const processDefinitionId = task.processDefinitionId?.trim();
    if (!processDefinitionId) {
      return 'Proceso no identificado';
    }

    return processDefinitionId.split(':')[0]?.replaceAll('_', ' ') || 'Proceso no identificado';
  }

  protected getTaskBadge(task: TareaInstancia): string {
    return this.isAssignedToMe(task) ? 'Asignada a mi' : 'Disponible';
  }

  protected getTaskBadgeClass(task: TareaInstancia): string {
    return this.isAssignedToMe(task) ? 'task-badge task-badge--primary' : 'task-badge task-badge--success';
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected trackTask(_: number, task: TareaInstancia): string {
    return task.id || `${task.processInstanceId}-${task.taskDefinitionKey}`;
  }

  protected trackProcess(_: number, process: StartableProcessCard): string {
    return process.id || process.processKey;
  }

  private loadWorkspace(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      mine: this.taskService.listarMisTareas(),
      area: this.taskService.listarTareasDeMiArea(),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ mine, area }) => {
          this.myTasks = mine.data ?? [];
          this.areaTasks = (area.data ?? []).filter((task) => !task.assignee);
          this.lastUpdatedAt = new Date();
        },
        error: (error: any) => {
          this.myTasks = [];
          this.areaTasks = [];
          this.errorMessage = error?.error?.message || 'No se pudo cargar tu espacio de trabajo.';
        },
      });
  }

  private subscribeRealtime(): void {
    const currentUser = this.user();
    if (currentUser?.areaId) {
      this.realtimeService.subscribeToTopic(`/topic/areas/${currentUser.areaId}/tasks`);
    }

    this.realtimeService.subscribeToTopic('/topic/tasks');
    this.realtimeSubscription = this.realtimeService.events$.subscribe((event) => {
      if (
        event.type === 'TASK_CREATED' ||
        event.type === 'TASK_AVAILABLE' ||
        event.type === 'TASK_CLAIMED' ||
        event.type === 'TASK_COMPLETED'
      ) {
        this.loadWorkspace();
      }
    });
  }

  private isAssignedToMe(task: TareaInstancia): boolean {
    const email = this.user()?.email?.trim().toLowerCase();
    return !!email && task.assignee?.trim().toLowerCase() === email;
  }

  private dateValue(value?: string | null): number {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }

    const date = new Date(value).getTime();
    return Number.isFinite(date) ? date : Number.MAX_SAFE_INTEGER;
  }
}
