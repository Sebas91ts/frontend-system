import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { UploadedFileMetadata } from '../../../../core/models/form.models';
import { TaskExecutionLog } from '../../../../core/models/task-history.models';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';

interface TimelineField {
  label: string;
  value: string;
  isFile: boolean;
  file?: UploadedFileMetadata;
}

@Component({
  selector: 'app-process-tracking-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-tracking-timeline.component.html',
  styleUrl: './process-tracking-timeline.component.css',
})
export class ProcessTrackingTimelineComponent {
  @Input() history: TaskExecutionLog[] = [];
  private readonly preferences = inject(UiPreferencesService);

  protected t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return this.t('admin.noDate');
    }
    return new Date(value).toLocaleString();
  }

  protected taskLabel(entry: TaskExecutionLog): string {
    return entry.taskName?.trim() || entry.taskDefinitionKey?.trim() || this.t('tasks.taskTitle');
  }

  protected actorLabel(entry: TaskExecutionLog): string {
    return entry.completedBy?.trim() || entry.assignedTo?.trim() || this.t('admin.unknownUser');
  }

  protected fields(entry: TaskExecutionLog): TimelineField[] {
    return Object.entries(entry.formData ?? {})
      .map(([key, value]) => this.mapField(key, value))
      .filter((item): item is TimelineField => !!item);
  }

  private mapField(key: string, value: unknown): TimelineField | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const file = this.asUploadedFile(value);
    if (file) {
      return {
        label: this.prettyLabel(key),
        value: file.fileName || this.t('tasks.fileSelected'),
        isFile: true,
        file,
      };
    }

    return {
      label: this.prettyLabel(key),
      value: this.prettyValue(value),
      isFile: false,
    };
  }

  private asUploadedFile(value: unknown): UploadedFileMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = value as Partial<UploadedFileMetadata>;
    if (!candidate.fileName && !candidate.secureUrl && !candidate.publicId) {
      return null;
    }

    return {
      fileName: candidate.fileName || 'Archivo',
      secureUrl: candidate.secureUrl || '',
      publicId: candidate.publicId || '',
      mimeType: candidate.mimeType || null,
      size: candidate.size || null,
      resourceType: candidate.resourceType || null,
    };
  }

  private prettyLabel(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  }

  private prettyValue(value: unknown): string {
    if (typeof value === 'boolean') {
      return value ? 'Si' : 'No';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.prettyValue(item)).join(', ');
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return '';
      }

      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          return this.prettyValue(JSON.parse(trimmed));
        } catch {
          return trimmed;
        }
      }

      return trimmed;
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([entryKey, entryValue]) => `${this.prettyLabel(entryKey)}: ${this.prettyValue(entryValue)}`)
        .join(' · ');
    }

    return String(value);
  }
}
