import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import { EMPTY_BPMN_XML } from '../../shared/bpmn-templates';

type SaveXmlResult = {
  xml?: string;
};

@Component({
  selector: 'app-bpmn-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bpmn-editor.component.html',
  styleUrl: './bpmn-editor.component.css',
})
export class BpmnEditorComponent implements AfterViewInit, OnDestroy {
  @Input() processName = '';
  @Input() processKey = '';
  @Input() processVersion: number | null = null;
  @Input() processState = '';
  @Input() readonlyMode = false;
  @Input() autoCreateDiagram = true;

  @ViewChild('canvasHost', { static: true })
  private readonly canvasHostRef!: ElementRef<HTMLDivElement>;

  @ViewChild('propertiesHost', { static: true })
  private readonly propertiesHostRef!: ElementRef<HTMLDivElement>;

  private modeler: Modeler | null = null;
  private resizeObserver: ResizeObserver | null = null;

  readonly sampleXml = EMPTY_BPMN_XML;

  async ngAfterViewInit(): Promise<void> {
    this.initializeModeler();
    this.setupResizeHandling();
    if (this.autoCreateDiagram) {
      setTimeout(() => {
        void this.createNewDiagram();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.modeler?.destroy();
    this.modeler = null;
  }

  async createNewDiagram(): Promise<void> {
    await this.importFromXml(EMPTY_BPMN_XML);
  }

  async importFromXml(xml: string): Promise<void> {
    if (!this.modeler) {
      return;
    }

    const normalizedXml = xml.trim();
    if (!normalizedXml) {
      throw new Error('Debes proporcionar un XML BPMN valido para importar.');
    }

    await this.modeler.importXML(normalizedXml);
    this.scheduleFitViewport();
  }

  async exportToXml(): Promise<string> {
    if (!this.modeler) {
      throw new Error('El modelador BPMN no ha sido inicializado.');
    }

    const result = (await this.modeler.saveXML({ format: true })) as SaveXmlResult;
    return result.xml ?? '';
  }

  zoomIn(): void {
    this.stepZoom(0.2);
  }

  zoomOut(): void {
    this.stepZoom(-0.2);
  }

  resetView(): void {
    this.fitViewport();
  }

  private initializeModeler(): void {
    this.modeler = new Modeler({
      container: this.canvasHostRef.nativeElement,
      propertiesPanel: {
        parent: this.propertiesHostRef.nativeElement,
      },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
    });
  }

  private setupResizeHandling(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleFitViewport();
    });

    this.resizeObserver.observe(this.canvasHostRef.nativeElement);
  }

  private fitViewport(): void {
    if (!this.modeler) {
      return;
    }

    const hostElement = this.canvasHostRef.nativeElement;
    const width = hostElement.clientWidth;
    const height = hostElement.clientHeight;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }

    const canvas = this.modeler.get('canvas') as {
      zoom: (scale: 'fit-viewport' | number) => number;
      resized: () => void;
    };

    canvas.resized();
    canvas.zoom('fit-viewport');
  }

  private scheduleFitViewport(): void {
    requestAnimationFrame(() => {
      this.fitViewport();
    });
  }

  private stepZoom(delta: number): void {
    if (!this.modeler) {
      return;
    }

    const canvas = this.modeler.get('canvas') as {
      zoom: (scale?: 'fit-viewport' | number) => number;
    };

    const currentZoom = canvas.zoom();
    const nextZoom = Math.max(0.2, Math.min(4, currentZoom + delta));
    canvas.zoom(nextZoom);
  }
}
