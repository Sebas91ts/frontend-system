import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { ProcessMonitoring } from '../../../../core/models/process-monitoring.models';
import { RealtimeEvent } from '../../../../core/models/realtime.models';
import { ProcessMonitoringService } from '../../../../core/services/process-monitoring.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { ProcessTrackingViewerComponent } from '../../../process-instances/components/tracking-viewer/process-tracking-viewer.component';

@Component({
  selector: 'app-process-monitoring',
  standalone: true,
  imports: [CommonModule, ProcessTrackingViewerComponent],
  templateUrl: './process-monitoring.component.html',
  styleUrl: './process-monitoring.component.css',
})
export class ProcessMonitoringComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly monitoringService = inject(ProcessMonitoringService);
  private readonly realtimeService = inject(RealtimeService);

  protected isLoading = true;
  protected errorMessage = '';
  protected readonly monitoring = signal<ProcessMonitoring | null>(null);

  private processId = '';
  private realtimeCleanup: (() => void) | null = null;
  private realtimeSubscription?: Subscription;

  protected readonly activityCounts = computed<Record<string, number>>(() => {
    const current = this.monitoring();
    if (!current) {
      return {};
    }

    return current.activityStats.reduce<Record<string, number>>((acc, item) => {
      if (item.taskDefinitionKey && item.activeInstances > 0) {
        acc[item.taskDefinitionKey] = item.activeInstances;
      }
      return acc;
    }, {});
  });

  protected readonly activeTaskKeys = computed(() =>
    this.monitoring()?.activityStats
      .filter((item) => item.activeInstances > 0)
      .map((item) => item.taskDefinitionKey) ?? []);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No se recibio el identificador del proceso.';
      this.isLoading = false;
      return;
    }

    this.processId = id;
    this.subscribeRealtime();
    this.loadMonitoring();
  }

  ngOnDestroy(): void {
    this.realtimeCleanup?.();
    this.realtimeSubscription?.unsubscribe();
  }

  protected goBack(): void {
    void this.router.navigate(['/processes']);
  }

  protected refresh(): void {
    this.loadMonitoring();
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected openTracking(processInstanceId?: string | null): void {
    const normalizedId = processInstanceId?.trim();
    if (!normalizedId) {
      return;
    }

    void this.router.navigate(['/process-instances', normalizedId, 'tracking']);
  }

  private subscribeRealtime(): void {
    this.realtimeCleanup = this.realtimeService.subscribeToTopic('/topic/tasks');
    this.realtimeSubscription = this.realtimeService.events$.subscribe((event) => {
      if (this.shouldRefresh(event)) {
        this.loadMonitoring();
      }
    });
  }

  private shouldRefresh(event: RealtimeEvent): boolean {
    return event.type === 'TASK_CREATED'
      || event.type === 'TASK_AVAILABLE'
      || event.type === 'TASK_CLAIMED'
      || event.type === 'TASK_COMPLETED';
  }

  private loadMonitoring(): void {
    if (!this.processId) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.monitoringService.obtenerMonitoreo(this.processId).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        this.monitoring.set(response.data ?? null);
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.monitoring.set(null);
        this.errorMessage = error?.error?.message || 'No se pudo cargar el monitoreo del proceso.';
        this.cdr.detectChanges();
      },
    });
  }
}
