import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { ProcessInstanceTracking } from '../../../../core/models/process-tracking.models';
import { RealtimeEvent } from '../../../../core/models/realtime.models';
import { ProcessTrackingService } from '../../../../core/services/process-tracking.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { ProcessTrackingSummaryComponent } from '../../components/tracking-summary/process-tracking-summary.component';
import { ProcessTrackingTimelineComponent } from '../../components/tracking-timeline/process-tracking-timeline.component';
import { ProcessTrackingViewerComponent } from '../../components/tracking-viewer/process-tracking-viewer.component';

@Component({
  selector: 'app-process-instance-tracking',
  standalone: true,
  imports: [
    CommonModule,
    ProcessTrackingSummaryComponent,
    ProcessTrackingTimelineComponent,
    ProcessTrackingViewerComponent,
  ],
  templateUrl: './process-instance-tracking.component.html',
  styleUrl: './process-instance-tracking.component.css',
})
export class ProcessInstanceTrackingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly processTrackingService = inject(ProcessTrackingService);
  private readonly realtimeService = inject(RealtimeService);

  protected tracking: ProcessInstanceTracking | null = null;
  protected loading = false;
  protected refreshInProgress = false;
  protected errorMessage = '';
  protected lastUpdatedAt: Date | null = null;

  private processInstanceId = '';
  private realtimeCleanup: (() => void) | null = null;
  private realtimeSubscription?: Subscription;
  private pendingRealtimeRefresh = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No se recibio el identificador de la instancia.';
      return;
    }

    this.processInstanceId = id;
    this.subscribeToRealtime();
    this.loadTracking();
  }

  ngOnDestroy(): void {
    this.realtimeCleanup?.();
    this.realtimeSubscription?.unsubscribe();
  }

  protected goBack(): void {
    void this.router.navigate(['/tasks']);
  }

  protected refresh(): void {
    this.loadTracking(true);
  }

  protected formatLastUpdate(): string {
    if (!this.lastUpdatedAt) {
      return 'Sincronizacion inicial';
    }

    return this.lastUpdatedAt.toLocaleTimeString();
  }

  private subscribeToRealtime(): void {
    this.realtimeCleanup = this.realtimeService.subscribeToTopic(
      `/topic/process-instances/${this.processInstanceId}`,
    );

    this.realtimeSubscription = this.realtimeService.events$.subscribe((event) => {
      if (this.isEventForCurrentInstance(event)) {
        this.queueRealtimeRefresh();
      }
    });
  }

  private isEventForCurrentInstance(event: RealtimeEvent): boolean {
    if (!this.processInstanceId) {
      return false;
    }

    if (event.relatedProcessInstanceId === this.processInstanceId) {
      return true;
    }

    const payloadInstanceId = event.payload?.['processInstanceId'];
    return typeof payloadInstanceId === 'string' && payloadInstanceId === this.processInstanceId;
  }

  private queueRealtimeRefresh(): void {
    if (this.loading || this.refreshInProgress) {
      this.pendingRealtimeRefresh = true;
      return;
    }

    this.loadTracking(true);
  }

  private loadTracking(isRealtimeRefresh = false): void {
    if (!this.processInstanceId) {
      return;
    }

    if (isRealtimeRefresh) {
      this.refreshInProgress = true;
    } else {
      this.loading = true;
    }

    this.errorMessage = '';
    this.cdr.detectChanges();

    this.processTrackingService.obtenerTracking(this.processInstanceId).pipe(
      finalize(() => {
        this.loading = false;
        this.refreshInProgress = false;

        if (this.pendingRealtimeRefresh) {
          this.pendingRealtimeRefresh = false;
          this.loadTracking(true);
          return;
        }

        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        this.tracking = response.data ?? null;
        this.lastUpdatedAt = new Date();
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message || 'No se pudo cargar el seguimiento de la instancia.';
        this.cdr.detectChanges();
      },
    });
  }
}
