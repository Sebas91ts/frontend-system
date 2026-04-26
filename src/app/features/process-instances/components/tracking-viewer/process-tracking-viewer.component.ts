import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  ViewChild,
} from '@angular/core';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';

@Component({
  selector: 'app-process-tracking-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-tracking-viewer.component.html',
  styleUrl: './process-tracking-viewer.component.css',
})
export class ProcessTrackingViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvasHost', { static: true }) private readonly canvasHost?: ElementRef<HTMLDivElement>;
  private readonly preferences = inject(UiPreferencesService);

  @Input() xml = '';
  @Input() completedTaskKeys: string[] = [];
  @Input() activeTaskKeys: string[] = [];
  @Input() pendingTaskKeys: string[] = [];
  @Input() activityCounts: Record<string, number> = {};

  protected loading = false;
  protected errorMessage = '';

  protected t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  private viewer: NavigatedViewer | null = null;
  private rendered = false;
  private readonly appliedMarkers = new Map<string, string[]>();
  private overlayIds: string[] = [];

  ngAfterViewInit(): void {
    if (!this.canvasHost) {
      return;
    }

    this.viewer = new NavigatedViewer({
      container: this.canvasHost.nativeElement,
    });
    this.rendered = true;
    void this.renderDiagram();
  }

  ngOnChanges(_: SimpleChanges): void {
    if (this.rendered) {
      void this.renderDiagram();
    }
  }

  ngOnDestroy(): void {
    this.viewer?.destroy();
    this.viewer = null;
  }

  private async renderDiagram(): Promise<void> {
    if (!this.viewer) {
      return;
    }

    if (!this.xml?.trim()) {
      this.errorMessage = this.t('tracking.noTracking');
      this.clearMarkers();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.viewer.importXML(this.xml);
      const canvas = this.viewer.get('canvas') as {
        zoom: (value: 'fit-viewport') => void;
        addMarker: (id: string, marker: string) => void;
        removeMarker: (id: string, marker: string) => void;
      };

      canvas.zoom('fit-viewport');
      this.applyMarkers(canvas);
      this.applyActivityCountOverlays();
    } catch (error) {
      console.error('[ProcessTrackingViewer] No se pudo renderizar el BPMN', error);
      this.clearMarkers();
      this.errorMessage = this.t('tracking.noTracking');
    } finally {
      this.loading = false;
    }
  }

  private applyMarkers(canvas: {
    addMarker: (id: string, marker: string) => void;
    removeMarker: (id: string, marker: string) => void;
  }): void {
    this.clearMarkers(canvas);

    this.markElements(canvas, this.pendingTaskKeys, 'tracking-pending');
    this.markElements(canvas, this.completedTaskKeys, 'tracking-completed');
    this.markElements(canvas, this.activeTaskKeys, 'tracking-active');
  }

  private markElements(
    canvas: { addMarker: (id: string, marker: string) => void },
    elementIds: string[],
    marker: string,
  ): void {
    for (const elementId of elementIds ?? []) {
      if (!elementId?.trim()) {
        continue;
      }

      try {
        canvas.addMarker(elementId, marker);
        const existing = this.appliedMarkers.get(elementId) ?? [];
        this.appliedMarkers.set(elementId, [...existing, marker]);
      } catch {
        // Ignoramos ids que no existan en el diagrama cargado
      }
    }
  }

  private clearMarkers(
    canvas?: { removeMarker: (id: string, marker: string) => void },
  ): void {
    if (!canvas && this.viewer) {
      canvas = this.viewer.get('canvas') as { removeMarker: (id: string, marker: string) => void };
    }

    if (!canvas) {
      this.appliedMarkers.clear();
      return;
    }

    for (const [elementId, markers] of this.appliedMarkers.entries()) {
      for (const marker of markers) {
        try {
          canvas.removeMarker(elementId, marker);
        } catch {
          // noop
        }
      }
    }
    this.appliedMarkers.clear();
    this.clearActivityCountOverlays();
  }

  private applyActivityCountOverlays(): void {
    if (!this.viewer) {
      return;
    }

    this.clearActivityCountOverlays();

    const overlays = this.viewer.get('overlays') as {
      add: (elementId: string, options: {
        position: { top?: number; left?: number; right?: number; bottom?: number };
        html: HTMLElement;
      }) => string;
      remove: (overlayId: string) => void;
    };

    for (const [taskDefinitionKey, total] of Object.entries(this.activityCounts ?? {})) {
      if (!taskDefinitionKey?.trim() || !total || total <= 0) {
        continue;
      }

      try {
        const badge = document.createElement('div');
        badge.className = 'tracking-activity-badge';
        badge.textContent = String(total);

        const overlayId = overlays.add(taskDefinitionKey, {
          position: {
            bottom: 8,
            left: 8,
          },
          html: badge,
        });

        this.overlayIds.push(overlayId);
      } catch {
        // Ignora overlays para nodos que no existan en el diagrama
      }
    }
  }

  private clearActivityCountOverlays(): void {
    if (!this.viewer || !this.overlayIds.length) {
      this.overlayIds = [];
      return;
    }

    const overlays = this.viewer.get('overlays') as { remove: (overlayId: string) => void };
    for (const overlayId of this.overlayIds) {
      try {
        overlays.remove(overlayId);
      } catch {
        // noop
      }
    }
    this.overlayIds = [];
  }
}
