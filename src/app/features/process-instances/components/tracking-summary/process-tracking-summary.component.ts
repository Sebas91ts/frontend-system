import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { ProcessInstanceTracking } from '../../../../core/models/process-tracking.models';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-process-tracking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-tracking-summary.component.html',
  styleUrl: './process-tracking-summary.component.css',
})
export class ProcessTrackingSummaryComponent {
  @Input({ required: true }) tracking: ProcessInstanceTracking | null = null;
  private readonly preferences = inject(UiPreferencesService);

  protected t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  protected formatState(value?: string | null): string {
    const normalized = value?.trim().toUpperCase() || 'SIN_DATOS';
    if (normalized === 'ACTIVA') {
      return this.t('tracking.activeState');
    }
    if (normalized === 'FINALIZADA') {
      return this.t('tracking.finishedState');
    }
    return this.t('tracking.noData');
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
    return this.tracking?.processVersion ? `v${this.tracking.processVersion}` : this.t('tracking.noData');
  }

  protected get shortInstanceId(): string {
    const raw = this.tracking?.processInstanceId?.trim();
    if (!raw) {
      return this.t('tracking.instanceUnknown');
    }
    return `${this.t('tracking.instance')} #${raw.slice(-6)}`;
  }
}
