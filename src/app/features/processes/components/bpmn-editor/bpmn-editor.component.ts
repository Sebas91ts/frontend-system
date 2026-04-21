import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import { Area } from '../../../../core/models/area.models';
import { AreaService } from '../../../../core/services/area.service';
import { EMPTY_BPMN_XML } from '../../shared/bpmn-templates';
import { customModdle } from '../../shared/custom-moddle';

type SaveXmlResult = {
  xml?: string;
};

type LaneValidationResult = {
  valid: boolean;
  missingLaneNames: string[];
  message: string;
};

type LaneAreaBinding = {
  areaId: string;
  areaName: string;
  matchedByName: boolean;
};

@Component({
  selector: 'app-bpmn-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  protected selectedLaneElement: any | null = null;
  private selectionChangedHandler?: (event: any) => void;
  private commandStackChangedHandler?: () => void;
  private laneOverlayIds = new Map<string, string>();

  protected activeAreas: Area[] = [];
  protected selectedLaneAreaId = '';
  protected selectedLaneAreaName = '';
  protected laneBindingMessage = '';
  protected isAreasLoading = false;
  protected areasError = '';

  readonly sampleXml = EMPTY_BPMN_XML;

  constructor(private readonly areaService: AreaService) {}

  async ngAfterViewInit(): Promise<void> {
    this.initializeModeler();
    this.setupResizeHandling();
    this.setupSelectionHandling();
    void this.loadActiveAreas();
    if (this.autoCreateDiagram) {
      setTimeout(() => {
        void this.createNewDiagram();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.laneOverlayIds.clear();
    this.selectionChangedHandler = undefined;
    this.commandStackChangedHandler = undefined;
    this.modeler?.destroy();
    this.modeler = null;
    this.selectedLaneElement = null;
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
    this.clearLaneSelection();
    this.restoreLaneAreaBindings();
    this.refreshLaneAreaOverlays();
    this.scheduleFitViewport();
  }

  async exportToXml(): Promise<string> {
    if (!this.modeler) {
      throw new Error('El modelador BPMN no ha sido inicializado.');
    }

    const result = (await this.modeler.saveXML({ format: true })) as SaveXmlResult;
    return this.normalizeExportedXml(result.xml ?? '');
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

  protected onLaneAreaChange(areaId: string): void {
    if (!this.modeler || !this.selectedLaneElement || this.readonlyMode) {
      return;
    }

    this.selectedLaneAreaId = areaId;
    this.updateLaneAreaReference(areaId);
  }

  protected get selectedLaneAreaLabel(): string {
    if (!this.selectedLaneAreaId) {
      return 'Sin area asignada';
    }

    return (
      this.activeAreas.find((area) => area.id === this.selectedLaneAreaId)?.nombre ??
      'Area no encontrada'
    );
  }

  public validateLaneAssignments(): LaneValidationResult {
    if (!this.modeler) {
      return {
        valid: false,
        missingLaneNames: [],
        message: 'El modelador BPMN no está inicializado.',
      };
    }

    if (this.isAreasLoading) {
      return {
        valid: false,
        missingLaneNames: [],
        message: 'Espera a que carguen las áreas activas antes de guardar.',
      };
    }

    const laneElements = this.getLaneElements();
    const missingLaneNames = laneElements
      .filter((laneElement) => {
        const binding = this.resolveLaneAreaBinding(laneElement);
        if (!binding.areaId) {
          return true;
        }

        return !this.activeAreas.some((area) => area.id === binding.areaId);
      })
      .map((laneElement) => {
        const laneName = laneElement?.businessObject?.name?.trim?.();
        return laneName || laneElement?.id || 'Lane sin nombre';
      });

    if (missingLaneNames.length === 0) {
      return {
        valid: true,
        missingLaneNames: [],
        message: '',
      };
    }

    return {
      valid: false,
      missingLaneNames,
      message: `Debes asignar un área a todas las lanes antes de guardar: ${missingLaneNames.join(', ')}.`,
    };
  }

  private initializeModeler(): void {
    this.modeler = new Modeler({
      container: this.canvasHostRef.nativeElement,
      propertiesPanel: {
        parent: this.propertiesHostRef.nativeElement,
      },
      moddleExtensions: {
        custom: customModdle,
      },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
    });
  }

  private setupSelectionHandling(): void {
    if (!this.modeler) {
      return;
    }

    const eventBus = this.modeler.get('eventBus') as {
      on: (eventName: string, callback: (event: any) => void) => void;
    };

    this.selectionChangedHandler = (event: any) => {
      const selectedElement = event?.newSelection?.[0] ?? null;
      this.handleSelectedElement(selectedElement);
    };

    eventBus.on('selection.changed', this.selectionChangedHandler);
    eventBus.on('element.click', (event: any) => {
      this.handleSelectedElement(event?.element ?? null);
    });
    this.commandStackChangedHandler = () => {
      this.refreshLaneContext();
    };
    eventBus.on('commandStack.changed', this.commandStackChangedHandler);
  }

  private handleSelectedElement(element: any | null): void {
    const laneElement = this.resolveLaneElement(element);
    if (!laneElement) {
      this.clearLaneSelection();
      return;
    }

    this.selectedLaneElement = laneElement;
    this.syncSelectedLaneState();
  }

  private clearLaneSelection(): void {
    this.selectedLaneElement = null;
    this.selectedLaneAreaId = '';
    this.selectedLaneAreaName = '';
    this.laneBindingMessage = '';
  }

  private readLaneAreaId(element: any): string {
    const extensionValues = element?.businessObject?.extensionElements?.values ?? [];
    const areaRef = extensionValues.find((value: any) => value?.$type === 'custom:areaRef');
    return areaRef?.body?.trim?.() ?? areaRef?.body ?? '';
  }

  private syncSelectedLaneState(): void {
    if (!this.selectedLaneElement) {
      return;
    }

    const binding = this.resolveLaneAreaBinding(this.selectedLaneElement);
    this.selectedLaneAreaId = binding.areaId;
    this.selectedLaneAreaName = binding.areaName;
    this.laneBindingMessage = binding.areaId
      ? `Lane vinculada a ${binding.areaName}.`
      : 'Esta lane aun no tiene un area asignada.';
  }

  private refreshLaneContext(): void {
    if (!this.modeler) {
      return;
    }

    if (this.selectedLaneElement) {
      const laneElement = this.resolveLaneElement(this.selectedLaneElement);
      if (!laneElement) {
        this.clearLaneSelection();
      } else {
        this.selectedLaneElement = laneElement;
        this.syncSelectedLaneState();
      }
    }

    this.refreshLaneAreaOverlays();
  }

  private refreshLaneAreaOverlays(): void {
    if (!this.modeler) {
      return;
    }

    const overlays = this.modeler.get('overlays') as {
      add: (
        element: any,
        type: string,
        config: {
          position: { top?: number; right?: number; bottom?: number; left?: number };
          html: HTMLElement;
        },
      ) => string;
      remove: (overlayId: string) => void;
    };
    const elementRegistry = this.modeler.get('elementRegistry') as {
      filter: (predicate: (element: any) => boolean) => any[];
    };

    for (const overlayId of this.laneOverlayIds.values()) {
      overlays.remove(overlayId);
    }
    this.laneOverlayIds.clear();

    const laneElements = elementRegistry.filter(
      (element) => element?.businessObject?.$type === 'bpmn:Lane',
    );

    for (const laneElement of laneElements) {
      const binding = this.resolveLaneAreaBinding(laneElement);
      const areaName = binding.areaId ? binding.areaName : 'Sin area';
      const badge = document.createElement('div');
      badge.className = `lane-area-badge${binding.areaId ? '' : ' lane-area-badge--unassigned'}`;
      badge.textContent = areaName;
      badge.title = binding.areaId ? `Area asignada: ${areaName}` : 'Lane sin area asignada';

      const overlayId = overlays.add(laneElement, 'lane-area-badge', {
        position: {
          top: 8,
          right: 8,
        },
        html: badge,
      });

      this.laneOverlayIds.set(laneElement.id, overlayId);
    }
  }

  private updateLaneAreaReference(areaId: string): void {
    if (!this.modeler || !this.selectedLaneElement) {
      return;
    }

    const moddle = this.modeler.get('moddle') as {
      create: (type: string, attrs?: Record<string, unknown>) => any;
    };
    const modeling = this.modeler.get('modeling') as {
      updateProperties: (element: any, properties: Record<string, unknown>) => void;
      updateModdleProperties: (
        element: any,
        businessObject: any,
        properties: Record<string, unknown>,
      ) => void;
      updateLabel?: (element: any, text: string) => void;
    };

    const selectedArea = areaId
      ? (this.activeAreas.find((area) => area.id === areaId) ?? null)
      : null;
    const selectedAreaName = selectedArea?.nombre ?? (areaId ? 'Area no encontrada' : '');

    this.persistLaneAreaBinding(this.selectedLaneElement, areaId, selectedAreaName, moddle, modeling);

    if (areaId && selectedAreaName && selectedAreaName !== 'Area no encontrada') {
      modeling.updateLabel?.(this.selectedLaneElement, selectedAreaName);
    }

    this.selectedLaneAreaName = selectedAreaName;
    this.laneBindingMessage = areaId
      ? `Area "${this.selectedLaneAreaName}" asignada correctamente a la lane.`
      : 'Se limpio la asignacion de area de la lane.';
    this.syncSelectedLaneState();
    this.refreshLaneAreaOverlays();
  }

  private loadActiveAreas(): void {
    this.isAreasLoading = true;
    this.areasError = '';

    this.areaService.listarAreasActivas().subscribe({
      next: (response) => {
        this.activeAreas = response.data ?? [];
        this.isAreasLoading = false;
        this.restoreLaneAreaBindings();
        this.syncSelectedLaneState();
        this.refreshLaneAreaOverlays();
      },
      error: (error: any) => {
        this.isAreasLoading = false;
        this.areasError = error?.error?.message || 'No se pudieron cargar las areas activas.';
      },
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

  private getLaneElements(): any[] {
    if (!this.modeler) {
      return [];
    }

    const elementRegistry = this.modeler.get('elementRegistry') as {
      filter: (predicate: (element: any) => boolean) => any[];
    };

    return elementRegistry.filter((element) => element?.businessObject?.$type === 'bpmn:Lane');
  }

  private resolveLaneElement(element: any | null): any | null {
    if (!element) {
      return null;
    }

    if (element?.businessObject?.$type === 'bpmn:Lane' || element?.type === 'bpmn:Lane') {
      return element;
    }

    if (!this.modeler || !element?.id) {
      return null;
    }

    const elementRegistry = this.modeler.get('elementRegistry') as {
      get: (id: string) => any;
    };
    const registryElement = elementRegistry.get(element.id);

    if (registryElement?.businessObject?.$type === 'bpmn:Lane' || registryElement?.type === 'bpmn:Lane') {
      return registryElement;
    }

    return null;
  }

  private restoreLaneAreaBindings(): void {
    if (!this.modeler || this.isAreasLoading) {
      return;
    }

    const modeling = this.modeler.get('modeling') as {
      updateProperties: (element: any, properties: Record<string, unknown>) => void;
      updateLabel?: (element: any, text: string) => void;
    };
    const moddle = this.modeler.get('moddle') as {
      create: (type: string, attrs?: Record<string, unknown>) => any;
    };

    for (const laneElement of this.getLaneElements()) {
      const binding = this.resolveLaneAreaBinding(laneElement);
      if (!binding.areaId) {
        continue;
      }

      if (binding.matchedByName || this.readLaneAreaId(laneElement) !== binding.areaId) {
        this.persistLaneAreaBinding(laneElement, binding.areaId, binding.areaName, moddle, modeling);
      }

      if (!binding.areaName || laneElement?.businessObject?.name === binding.areaName) {
        continue;
      }

      modeling.updateProperties(laneElement, {
        name: binding.areaName,
      });
      modeling.updateLabel?.(laneElement, binding.areaName);
    }
  }

  private resolveLaneAreaBinding(element: any): LaneAreaBinding {
    const areaIdFromExtension = this.readLaneAreaId(element);
    const areaFromExtension = areaIdFromExtension
      ? this.activeAreas.find((area) => area.id === areaIdFromExtension) ?? null
      : null;

    if (areaFromExtension) {
      return {
        areaId: areaFromExtension.id,
        areaName: areaFromExtension.nombre,
        matchedByName: false,
      };
    }

    const laneName = this.normalizeText(element?.businessObject?.name ?? '');
    if (!laneName) {
      return {
        areaId: '',
        areaName: '',
        matchedByName: false,
      };
    }

    const matchedArea = this.activeAreas.find((area) => this.normalizeText(area.nombre) === laneName) ?? null;
    if (!matchedArea) {
      return {
        areaId: areaIdFromExtension,
        areaName: areaIdFromExtension ? 'Area no encontrada' : '',
        matchedByName: false,
      };
    }

    return {
      areaId: matchedArea.id,
      areaName: matchedArea.nombre,
      matchedByName: true,
    };
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private persistLaneAreaBinding(
    laneElement: any,
    areaId: string,
    areaName: string,
    moddle: {
      create: (type: string, attrs?: Record<string, unknown>) => any;
    },
    modeling: {
      updateProperties: (element: any, properties: Record<string, unknown>) => void;
    },
  ): void {
    const businessObject = laneElement.businessObject;
    const extensionValues = businessObject.extensionElements?.values ?? [];
    const values = extensionValues.filter((value: any) => value?.$type !== 'custom:areaRef');

    if (areaId) {
      values.push(moddle.create('custom:areaRef', { body: areaId }));
    }

    const extensionElements = moddle.create('bpmn:ExtensionElements', {
      values,
    });

    const updatedProperties: Record<string, unknown> = {
      extensionElements,
    };

    if (areaName && areaName !== 'Area no encontrada') {
      updatedProperties['name'] = areaName;
    }

    modeling.updateProperties(laneElement, updatedProperties);
  }

  private normalizeExportedXml(xml: string): string {
    if (!xml.trim()) {
      return xml;
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(xml, 'application/xml');
    const parseError = document.getElementsByTagName('parsererror')[0];
    if (parseError) {
      return xml;
    }

    const processElement = document.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'process')[0];
    if (!processElement) {
      return xml;
    }

    const processKey = this.normalizeProcessKey(this.processKey || this.processName);
    const processName = this.processName?.trim() || 'Proceso sin nombre';

    processElement.setAttribute('id', processKey);
    processElement.setAttribute('name', processName);
    processElement.setAttribute('isExecutable', 'true');

    const participant = document
      .getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'participant')[0];
    if (participant) {
      participant.setAttribute('processRef', processKey);
      if (!participant.getAttribute('name')) {
        participant.setAttribute('name', processName);
      }
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(document);
  }

  private normalizeProcessKey(source: string): string {
    const cleaned = (source ?? '').trim().toLowerCase();
    if (!cleaned) {
      return 'proceso_sin_nombre';
    }

    return cleaned
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      || 'proceso_sin_nombre';
  }
}
