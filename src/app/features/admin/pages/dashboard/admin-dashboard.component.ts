import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { ApiResponse } from '../../../../core/models/auth.models';
import { DashboardMetricItem, DashboardRecentTask, DashboardSummary } from '../../../../core/models/dashboard.models';
import { AuthService } from '../../../../core/services/auth.service';
import { DashboardService } from '../../../../core/services/dashboard.service';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly preferences = inject(UiPreferencesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  protected isLoading = true;
  protected errorMessage = '';
  protected summary: DashboardSummary | null = null;
  protected isMoreMenuOpen = false;
  protected isAssistantOpen = false;
  protected assistantInput = '';
  protected assistantLoading = false;
  protected assistantError = '';
  protected assistantMessages: Array<{ role: 'user' | 'assistant'; text: string }> = [
    {
      role: 'assistant',
      text: 'Hola, soy tu asistente interno. Puedo ayudarte con procesos, diagramas BPMN, publicaciones, tareas, tracking, dashboard y recomendaciones IA.',
    },
  ];

  ngOnInit(): void {
    this.cargarResumen();
  }

  protected t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  protected get summaryCards(): Array<{ label: string; value: number; tone: string }> {
    return [
      { label: this.t('admin.openProcesses'), value: this.summary?.totalProcesosPublicados ?? 0, tone: 'green' },
      { label: this.t('admin.openInstances'), value: this.summary?.totalInstanciasActivas ?? 0, tone: 'blue' },
      { label: this.t('admin.openTasks'), value: this.summary?.totalTareasPendientes ?? 0, tone: 'amber' },
      { label: this.t('admin.recentTitle'), value: this.summary?.totalTareasCompletadas ?? 0, tone: 'slate' },
    ];
  }

  protected get tareasPorArea(): DashboardMetricItem[] {
    return this.summary?.tareasCompletadasPorArea ?? [];
  }

  protected get tareasPorUsuario(): DashboardMetricItem[] {
    return this.summary?.tareasCompletadasPorUsuario ?? [];
  }

  protected get ultimasTareas(): DashboardRecentTask[] {
    return this.summary?.ultimosLogsTareas ?? [];
  }

  protected get trackingDestacados(): DashboardRecentTask[] {
    const seen = new Set<string>();
    return this.ultimasTareas
      .filter((item) => {
        const instanceId = item.processInstanceId?.trim();
        if (!instanceId || seen.has(instanceId)) {
          return false;
        }

        seen.add(instanceId);
        return true;
      })
      .slice(0, 3);
  }

  protected get totalInstanciasMonitoreables(): number {
    return this.trackingDestacados.length;
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return this.t('admin.noDate');
    }

    return new Date(value).toLocaleString();
  }

  protected getProcessLabel(task: DashboardRecentTask): string {
    const key = task.processKey?.trim();
    if (!key) {
      return this.t('admin.unknownProcess');
    }

    const version = task.processVersion ?? null;
    return version ? `${key} v${version}` : key;
  }

  protected trackByLabel(_: number, item: DashboardMetricItem): string {
    return item.label;
  }

  protected trackByTask(_: number, item: DashboardRecentTask): string {
    return `${item.processInstanceId}-${item.taskName}-${item.completedAt ?? ''}`;
  }

  logout(): void {
    this.authService.logout();
  }

  goToUsers(): void {
    void this.router.navigate(['/admin/users']);
  }

  goToProcesses(): void {
    void this.router.navigate(['/processes']);
  }

  goToAreas(): void {
    void this.router.navigate(['/admin/areas']);
  }

  goToTasks(): void {
    void this.router.navigate(['/tasks']);
  }

  goToInstances(): void {
    void this.router.navigate(['/admin/process-instances']);
  }

  goToAiRecommendations(): void {
    void this.router.navigate(['/admin/ai-recommendations']);
  }

  toggleMoreMenu(): void {
    this.isMoreMenuOpen = !this.isMoreMenuOpen;
  }

  closeMoreMenu(): void {
    this.isMoreMenuOpen = false;
  }

  goToSettings(): void {
    this.isMoreMenuOpen = false;
    void this.router.navigate(['/settings']);
  }

  openAssistant(): void {
    this.isAssistantOpen = true;
    this.isMoreMenuOpen = false;
  }

  closeAssistant(): void {
    if (this.assistantLoading) {
      return;
    }

    this.isAssistantOpen = false;
  }

  async sendAssistantMessage(): Promise<void> {
    const text = this.assistantInput.trim();
    if (!text || this.assistantLoading) {
      return;
    }

    this.assistantMessages = [...this.assistantMessages, { role: 'user', text }];
    this.assistantInput = '';
    this.assistantLoading = true;
    this.assistantError = '';

    try {
      const response = await this.http
        .post<ApiResponse<{ response: string }>>(`${this.apiBaseUrl}/ai/assistant`, { message: text })
        .toPromise();

      const answer = response?.data?.response?.trim() || 'No pude generar una respuesta en este momento.';
      this.assistantMessages = [...this.assistantMessages, { role: 'assistant', text: answer }];
    } catch (error: any) {
      this.assistantError = error?.error?.message || 'No se pudo conectar con el asistente.';
    } finally {
      this.assistantLoading = false;
      this.cdr.detectChanges();
    }
  }

  protected goToTracking(processInstanceId?: string | null): void {
    const normalizedId = processInstanceId?.trim();
    if (!normalizedId) {
      return;
    }

    void this.router.navigate(['/process-instances', normalizedId, 'tracking']);
  }

  protected getTrackingLabel(item: DashboardRecentTask): string {
    const taskName = item.taskName?.trim() || this.t('admin.recentTitle');
    const area = item.areaNombre?.trim();
    return area ? `${taskName} · ${area}` : taskName;
  }

  protected reintentar(): void {
    this.cargarResumen();
  }

  private cargarResumen(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.dashboardService
      .obtenerResumen()
      .pipe(
        timeout(12000),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.summary = response.data ?? null;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.summary = null;
          this.errorMessage = error?.error?.message || 'No se pudo cargar el dashboard.';
          this.cdr.detectChanges();
        },
      });
  }
}
