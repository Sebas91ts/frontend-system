import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';

type SaveXmlResult = {
  xml?: string;
};

const EMPTY_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:collaboration id="Collaboration_1">
    <bpmn:participant id="Participant_1" name="Proceso principal" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:laneSet id="LaneSet_1">
      <bpmn:lane id="Lane_1" name="Area 1">
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="StartEvent_1" name="Inicio" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="140" y="70" width="920" height="320" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_1_di" bpmnElement="Lane_1" isHorizontal="true">
        <dc:Bounds x="170" y="70" width="890" height="320" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="250" y="210" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

@Component({
  selector: 'app-bpmn-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bpmn-editor.component.html',
  styleUrl: './bpmn-editor.component.css',
})
export class BpmnEditorComponent implements AfterViewInit, OnDestroy {
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
    setTimeout(() => {
      void this.createNewDiagram();
    }, 0);
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
