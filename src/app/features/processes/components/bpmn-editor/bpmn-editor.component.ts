import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import { finalize, timeout } from 'rxjs';
import { ProcessService } from '../../../../core/services/process.service';
import { ChangeDetectorRef } from '@angular/core';

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
  imports: [CommonModule, FormsModule],
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

  protected readonly sampleXml = EMPTY_BPMN_XML;
  protected importXmlValue = '';
  protected exportedXml = '';
  protected processName = 'Proceso de ventas';
  protected errorMessage = '';
  protected successMessage = '';
  protected isBusy = false;
  protected isSaving = false;
  protected isSaveDialogOpen = false;
  protected saveDialogName = '';
  protected saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  protected saveDialogMessage = '';
  protected isImportPanelOpen = false;
  protected isExportPanelOpen = false;

  constructor(
    private processService: ProcessService,
    private cdr: ChangeDetectorRef,
  ) {}

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
      this.errorMessage = 'Debes proporcionar un XML BPMN valido para importar.';
      this.successMessage = '';
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.modeler.importXML(normalizedXml);
      this.scheduleFitViewport();
      this.successMessage = 'Diagrama BPMN importado correctamente.';
    } catch (error) {
      console.error('Error al importar XML BPMN', error);
      this.errorMessage =
        'No se pudo importar el XML BPMN. Verifica la estructura del archivo e intenta nuevamente.';
    } finally {
      this.isBusy = false;
    }
  }

  async exportToXml(): Promise<string> {
    if (!this.modeler) {
      throw new Error('El modelador BPMN no ha sido inicializado.');
    }

    const result = (await this.modeler.saveXML({ format: true })) as SaveXmlResult;
    return result.xml ?? '';
  }

  protected async onSaveProcess(): Promise<void> {
    console.info('[BpmnEditor] onSaveProcess -> open dialog', {
      processName: this.processName,
    });
    this.saveDialogName = this.processName.trim();
    this.saveDialogStatus = 'idle';
    this.saveDialogMessage = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.isSaveDialogOpen = true;
  }

  protected closeSaveDialog(): void {
    if (this.isSaving) {
      return;
    }

    console.info('[BpmnEditor] closeSaveDialog');
    this.isSaveDialogOpen = false;
  }

  protected async confirmSaveProcess(): Promise<void> {
    const nombre = this.saveDialogName.trim();

    console.info('[BpmnEditor] confirmSaveProcess -> start', {
      nombre,
      isSaving: this.isSaving,
      isSaveDialogOpen: this.isSaveDialogOpen,
    });

    if (!nombre) {
      console.warn('[BpmnEditor] confirmSaveProcess -> empty name');
      this.errorMessage = 'Debes ingresar un nombre para el proceso.';
      this.successMessage = '';
      return;
    }

    this.isSaving = true;
    this.saveDialogStatus = 'saving';
    this.saveDialogMessage = 'Guardando el proceso en MongoDB...';
    this.errorMessage = '';
    this.successMessage = '';
    this.processName = nombre;

    try {
      const xml = await this.exportToXml();
      this.exportedXml = xml;

      console.info('[BpmnEditor] confirmSaveProcess -> exporting xml ok', {
        xmlLength: xml.length,
      });

      this.processService
        .guardarProceso({
          nombre,
          xml,
        })
        .pipe(
          timeout(15000),
          finalize(() => {
            this.isSaving = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: (response) => {
            console.info('[BpmnEditor] confirmSaveProcess -> response', response);

            if (response.success) {
              this.saveDialogStatus = 'success';
              this.saveDialogMessage = 'Proceso BPMN guardado correctamente.';
              this.successMessage = 'Proceso BPMN guardado correctamente en MongoDB.';

              this.cdr.detectChanges();

              this.isSaving = false;

              setTimeout(() => {
                this.isSaveDialogOpen = false;
              }, 800);

              return;
            }

            this.saveDialogStatus = 'error';
            this.saveDialogMessage = response.message || 'No se pudo guardar el proceso.';
            this.errorMessage = response.message || 'No se pudo guardar el proceso.';
          },
          error: (error: any) => {
            console.error('[BpmnEditor] confirmSaveProcess -> error', error);

            this.isSaving = false;
            this.saveDialogStatus = 'error';

            const backendMessage = error?.error?.data;

            this.saveDialogMessage =
              backendMessage ||
              error?.error?.message ||
              (error?.name === 'TimeoutError'
                ? 'El backend no respondió a tiempo. Intenta nuevamente.'
                : 'No se pudo guardar el proceso en el backend.');

            this.errorMessage = this.saveDialogMessage;

            this.cdr.detectChanges();
          },
        });
    } catch (error: any) {
      console.error('[BpmnEditor] confirmSaveProcess -> export error', error);
      this.saveDialogStatus = 'error';
      this.saveDialogMessage =
        error?.error?.message ||
        (error?.name === 'TimeoutError'
          ? 'El backend no respondió a tiempo. Intenta nuevamente.'
          : 'No se pudo guardar el proceso en el backend.');
      this.errorMessage =
        error?.error?.message ||
        (error?.name === 'TimeoutError'
          ? 'El backend no respondió a tiempo. Intenta nuevamente.'
          : 'No se pudo guardar el proceso en el backend.');
      this.isSaving = false;
    }
  }

  protected async onExportXml(): Promise<void> {
    this.isBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.exportedXml = await this.exportToXml();
      this.isExportPanelOpen = true;
      this.successMessage = 'XML exportado correctamente.';
    } catch (error) {
      console.error('Error al exportar XML BPMN', error);
      this.errorMessage = 'No se pudo exportar el XML del diagrama actual.';
    } finally {
      this.isBusy = false;
    }
  }

  protected async onImportXml(): Promise<void> {
    await this.importFromXml(this.importXmlValue);
  }

  protected toggleImportPanel(): void {
    this.isImportPanelOpen = !this.isImportPanelOpen;
    if (this.isImportPanelOpen && !this.importXmlValue) {
      this.importXmlValue = this.sampleXml;
    }
  }

  protected zoomIn(): void {
    this.stepZoom(0.2);
  }

  protected zoomOut(): void {
    this.stepZoom(-0.2);
  }

  protected resetView(): void {
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
