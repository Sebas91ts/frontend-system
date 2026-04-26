import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProcessInstanceTracking } from '../../../../core/models/process-tracking.models';

@Component({
  selector: 'app-process-tracking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-tracking-summary.component.html',
  styleUrl: './process-tracking-summary.component.css',
})
export class ProcessTrackingSummaryComponent {
  @Input({ required: true }) tracking: ProcessInstanceTracking | null = null;

  protected formatState(value?: string | null): string {
    const normalized = value?.trim().toUpperCase() || 'SIN_DATOS';
    if (normalized === 'ACTIVA') {
      return 'Activa';
    }
    if (normalized === 'FINALIZADA') {
      return 'Finalizada';
    }
    return 'Sin datos';
  }

  protected stateClass(value?: string | null): string {
    const normalized = value?.trim().toUpperCase() || 'SIN_DATOS';
    if (normalized === 'ACTIVA') {
      return 'badge badge-active';
    }
    if (normalized === 'FINALIZADA') {
      return 'badge badge-finished';
    }
    return 'badge badge-muted';
  }

  protected get versionLabel(): string {
    return this.tracking?.processVersion ? `v${this.tracking.processVersion}` : 'Sin version';
  }

  protected get shortInstanceId(): string {
    const raw = this.tracking?.processInstanceId?.trim();
    if (!raw) {
      return 'Instancia no identificada';
    }
    return `Instancia #${raw.slice(-6)}`;
  }
}
