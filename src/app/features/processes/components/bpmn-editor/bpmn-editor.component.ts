import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import { finalize } from 'rxjs';
import { Area } from '../../../../core/models/area.models';
import { ApiResponse } from '../../../../core/models/auth.models';
import { FormDefinition, FormFieldDefinition } from '../../../../core/models/form.models';
import { AreaService } from '../../../../core/services/area.service';
import { FormService } from '../../../../core/services/form.service';
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
  private overlayRefreshFrameId: number | null = null;

  protected activeAreas: Area[] = [];
  protected selectedLaneAreaId = '';
  protected selectedLaneAreaName = '';
  protected laneBindingMessage = '';
  protected isAreasLoading = false;
  protected areasError = '';
  protected selectedUserTask: any | null = null;
  protected taskFormPanelOpen = false;
  protected formLoading = false;
  protected formSaving = false;
  protected formError = '';
  protected formSuccess = '';
  protected taskFormDefinition: FormDefinition | null = null;
  protected formDraft: FormDefinition = {
    id: '',
    processKey: '',
    processVersion: 0,
    taskDefinitionKey: '',
    title: '',
    fields: [],
    active: true,
  };

  readonly sampleXml = EMPTY_BPMN_XML;

  constructor(
    private readonly areaService: AreaService,
    private readonly formService: FormService,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.initializeModeler();
    this.setupResizeHandling();
    this.setupSelectionHandling();
    setTimeout(() => {
      void this.loadActiveAreas();
    }, 0);
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
    if (this.overlayRefreshFrameId !== null) {
      cancelAnimationFrame(this.overlayRefreshFrameId);
      this.overlayRefreshFrameId = null;
    }
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
    this.commandStackChangedHandler = () => {
      this.scheduleOverlayRefresh();
    };
    eventBus.on('commandStack.changed', this.commandStackChangedHandler);
  }

  private handleSelectedElement(element: any | null): void {
    const laneElement = this.resolveLaneElement(element);
    if (!laneElement) {
      this.clearLaneSelection();
    } else {
      this.selectedLaneElement = laneElement;
      this.syncSelectedLaneState();
    }

    const userTaskElement = this.resolveUserTaskElement(element);
    if (!userTaskElement) {
      this.clearUserTaskSelection();
      return;
    }

    this.selectedUserTask = userTaskElement;
    this.cdr.markForCheck();
  }

  private clearLaneSelection(): void {
    this.selectedLaneElement = null;
    this.selectedLaneAreaId = '';
    this.selectedLaneAreaName = '';
    this.laneBindingMessage = '';
  }

  private clearUserTaskSelection(): void {
    this.selectedUserTask = null;
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
    this.cdr.markForCheck();
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

  private scheduleOverlayRefresh(): void {
    if (!this.modeler || this.overlayRefreshFrameId !== null) {
      return;
    }

    this.overlayRefreshFrameId = requestAnimationFrame(() => {
      this.overlayRefreshFrameId = null;
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
    });
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

  private resolveUserTaskElement(element: any | null): any | null {
    if (!element) {
      return null;
    }

    if (element?.businessObject?.$type === 'bpmn:UserTask' || element?.type === 'bpmn:UserTask') {
      return element;
    }

    if (!this.modeler || !element?.id) {
      return null;
    }

    const elementRegistry = this.modeler.get('elementRegistry') as {
      get: (id: string) => any;
    };
    const registryElement = elementRegistry.get(element.id);

    if (registryElement?.businessObject?.$type === 'bpmn:UserTask' || registryElement?.type === 'bpmn:UserTask') {
      return registryElement;
    }

    return null;
  }

  protected closeTaskFormPanel(): void {
    if (this.formSaving) {
      return;
    }

    this.taskFormPanelOpen = false;
  }

  protected openTaskFormPanel(taskElement?: any): void {
    const userTask = taskElement ?? this.selectedUserTask;
    if (!userTask || this.readonlyMode) {
      return;
    }

    this.closeContextPad();
    this.taskFormPanelOpen = true;
    this.formError = '';
    this.formSuccess = '';
    this.formLoading = true;
    this.cdr.markForCheck();

    const taskDefinitionKey = userTask.businessObject?.id || userTask.id;
    const payloadProcessKey = this.normalizeProcessKey(this.processKey || this.processName);
    const payloadVersion = this.processVersion ?? 1;

    this.formService.obtenerFormulario(payloadProcessKey, payloadVersion, taskDefinitionKey).subscribe({
      next: (response: ApiResponse<FormDefinition>) => {
        const definition = response.data ?? null;
        this.taskFormDefinition = definition;
        if (definition) {
          this.formDraft = { ...definition, fields: [...(definition.fields ?? [])] };
        } else {
          this.formDraft = {
            id: '',
            processKey: payloadProcessKey,
            processVersion: payloadVersion,
            taskDefinitionKey,
            title: `${userTask.businessObject?.name || userTask.id} formulario`,
            fields: [],
            active: true,
          };
        }
        this.formLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.taskFormDefinition = null;
        this.formDraft = {
          id: '',
          processKey: payloadProcessKey,
          processVersion: payloadVersion,
          taskDefinitionKey,
          title: `${userTask.businessObject?.name || userTask.id} formulario`,
          fields: [],
          active: true,
        };
        this.formLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  protected addFormField(): void {
    this.formDraft.fields = [
      ...(this.formDraft.fields ?? []),
      {
        name: '',
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
        helpText: '',
        order: (this.formDraft.fields?.length ?? 0) + 1,
        options: [],
      },
    ];
  }

  protected removeFormField(index: number): void {
    this.formDraft.fields = (this.formDraft.fields ?? []).filter((_, currentIndex) => currentIndex !== index);
    this.reorderFormFields();
  }

  protected moveField(index: number, direction: -1 | 1): void {
    const fields = [...(this.formDraft.fields ?? [])];
    const target = index + direction;
    if (target < 0 || target >= fields.length) {
      return;
    }

    [fields[index], fields[target]] = [fields[target], fields[index]];
    this.formDraft.fields = fields;
    this.reorderFormFields();
  }

  protected saveTaskForm(): void {
    if (!this.formDraft.processKey || !this.formDraft.processVersion || !this.formDraft.taskDefinitionKey) {
      this.formError = 'Falta contexto del proceso o de la tarea.';
      return;
    }

    this.formSaving = true;
    this.formError = '';
    this.formSuccess = '';
    const request = {
      processKey: this.formDraft.processKey,
      processVersion: this.formDraft.processVersion,
      taskDefinitionKey: this.formDraft.taskDefinitionKey,
      title: this.formDraft.title,
      fields: (this.formDraft.fields ?? []).map((field, index) => ({
        ...field,
        order: index + 1,
      })) as FormFieldDefinition[],
      active: this.formDraft.active,
    };

    const save$ = this.taskFormDefinition?.id
      ? this.formService.actualizarFormulario(this.taskFormDefinition.id, request)
      : this.formService.crearFormulario(request);

    save$.pipe(
      finalize(() => {
        this.formSaving = false;
        this.cdr.markForCheck();
      }),
    ).subscribe({
      next: (response: ApiResponse<FormDefinition>) => {
        this.taskFormDefinition = response.data ?? null;
        this.formSuccess = 'Formulario guardado correctamente.';
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.formError = error?.error?.message || 'No se pudo guardar el formulario.';
        this.cdr.markForCheck();
      },
    });
  }

  protected get selectedUserTaskLabel(): string {
    return this.selectedUserTask?.businessObject?.name || this.selectedUserTask?.id || 'Ninguna userTask seleccionada';
  }

  protected get taskFormContext(): string {
    return `${this.processKey || 'processKey no disponible'} · v${this.processVersion ?? 1} · ${this.formDraft.taskDefinitionKey || 'taskDefinitionKey no disponible'}`;
  }

  protected get hasTaskForm(): boolean {
    return !!this.taskFormDefinition;
  }

  protected updateFieldOptions(field: FormFieldDefinition, raw: string): void {
    field.options = raw
      .split(',')
      .map((option) => option.trim())
      .filter((option) => !!option);
  }

  private closeContextPad(): void {
    if (!this.modeler) {
      return;
    }

    const contextPad = this.modeler.get('contextPad') as {
      close?: () => void;
    };

    contextPad.close?.();
  }

  private reorderFormFields(): void {
    this.formDraft.fields = (this.formDraft.fields ?? []).map((field, index) => ({
      ...field,
      order: index + 1,
    }));
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
