import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { ClientInstanceTracking, ClientTrackingHistoryItem } from '../../../../core/models/process-tracking.models';
import { UploadedFileMetadata } from '../../../../core/models/form.models';
import { ProcessTrackingService } from '../../../../core/services/process-tracking.service';
import { ProcessTrackingViewerComponent } from '../../../process-instances/components/tracking-viewer/process-tracking-viewer.component';

@Component({
  selector: 'app-client-instance-tracking',
  standalone: true,
  imports: [CommonModule, ProcessTrackingViewerComponent],
  templateUrl: './client-instance-tracking.component.html',
  styleUrl: './client-instance-tracking.component.css',
})
export class ClientInstanceTrackingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly processTrackingService = inject(ProcessTrackingService);

  protected tracking: ClientInstanceTracking | null = null;
  protected loading = false;
  protected errorMessage = '';

  private processInstanceId = '';
  private realtimeSubscription?: Subscription;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('processInstanceId');
    if (!id) {
      this.errorMessage = 'No se recibio el identificador del tramite.';
      return;
    }

    this.processInstanceId = id;
    this.loadTracking();
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
  }

  get submittedHistory(): ClientTrackingHistoryItem[] {
    return this.tracking?.history ?? [];
  }

  get hasSubmittedHistory(): boolean {
    return this.submittedHistory.length > 0;
  }

  trackByHistoryEntry(_: number, entry: ClientTrackingHistoryItem): string {
    return `${entry.taskName ?? 'task'}-${entry.completedAt ?? 'time'}`;
  }

  getHistoryEntries(entry: ClientTrackingHistoryItem): Array<{ key: string; value: unknown }> {
    const formData = entry.formData ?? {};
    const excludedKeys = new Set(['clientUserId', 'clientEmail', 'startedByRole']);
    return Object.entries(formData)
      .filter(([key]) => !excludedKeys.has(key))
      .map(([key, value]) => ({ key, value }));
  }

  formatHistoryValue(value: unknown): string {
    if (value == null) {
      return 'Sin dato';
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatHistoryValue(item)).join(', ');
    }

    if (typeof value === 'object') {
      const file = this.asFileMetadata(value);
      if (file) {
        return file.fileName || 'Archivo adjunto';
      }

      return Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => `${key}: ${this.formatHistoryValue(item)}`)
        .join(' | ');
    }

    return String(value);
  }

  historyFile(value: unknown): UploadedFileMetadata | null {
    return this.asFileMetadata(value);
  }

  private asFileMetadata(value: unknown): UploadedFileMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = value as UploadedFileMetadata;
    return typeof candidate.fileName === 'string' && typeof candidate.secureUrl === 'string'
      ? candidate
      : null;
  }

  private loadTracking(): void {
    if (!this.processInstanceId) {
      return;
    }

    this.loading = true;

    this.errorMessage = '';
    this.cdr.detectChanges();

    this.processTrackingService
      .obtenerTrackingCliente(this.processInstanceId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.tracking = response.data ?? null;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'No se pudo cargar el seguimiento del tramite.';
          this.tracking = null;
          this.cdr.detectChanges();
        },
      });
  }
}
