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

  protected get executiveCards(): Array<{ label: string; value: string; tone: string; caption: string }> {
    if (!this.summary) {
      return [];
    }

    return [
      {
        label: 'Indice de salud operativa',
        value: `${this.operationalHealthScore}/100`,
        tone: this.operationalHealthTone,
        caption: this.operationalHealthNarrative,
      },
      {
        label: 'Nodo con mayor congestion',
        value: this.summary.actividadConMasPendientes || 'Sin datos',
        tone: 'amber',
        caption: `${this.summary.actividadConMasPendientesTotal ?? 0} tareas esperando atencion`,
      },
      {
        label: 'Mayor tiempo de espera',
        value: this.formatDurationCompact(this.summary.tareaConMayorTiempoPromedioEsperaMinutos ?? 0),
        tone: 'rose',
        caption: this.summary.tareaConMayorTiempoPromedioEspera || 'Sin historial suficiente',
      },
      {
        label: 'Area con mas acumulacion',
        value: this.summary.areaConMasAcumulacion || 'Sin datos',
        tone: 'blue',
        caption: `${this.summary.areaConMasAcumulacionTotal ?? 0} tareas en cola`,
      },
    ];
  }

  protected get tareasPorArea(): DashboardMetricItem[] {
    return this.summary?.tareasCompletadasPorArea ?? [];
  }

  protected get pendientesPorArea(): DashboardMetricItem[] {
    return this.summary?.tareasPendientesPorArea ?? [];
  }

  protected get tareasPorUsuario(): DashboardMetricItem[] {
    return this.summary?.tareasCompletadasPorUsuario ?? [];
  }

  protected get pendientesPorAreaChart(): DashboardMetricItem[] {
    return this.pendientesPorArea.slice(0, 6);
  }

  protected get tareasPorAreaChart(): DashboardMetricItem[] {
    return this.tareasPorArea.slice(0, 6);
  }

  protected get tareasPorUsuarioChart(): DashboardMetricItem[] {
    return this.tareasPorUsuario.slice(0, 6);
  }

  protected get bottleneckCards(): Array<{ label: string; value: string; hint: string }> {
    if (!this.summary) {
      return [];
    }

    return [
      {
        label: 'Actividad con mas pendientes',
        value: this.summary.actividadConMasPendientes || 'Sin datos',
        hint: `${this.summary.actividadConMasPendientesTotal ?? 0} tareas pendientes`,
      },
      {
        label: 'Mayor espera promedio',
        value: this.summary.tareaConMayorTiempoPromedioEspera || 'Sin datos',
        hint: this.formatDuration(this.summary.tareaConMayorTiempoPromedioEsperaMinutos ?? 0),
      },
      {
        label: 'Area con mas acumulacion',
        value: this.summary.areaConMasAcumulacion || 'Sin datos',
        hint: `${this.summary.areaConMasAcumulacionTotal ?? 0} tareas en cola`,
      },
    ];
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

  protected get resolutionRate(): number {
    if (!this.summary) {
      return 0;
    }

    const completed = this.summary.totalTareasCompletadas ?? 0;
    const pending = this.summary.totalTareasPendientes ?? 0;
    const total = completed + pending;
    if (total <= 0) {
      return 0;
    }

    return Math.round((completed / total) * 100);
  }

  protected get backlogPerInstance(): string {
    if (!this.summary) {
      return '0.0';
    }

    const active = Math.max(this.summary.totalInstanciasActivas ?? 0, 1);
    const pending = this.summary.totalTareasPendientes ?? 0;
    return (pending / active).toFixed(1);
  }

  protected get operationalHealthScore(): number {
    if (!this.summary) {
      return 0;
    }

    const completed = this.summary.totalTareasCompletadas ?? 0;
    const pending = this.summary.totalTareasPendientes ?? 0;
    const waitMinutes = this.summary.tareaConMayorTiempoPromedioEsperaMinutos ?? 0;
    const backlogPenalty = pending * 4;
    const waitPenalty = Math.min(waitMinutes / 12, 25);
    const throughputBonus = Math.min(completed * 2, 35);
    const rawScore = 55 + throughputBonus - backlogPenalty - waitPenalty;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  protected get operationalHealthTone(): string {
    const score = this.operationalHealthScore;
    if (score >= 75) {
      return 'green';
    }
    if (score >= 50) {
      return 'amber';
    }
    return 'rose';
  }

  protected get operationalHealthNarrative(): string {
    const score = this.operationalHealthScore;
    if (score >= 75) {
      return 'Carga estable y tiempos de respuesta bajo control.';
    }
    if (score >= 50) {
      return 'Hay acumulacion operativa, conviene reasignar o acelerar tareas clave.';
    }
    return 'Riesgo alto de congestion. Prioriza tareas pendientes y revisa la actividad critica.';
  }

  protected get bottleneckMethodology(): string[] {
    return [
      'Nodo con mayor congestion: actividad con mas tareas pendientes activas.',
      'Mayor tiempo de espera: promedio entre createdAt y completedAt de tareas historicas.',
      'Area con mas acumulacion: area con mayor volumen de tareas en estado pendiente.',
    ];
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return this.t('admin.noDate');
    }

    return new Date(value).toLocaleString();
  }

  protected formatDuration(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) {
      return 'Sin historial suficiente';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) {
      return `${minutes} min promedio`;
    }

    if (minutes === 0) {
      return `${hours} h promedio`;
    }

    return `${hours} h ${minutes} min promedio`;
  }

  protected formatDurationCompact(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) {
      return '0 min';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) {
      return `${minutes} min`;
    }
    if (minutes === 0) {
      return `${hours} h`;
    }
    return `${hours} h ${minutes} min`;
  }

  protected barWidth(item: DashboardMetricItem, collection: DashboardMetricItem[]): number {
    const max = collection.reduce((acc, current) => Math.max(acc, current.total), 0);
    if (max <= 0) {
      return 0;
    }
    return Math.max(10, Math.round((item.total / max) * 100));
  }

  protected shareOfTotal(item: DashboardMetricItem, collection: DashboardMetricItem[]): string {
    const total = collection.reduce((acc, current) => acc + current.total, 0);
    if (total <= 0) {
      return '0%';
    }
    return `${Math.round((item.total / total) * 100)}%`;
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
