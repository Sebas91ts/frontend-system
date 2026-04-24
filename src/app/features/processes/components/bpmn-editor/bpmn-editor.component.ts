import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import { finalize } from 'rxjs';
import { Area } from '../../../../core/models/area.models';
import { ApiResponse } from '../../../../core/models/auth.models';
import {
  FormDefinition,
  FormFieldDefinition,
  FormFieldOptionDefinition,
  FormFieldType,
} from '../../../../core/models/form.models';
import { AreaService } from '../../../../core/services/area.service';
import { FormService } from '../../../../core/services/form.service';
import { EMPTY_BPMN_XML } from '../../shared/bpmn-templates';
import { validateExclusiveGatewayXml } from '../../shared/bpmn-gateway-validation';
import { customModdle } from '../../shared/custom-moddle';
import {
  ConditionFieldOption,
  ConditionOperator,
  ExclusiveGatewayValidationResult,
  LaneAreaBinding,
  LaneValidationResult,
  SequenceFlowTechnicalState,
} from './bpmn-editor.types';
import { LaneAssignmentPanelComponent } from './lane-assignment-panel.component';
import { SequenceFlowTechnicalPanelComponent } from './sequence-flow-technical-panel.component';
import { TaskFormAssignmentCardComponent } from './task-form-assignment-card.component';
import { TaskFormModalComponent } from './task-form-modal.component';

type SaveXmlResult = {
  xml?: string;
};

@Component({
  selector: 'app-bpmn-editor',
  standalone: true,
  imports: [
    CommonModule,
    LaneAssignmentPanelComponent,
    SequenceFlowTechnicalPanelComponent,
    TaskFormAssignmentCardComponent,
    TaskFormModalComponent,
  ],
  templateUrl: './bpmn-editor.component.html',
  styleUrl: './bpmn-editor.component.css',
})
export class BpmnEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
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
  private selectionChangedHandler?: (event: any) => void;
  private commandStackChangedHandler?: () => void;
  private laneOverlayIds = new Map<string, string>();
  private overlayRefreshFrameId: number | null = null;

  protected selectedLaneElement: any | null = null;
  protected activeAreas: Area[] = [];
  protected selectedLaneAreaId = '';
  protected selectedLaneAreaName = '';
  protected laneBindingMessage = '';
  protected isAreasLoading = false;
  protected areasError = '';

  protected selectedSequenceFlowElement: any | null = null;
  protected availableConditionFields: ConditionFieldOption[] = [];
  protected conditionFieldsLoading = false;
  protected conditionFieldsError = '';
  protected conditionFieldsEmptyMessage = '';
  protected selectedSequenceFlowFieldName = '';
  protected selectedSequenceFlowOperator: ConditionOperator | '' = '';
  protected selectedSequenceFlowValue = '';
  protected selectedSequenceFlowGeneratedExpression = '';
  protected selectedSequenceFlowParseWarning = '';
  protected selectedSequenceFlowValidationMessage = '';
  protected selectedSequenceFlowDefaultDraft = false;
  protected sequenceFlowFeedbackMessage = '';

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
  private processFormDefinitions: FormDefinition[] = [];
  private loadedConditionProcessKey = '';
  private sequenceFlowRefreshSnapshot: any | null = null;

  constructor(
    private readonly areaService: AreaService,
    private readonly formService: FormService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.initializeModeler();
    this.setupResizeHandling();
    this.setupSelectionHandling();
    setTimeout(() => {
      this.loadActiveAreas();
    }, 0);
    setTimeout(() => {
      this.loadAvailableConditionFields();
    }, 0);
    if (this.autoCreateDiagram) {
      setTimeout(() => {
        void this.createNewDiagram();
      }, 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processKey'] || changes['processName']) {
      this.loadAvailableConditionFields();
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
    this.clearSequenceFlowSelection();
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

  public validateLaneAssignments(): LaneValidationResult {
    if (!this.modeler) {
      return {
        valid: false,
        missingLaneNames: [],
        message: 'El modelador BPMN no esta inicializado.',
      };
    }

    if (this.isAreasLoading) {
      return {
        valid: false,
        missingLaneNames: [],
        message: 'Espera a que carguen las areas activas antes de guardar.',
      };
    }

    const missingLaneNames = this.getLaneElements()
      .filter((laneElement) => {
        const binding = this.resolveLaneAreaBinding(laneElement);
        if (!binding.areaId) {
          return true;
        }

        return !this.activeAreas.some((area) => area.id === binding.areaId);
      })
      .map((laneElement) => laneElement?.businessObject?.name?.trim?.() || laneElement?.id || 'Lane sin nombre');

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
      message: `Debes asignar un area a todas las lanes antes de guardar: ${missingLaneNames.join(', ')}.`,
    };
  }

  public async validateExclusiveGatewayAssignments(): Promise<ExclusiveGatewayValidationResult> {
    try {
      return validateExclusiveGatewayXml(await this.exportToXml());
    } catch {
      return {
        valid: false,
        message: 'No se pudo exportar el XML BPMN para validar los exclusive gateways.',
        invalidGatewayIds: [],
      };
    }
  }

  protected get selectedLaneName(): string {
    return this.selectedLaneElement?.businessObject?.name || this.selectedLaneElement?.id || 'Ninguna lane seleccionada';
  }

  protected get selectedLaneAreaLabel(): string {
    if (!this.selectedLaneAreaId) {
      return 'Sin area asignada';
    }

    return this.activeAreas.find((area) => area.id === this.selectedLaneAreaId)?.nombre ?? 'Area no encontrada';
  }

  protected get selectedUserTaskLabel(): string {
    return this.selectedUserTask?.businessObject?.name || this.selectedUserTask?.id || 'Ninguna userTask seleccionada';
  }

  protected get taskFormContext(): string {
    return `${this.processKey || 'processKey no disponible'} | v${this.processVersion ?? 1} | ${this.formDraft.taskDefinitionKey || 'taskDefinitionKey no disponible'}`;
  }

  protected get hasTaskForm(): boolean {
    return !!this.taskFormDefinition;
  }

  protected get selectedSequenceFlowTechnicalState(): SequenceFlowTechnicalState | null {
    if (!this.selectedSequenceFlowElement) {
      return null;
    }

    const businessObject = this.selectedSequenceFlowElement.businessObject;
    const sourceGateway = businessObject?.sourceRef;
    const target = businessObject?.targetRef;

    return {
      flowId: businessObject?.id || this.selectedSequenceFlowElement.id || 'sequenceFlow sin id',
      sourceGatewayId: sourceGateway?.id || 'Gateway sin id',
      sourceGatewayLabel: sourceGateway?.name || sourceGateway?.id || 'ExclusiveGateway',
      targetId: target?.id || 'Nodo destino sin id',
      targetLabel: target?.name || target?.id || 'Nodo destino',
      conditionExpression: this.readSequenceFlowCondition(this.selectedSequenceFlowElement),
      isDefaultFlow: this.isDefaultSequenceFlow(this.selectedSequenceFlowElement),
    };
  }

  protected onLaneAreaChange(areaId: string): void {
    if (!this.modeler || !this.selectedLaneElement || this.readonlyMode) {
      return;
    }

    this.selectedLaneAreaId = areaId;
    this.updateLaneAreaReference(areaId);
  }

  protected onSequenceFlowFieldChange(fieldName: string): void {
    this.selectedSequenceFlowFieldName = fieldName;
    const selectedField = this.getSelectedConditionField();
    const validOperators = this.getOperatorOptionsForField(selectedField).map((item) => item.value);
    if (!this.selectedSequenceFlowOperator || !validOperators.includes(this.selectedSequenceFlowOperator)) {
      this.selectedSequenceFlowOperator = '';
    }
    if (selectedField?.type === 'select') {
      console.log('[ConditionBuilder] selected select field:', selectedField);
      if (!this.getConditionFieldOptions(selectedField).some((option) => option.value === this.selectedSequenceFlowValue)) {
        this.selectedSequenceFlowValue = '';
      }
    }
    if (selectedField?.type === 'checkbox') {
      this.selectedSequenceFlowValue = '';
    }
    this.selectedSequenceFlowParseWarning = '';
    this.selectedSequenceFlowValidationMessage = '';
    console.debug('[SequenceFlowBuilder] field selected', {
      fieldName: selectedField?.name ?? fieldName,
      fieldType: selectedField?.type ?? 'unknown',
      fieldOptions: this.getConditionFieldOptions(selectedField),
      selectedOperator: this.selectedSequenceFlowOperator,
      selectedValue: this.selectedSequenceFlowValue,
    });
    this.refreshGeneratedExpressionPreview();
  }

  protected onSequenceFlowOperatorChange(operator: ConditionOperator | ''): void {
    this.selectedSequenceFlowOperator = operator;
    if (!this.operatorRequiresValue(operator)) {
      this.selectedSequenceFlowValue = '';
    }
    this.selectedSequenceFlowParseWarning = '';
    this.selectedSequenceFlowValidationMessage = '';
    this.refreshGeneratedExpressionPreview();
  }

  protected onSequenceFlowValueChange(value: string): void {
    this.selectedSequenceFlowValue = value;
    this.selectedSequenceFlowValidationMessage = '';
    this.refreshGeneratedExpressionPreview();
  }

  protected onSequenceFlowDefaultDraftChange(value: boolean): void {
    this.selectedSequenceFlowDefaultDraft = value;
    this.sequenceFlowFeedbackMessage = '';
    this.selectedSequenceFlowValidationMessage = '';
    if (value) {
      this.selectedSequenceFlowFieldName = '';
      this.selectedSequenceFlowOperator = '';
      this.selectedSequenceFlowValue = '';
      this.selectedSequenceFlowParseWarning = '';
    }
    this.refreshGeneratedExpressionPreview();
  }

  protected applySequenceFlowTechnicalChanges(): void {
    if (!this.selectedSequenceFlowElement || this.readonlyMode) {
      return;
    }

    const validationMessage = this.validateSequenceFlowBuilder();
    this.selectedSequenceFlowValidationMessage = validationMessage;
    if (validationMessage) {
      this.sequenceFlowFeedbackMessage = '';
      this.cdr.markForCheck();
      return;
    }

    this.updateSequenceFlowCondition(this.selectedSequenceFlowGeneratedExpression);
    this.updateSequenceFlowDefault(this.selectedSequenceFlowDefaultDraft);
    this.syncSelectedSequenceFlowState();
    this.sequenceFlowFeedbackMessage = this.selectedSequenceFlowDefaultDraft
      ? 'Default flow actualizado correctamente.'
      : 'Condicion del sequenceFlow guardada correctamente.';
    this.cdr.markForCheck();
  }

  protected closeTaskFormPanel(): void {
    if (!this.formSaving) {
      this.taskFormPanelOpen = false;
    }
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
        console.log('FORM GUARDADO:', definition);
        this.taskFormDefinition = definition;
        this.formDraft = definition
          ? {
              ...definition,
              fields: (definition.fields ?? []).map((field) => ({
                ...field,
                options: [...(field.options ?? [])],
                optionItems: (field.optionItems ?? []).map((option) => ({ ...option })),
              })),
            }
          : {
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
        optionItems: [],
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

    const fieldValidationError = this.validateFormDraftFields();
    if (fieldValidationError) {
      this.formError = fieldValidationError;
      this.formSuccess = '';
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
      fields: (this.formDraft.fields ?? []).map((field, index) =>
        this.normalizeFormFieldForSave(field, index + 1),
      ) as FormFieldDefinition[],
      active: this.formDraft.active,
    };

    const save$ = this.taskFormDefinition?.id
      ? this.formService.actualizarFormulario(this.taskFormDefinition.id, request)
      : this.formService.crearFormulario(request);

    save$
      .pipe(
        finalize(() => {
          this.formSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response: ApiResponse<FormDefinition>) => {
          const updatedForm = response.data ?? null;
          this.taskFormDefinition = updatedForm;
          this.formDraft = updatedForm
            ? {
                ...updatedForm,
                fields: (updatedForm.fields ?? []).map((field) => ({
                  ...field,
                  options: [...(field.options ?? [])],
                  optionItems: (field.optionItems ?? []).map((option) => ({ ...option })),
                })),
              }
            : this.formDraft;
          this.formSuccess = 'Formulario guardado correctamente.';
          this.processFormDefinitions = [];
          this.loadedConditionProcessKey = '';
          this.availableConditionFields = [];
          this.rebuildAvailableConditionFields();
          this.forceRefreshSelectedSequenceFlow();
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.formError = error?.error?.message || 'No se pudo guardar el formulario.';
          this.cdr.markForCheck();
        },
      });
  }

  protected onTaskFormFieldMove(event: { index: number; direction: -1 | 1 }): void {
    this.moveField(event.index, event.direction);
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

    const sequenceFlowElement = this.resolveExclusiveGatewaySequenceFlowElement(element);
    if (!sequenceFlowElement) {
      this.clearSequenceFlowSelection();
    } else {
      this.selectedSequenceFlowElement = sequenceFlowElement;
      this.syncSelectedSequenceFlowState();
    }

    const userTaskElement = this.resolveUserTaskElement(element);
    if (!userTaskElement) {
      this.clearUserTaskSelection();
    } else {
      this.selectedUserTask = userTaskElement;
      this.cdr.markForCheck();
    }
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

  private clearSequenceFlowSelection(): void {
    this.selectedSequenceFlowElement = null;
    this.availableConditionFields = [];
    this.conditionFieldsError = '';
    this.conditionFieldsEmptyMessage = '';
    this.selectedSequenceFlowFieldName = '';
    this.selectedSequenceFlowOperator = '';
    this.selectedSequenceFlowValue = '';
    this.selectedSequenceFlowGeneratedExpression = '';
    this.selectedSequenceFlowParseWarning = '';
    this.selectedSequenceFlowValidationMessage = '';
    this.selectedSequenceFlowDefaultDraft = false;
    this.sequenceFlowFeedbackMessage = '';
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

  private syncSelectedSequenceFlowState(): void {
    if (!this.selectedSequenceFlowElement) {
      return;
    }

    this.rebuildAvailableConditionFields();
    const currentExpression = this.readSequenceFlowCondition(this.selectedSequenceFlowElement);
    this.selectedSequenceFlowDefaultDraft = this.isDefaultSequenceFlow(this.selectedSequenceFlowElement);
    this.selectedSequenceFlowGeneratedExpression = currentExpression;
    this.selectedSequenceFlowValidationMessage = '';
    this.hydrateSequenceFlowConditionBuilder(currentExpression);
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

    const laneElements = elementRegistry.filter((element) => element?.businessObject?.$type === 'bpmn:Lane');

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

      if (this.selectedSequenceFlowElement) {
        const sequenceFlowElement = this.resolveExclusiveGatewaySequenceFlowElement(this.selectedSequenceFlowElement);
        if (!sequenceFlowElement) {
          this.clearSequenceFlowSelection();
        } else {
          this.selectedSequenceFlowElement = sequenceFlowElement;
          this.syncSelectedSequenceFlowState();
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
      updateLabel?: (element: any, text: string) => void;
    };

    const selectedArea = areaId ? this.activeAreas.find((area) => area.id === areaId) ?? null : null;
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

  private loadAvailableConditionFields(): void {
    const normalizedProcessKey = this.normalizeProcessKey(this.processKey || this.processName);
    if (!normalizedProcessKey || normalizedProcessKey === 'proceso_sin_nombre') {
      this.processFormDefinitions = [];
      this.loadedConditionProcessKey = '';
      this.availableConditionFields = [];
      this.conditionFieldsEmptyMessage = '';
      this.conditionFieldsError = '';
      this.conditionFieldsLoading = false;
      return;
    }

    if (this.loadedConditionProcessKey === normalizedProcessKey) {
      this.rebuildAvailableConditionFields();
      return;
    }

    this.conditionFieldsLoading = true;
    this.conditionFieldsError = '';
    this.conditionFieldsEmptyMessage = '';
    this.cdr.markForCheck();

    this.formService.listarPorProceso(normalizedProcessKey).subscribe({
      next: (response) => {
        this.processFormDefinitions = response.data ?? [];
        this.loadedConditionProcessKey = normalizedProcessKey;
        this.conditionFieldsLoading = false;
        this.rebuildAvailableConditionFields();
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.conditionFieldsLoading = false;
        this.conditionFieldsError =
          error?.error?.message || 'No se pudieron cargar los campos de formularios del proceso.';
        this.conditionFieldsEmptyMessage = '';
        this.processFormDefinitions = [];
        this.loadedConditionProcessKey = '';
        this.availableConditionFields = [];
        this.cdr.markForCheck();
      },
    });
  }

  private rebuildAvailableConditionFields(): void {
    if (!this.selectedSequenceFlowElement) {
      this.availableConditionFields = [];
      this.conditionFieldsEmptyMessage = '';
      return;
    }

    this.availableConditionFields = [];
    const sourceGateway = this.selectedSequenceFlowElement.businessObject?.sourceRef;
    const taskDefinitionKeys = this.collectReachablePreviousUserTaskKeys(sourceGateway);
    const fieldMap = new Map<string, ConditionFieldOption>();
    const allFields: FormFieldDefinition[] = [];
    const latestVersion = Math.max(...this.processFormDefinitions.map((form) => form.processVersion || 0));
    const latestForms = this.processFormDefinitions.filter((form) => (form.processVersion || 0) === latestVersion);

    console.log('USANDO VERSION:', latestVersion);
    console.log('FORMS FILTRADOS:', latestForms);

    const fields = latestForms.flatMap((form) => form.fields ?? []);
    console.log('ANTES DE PROCESAR FIELDS:', fields);

    for (const field of fields) {
      console.log('FIELD RAW:', field.name, field.type, field.options);
      if (field.type === 'select') {
        console.log('SELECT OPTIONS:', field.name, field.options, field.optionItems);
      }
    }

    for (const definition of latestForms) {
      const taskDefinitionKey = definition.taskDefinitionKey?.trim();
      if (!taskDefinitionKey || !taskDefinitionKeys.has(taskDefinitionKey)) {
        continue;
      }

      allFields.push(...(definition.fields ?? []));
      for (const field of definition.fields ?? []) {
        const fieldName = field.name?.trim();
        if (!fieldName || fieldMap.has(fieldName)) {
          continue;
        }

        const optionItems = this.normalizeFieldOptionItems(field);
        fieldMap.set(fieldName, {
          name: fieldName,
          label: field.label?.trim() || fieldName,
          type: field.type,
          options: optionItems.map((option) => option.value),
          optionItems,
          normalizedOptions: optionItems,
        });
      }
    }

    this.availableConditionFields = Array.from(fieldMap.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
    console.log('AVAILABLE FIELDS FINAL:', this.availableConditionFields);
    this.conditionFieldsError = '';
    this.conditionFieldsEmptyMessage = this.availableConditionFields.length
      ? ''
      : 'No hay variables disponibles antes de este gateway.';

    if (
      this.selectedSequenceFlowFieldName &&
      !this.availableConditionFields.some((field) => field.name === this.selectedSequenceFlowFieldName)
    ) {
      this.selectedSequenceFlowFieldName = '';
      this.selectedSequenceFlowOperator = '';
      this.selectedSequenceFlowValue = '';
      if (this.selectedSequenceFlowGeneratedExpression.trim()) {
        this.selectedSequenceFlowParseWarning =
          'La condicion actual usa una variable que no esta disponible antes de este gateway.';
      }
    }
  }

  private forceRefreshSelectedSequenceFlow(): void {
    const currentFlow = this.selectedSequenceFlowElement;
    this.sequenceFlowRefreshSnapshot = currentFlow;
    this.selectedSequenceFlowElement = null;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.selectedSequenceFlowElement = this.sequenceFlowRefreshSnapshot;
      this.sequenceFlowRefreshSnapshot = null;
      if (this.selectedSequenceFlowElement) {
        this.syncSelectedSequenceFlowState();
      }
      this.cdr.markForCheck();
    });
  }

  private collectReachablePreviousUserTaskKeys(startNode: any): Set<string> {
    const taskKeys = new Set<string>();
    const visitedNodeIds = new Set<string>();
    const nodesToVisit = startNode ? [startNode] : [];

    while (nodesToVisit.length) {
      const currentNode = nodesToVisit.pop();
      const currentNodeId = currentNode?.id;
      if (!currentNodeId || visitedNodeIds.has(currentNodeId)) {
        continue;
      }

      visitedNodeIds.add(currentNodeId);
      const incomingFlows = currentNode?.incoming ?? [];
      for (const incomingFlow of incomingFlows) {
        const previousNode = incomingFlow?.sourceRef;
        const previousNodeId = previousNode?.id;
        if (!previousNodeId) {
          continue;
        }

        if (previousNode?.$type === 'bpmn:UserTask') {
          taskKeys.add(previousNodeId);
        }

        if (!visitedNodeIds.has(previousNodeId)) {
          nodesToVisit.push(previousNode);
        }
      }
    }

    return taskKeys;
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

    return registryElement?.businessObject?.$type === 'bpmn:Lane' || registryElement?.type === 'bpmn:Lane'
      ? registryElement
      : null;
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

    return registryElement?.businessObject?.$type === 'bpmn:UserTask' || registryElement?.type === 'bpmn:UserTask'
      ? registryElement
      : null;
  }

  private resolveExclusiveGatewaySequenceFlowElement(element: any | null): any | null {
    const sequenceFlow = this.resolveSequenceFlowElement(element);
    return sequenceFlow?.businessObject?.sourceRef?.$type === 'bpmn:ExclusiveGateway' ? sequenceFlow : null;
  }

  private resolveSequenceFlowElement(element: any | null): any | null {
    if (!element) {
      return null;
    }

    if (element?.businessObject?.$type === 'bpmn:SequenceFlow' || element?.type === 'bpmn:SequenceFlow') {
      return element;
    }

    if (!this.modeler || !element?.id) {
      return null;
    }

    const elementRegistry = this.modeler.get('elementRegistry') as {
      get: (id: string) => any;
    };
    const registryElement = elementRegistry.get(element.id);

    return registryElement?.businessObject?.$type === 'bpmn:SequenceFlow' || registryElement?.type === 'bpmn:SequenceFlow'
      ? registryElement
      : null;
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

  private getSelectedConditionField(): ConditionFieldOption | null {
    return this.availableConditionFields.find((field) => field.name === this.selectedSequenceFlowFieldName) ?? null;
  }

  private readSequenceFlowCondition(element: any): string {
    return element?.businessObject?.conditionExpression?.body ?? '';
  }

  private isDefaultSequenceFlow(element: any): boolean {
    return element?.businessObject?.sourceRef?.default === element?.businessObject;
  }

  private updateSequenceFlowCondition(rawCondition: string): void {
    if (!this.modeler || !this.selectedSequenceFlowElement) {
      return;
    }

    const trimmedCondition = (rawCondition ?? '').trim();
    const moddle = this.modeler.get('moddle') as {
      create: (type: string, attrs?: Record<string, unknown>) => any;
    };
    const modeling = this.modeler.get('modeling') as {
      updateProperties: (element: any, properties: Record<string, unknown>) => void;
    };

    modeling.updateProperties(this.selectedSequenceFlowElement, {
      conditionExpression: trimmedCondition
        ? moddle.create('bpmn:FormalExpression', { body: trimmedCondition })
        : undefined,
    });
  }

  private updateSequenceFlowDefault(markAsDefault: boolean): void {
    if (!this.modeler || !this.selectedSequenceFlowElement?.source) {
      return;
    }

    const modeling = this.modeler.get('modeling') as {
      updateProperties: (element: any, properties: Record<string, unknown>) => void;
    };

    modeling.updateProperties(this.selectedSequenceFlowElement.source, {
      default: markAsDefault ? this.selectedSequenceFlowElement.businessObject : undefined,
    });
  }

  private hydrateSequenceFlowConditionBuilder(expression: string): void {
    this.selectedSequenceFlowFieldName = '';
    this.selectedSequenceFlowOperator = '';
    this.selectedSequenceFlowValue = '';
    this.selectedSequenceFlowParseWarning = '';

    if (this.selectedSequenceFlowDefaultDraft) {
      this.selectedSequenceFlowGeneratedExpression = '';
      return;
    }

    const parsed = this.parseVisualCondition(expression);
    if (!parsed) {
      this.selectedSequenceFlowGeneratedExpression = expression;
      if (expression.trim()) {
        this.selectedSequenceFlowParseWarning =
          'La condicion actual no pudo convertirse automaticamente al constructor visual. Si guardas desde aqui, se reemplazara por una nueva regla.';
      }
      return;
    }

    this.selectedSequenceFlowFieldName = parsed.fieldName;
    this.selectedSequenceFlowOperator = parsed.operator;
    this.selectedSequenceFlowValue = parsed.value;
    this.refreshGeneratedExpressionPreview();
  }

  private parseVisualCondition(expression: string): { fieldName: string; operator: ConditionOperator; value: string } | null {
    const normalized = expression.trim();
    if (!normalized) {
      return null;
    }

    const fileExistsMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*!=\s*null\s*\}$/);
    if (fileExistsMatch) {
      return { fieldName: fileExistsMatch[1], operator: 'exists', value: '' };
    }

    const fileNotExistsMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*==\s*null\s*\}$/);
    if (fileNotExistsMatch) {
      return { fieldName: fileNotExistsMatch[1], operator: 'not_exists', value: '' };
    }

    const booleanTrueMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*==\s*true\s*\}$/i);
    if (booleanTrueMatch) {
      return { fieldName: booleanTrueMatch[1], operator: 'is_true', value: '' };
    }

    const booleanFalseMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*==\s*false\s*\}$/i);
    if (booleanFalseMatch) {
      return { fieldName: booleanFalseMatch[1], operator: 'is_false', value: '' };
    }

    const containsMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*!=\s*null\s*&&\s*\1\.contains\((.+)\)\s*\}$/);
    if (containsMatch) {
      return {
        fieldName: containsMatch[1],
        operator: 'contains',
        value: this.unquoteBpmnLiteral(containsMatch[2]),
      };
    }

    const notContainsMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*==\s*null\s*\|\|\s*!\1\.contains\((.+)\)\s*\}$/);
    if (notContainsMatch) {
      return {
        fieldName: notContainsMatch[1],
        operator: 'not_contains',
        value: this.unquoteBpmnLiteral(notContainsMatch[2]),
      };
    }

    const simpleMatch = normalized.match(/^\$\{\s*([a-zA-Z_][\w]*)\s*(==|!=|>=|<=|>|<)\s*(.+)\s*\}$/);
    if (!simpleMatch) {
      return null;
    }

    return {
      fieldName: simpleMatch[1],
      operator: this.mapSymbolToOperator(simpleMatch[2], simpleMatch[3]),
      value: this.unquoteBpmnLiteral(simpleMatch[3]),
    };
  }

  private mapSymbolToOperator(symbol: string, rawValue: string): ConditionOperator {
    switch (symbol) {
      case '==':
        return 'equals';
      case '!=':
        return 'not_equals';
      case '>=':
        return 'greater_or_equal';
      case '<=':
        return 'less_or_equal';
      case '>':
        return this.looksLikeDateLiteral(rawValue) ? 'after' : 'greater_than';
      case '<':
        return this.looksLikeDateLiteral(rawValue) ? 'before' : 'less_than';
      default:
        return 'equals';
    }
  }

  private looksLikeDateLiteral(rawValue: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(this.unquoteBpmnLiteral(rawValue));
  }

  private unquoteBpmnLiteral(rawValue: string): string {
    const trimmed = rawValue.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  private validateSequenceFlowBuilder(): string {
    if (this.selectedSequenceFlowDefaultDraft) {
      return '';
    }

    const selectedField = this.getSelectedConditionField();
    if (!selectedField) {
      return 'Debes seleccionar un campo del formulario.';
    }

    if (!this.selectedSequenceFlowOperator) {
      return 'Debes seleccionar un operador.';
    }

    const validOperator = this.getOperatorOptionsForField(selectedField)
      .map((option) => option.value)
      .includes(this.selectedSequenceFlowOperator);
    if (!validOperator) {
      return 'El operador seleccionado no es compatible con el tipo de campo.';
    }

    if (this.operatorRequiresValue(this.selectedSequenceFlowOperator) && !this.selectedSequenceFlowValue.trim()) {
      return 'Debes ingresar un valor para completar la condicion.';
    }

    if (selectedField.type === 'number' && this.operatorRequiresValue(this.selectedSequenceFlowOperator)) {
      if (!Number.isFinite(Number(this.selectedSequenceFlowValue))) {
        return 'El valor debe ser numerico para este campo.';
      }
    }

    if (selectedField.type === 'select' && this.operatorRequiresValue(this.selectedSequenceFlowOperator)) {
      if (!this.normalizeSelectOptions(selectedField).some((option) => option.value === this.selectedSequenceFlowValue)) {
        return 'Debes elegir una opcion valida para este campo.';
      }
    }

    return '';
  }

  private refreshGeneratedExpressionPreview(): void {
    if (this.selectedSequenceFlowDefaultDraft) {
      this.selectedSequenceFlowGeneratedExpression = '';
      return;
    }

    const selectedField = this.getSelectedConditionField();
    if (!selectedField || !this.selectedSequenceFlowOperator) {
      this.selectedSequenceFlowGeneratedExpression = '';
      return;
    }

    if (this.operatorRequiresValue(this.selectedSequenceFlowOperator) && !this.selectedSequenceFlowValue.trim()) {
      this.selectedSequenceFlowGeneratedExpression = '';
      return;
    }

    this.selectedSequenceFlowGeneratedExpression = this.buildBpmnConditionExpression(
      selectedField,
      this.selectedSequenceFlowOperator,
      this.selectedSequenceFlowValue,
    );
  }

  private buildBpmnConditionExpression(
    field: ConditionFieldOption,
    operator: ConditionOperator,
    rawValue: string,
  ): string {
    const fieldReference = field.name;
    const normalizedValue = this.formatBpmnLiteral(field, rawValue);

    switch (operator) {
      case 'equals':
        return `\${${fieldReference} == ${normalizedValue}}`;
      case 'not_equals':
        return `\${${fieldReference} != ${normalizedValue}}`;
      case 'contains':
        return `\${${fieldReference} != null && ${fieldReference}.contains(${normalizedValue})}`;
      case 'not_contains':
        return `\${${fieldReference} == null || !${fieldReference}.contains(${normalizedValue})}`;
      case 'greater_than':
        return `\${${fieldReference} > ${normalizedValue}}`;
      case 'less_than':
        return `\${${fieldReference} < ${normalizedValue}}`;
      case 'greater_or_equal':
        return `\${${fieldReference} >= ${normalizedValue}}`;
      case 'less_or_equal':
        return `\${${fieldReference} <= ${normalizedValue}}`;
      case 'before':
        return `\${${fieldReference} < ${normalizedValue}}`;
      case 'after':
        return `\${${fieldReference} > ${normalizedValue}}`;
      case 'exists':
        return `\${${fieldReference} != null}`;
      case 'not_exists':
        return `\${${fieldReference} == null}`;
      case 'is_true':
        return `\${${fieldReference} == true}`;
      case 'is_false':
        return `\${${fieldReference} == false}`;
      default:
        return '';
    }
  }

  private formatBpmnLiteral(field: ConditionFieldOption, rawValue: string): string {
    const trimmedValue = rawValue.trim();
    if (field.type === 'number') {
      return String(Number(trimmedValue));
    }

    if (/^(true|false)$/i.test(trimmedValue)) {
      return trimmedValue.toLowerCase();
    }

    return `"${trimmedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  private normalizeSelectOptions(field: ConditionFieldOption | null): Array<{ label: string; value: string }> {
    if (!field) {
      return [];
    }

    if (field.normalizedOptions?.length) {
      return field.normalizedOptions;
    }

    const rawOptions = this.readRawSelectOptions(field);
    return rawOptions
      .map((option) => this.normalizeSelectOptionEntry(option))
      .filter((option): option is { label: string; value: string } => !!option);
  }

  private getConditionFieldOptions(field: ConditionFieldOption | null): Array<{ label: string; value: string }> {
    return this.normalizeSelectOptions(field);
  }

  private readRawSelectOptions(field: ConditionFieldOption): unknown[] {
    const candidates = [
      (field as unknown as { optionItems?: unknown }).optionItems,
      (field as unknown as { options?: unknown }).options,
      (field as unknown as { values?: unknown }).values,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.split(',').map((value) => value.trim()).filter((value) => !!value);
      }
    }

    return [];
  }

  private normalizeSelectOptionEntry(option: unknown): { label: string; value: string } | null {
    if (typeof option === 'string') {
      const trimmed = option.trim();
      if (!trimmed) {
        return null;
      }

      const splitMatch = trimmed.match(/^(.+?)\s*[=:|]\s*(.+)$/);
      if (splitMatch) {
        const label = splitMatch[1].trim();
        const value = splitMatch[2].trim();
        return { label: label || value, value: value || label };
      }

      return { label: trimmed, value: trimmed };
    }

    if (!option || typeof option !== 'object') {
      return null;
    }

    const candidate = option as Record<string, unknown>;
    const label = this.readStringCandidate(candidate['label']) || this.readStringCandidate(candidate['name']) || this.readStringCandidate(candidate['text']);
    const value =
      this.readStringCandidate(candidate['value']) ||
      this.readStringCandidate(candidate['id']) ||
      this.readStringCandidate(candidate['key']) ||
      label;

    if (!label && !value) {
      return null;
    }

    return {
      label: label || value,
      value: value || label,
    };
  }

  private readStringCandidate(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private getOperatorOptionsForField(field: ConditionFieldOption | null): Array<{ value: ConditionOperator }> {
    if (!field) {
      return [];
    }

    switch (field.type) {
      case 'text':
      case 'textarea':
        return [
          { value: 'equals' },
          { value: 'not_equals' },
          { value: 'contains' },
          { value: 'not_contains' },
          { value: 'exists' },
          { value: 'not_exists' },
        ];
      case 'number':
        return [
          { value: 'equals' },
          { value: 'not_equals' },
          { value: 'greater_than' },
          { value: 'less_than' },
          { value: 'greater_or_equal' },
          { value: 'less_or_equal' },
        ];
      case 'date':
        return [
          { value: 'equals' },
          { value: 'before' },
          { value: 'after' },
        ];
      case 'select':
        return [
          { value: 'equals' },
          { value: 'not_equals' },
        ];
      case 'checkbox':
        return [
          { value: 'is_true' },
          { value: 'is_false' },
        ];
      case 'checklist':
        return [
          { value: 'exists' },
          { value: 'not_exists' },
        ];
      case 'file':
        return [
          { value: 'exists' },
          { value: 'not_exists' },
        ];
      default:
        return [];
    }
  }

  private operatorRequiresValue(operator: ConditionOperator | ''): boolean {
    return (
      operator !== '' &&
      operator !== 'exists' &&
      operator !== 'not_exists' &&
      operator !== 'is_true' &&
      operator !== 'is_false'
    );
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

      modeling.updateProperties(laneElement, { name: binding.areaName });
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

  private validateFormDraftFields(): string {
    const duplicatedNames = new Set<string>();

    for (const field of this.formDraft.fields ?? []) {
      const trimmedName = field.name?.trim() || '';
      if (!trimmedName) {
        return 'Cada campo debe tener una variable Camunda.';
      }

      if (!/^[a-z][a-zA-Z0-9_]*$/.test(trimmedName)) {
        return `La variable "${trimmedName}" no es valida. Usa camelCase o snake_case sin espacios ni tildes.`;
      }

      if (duplicatedNames.has(trimmedName)) {
        return `La variable "${trimmedName}" esta repetida en el formulario.`;
      }

      duplicatedNames.add(trimmedName);

      if (!field.label?.trim()) {
        return `El campo "${trimmedName}" debe tener una etiqueta visible.`;
      }

      if (this.fieldSupportsOptionItems(field.type)) {
        const optionItems = this.normalizeFieldOptionItems(field);
        if (!optionItems.length) {
          return `El campo "${trimmedName}" debe tener al menos una opcion.`;
        }

        const seenValues = new Set<string>();
        for (const option of optionItems) {
          if (!option.label.trim() || !option.value.trim()) {
            return `Todas las opciones del campo "${trimmedName}" deben tener label y value.`;
          }
          if (seenValues.has(option.value)) {
            return `El campo "${trimmedName}" tiene opciones con values repetidos.`;
          }
          seenValues.add(option.value);
        }
      }
    }

    return '';
  }

  private normalizeFormFieldForSave(field: FormFieldDefinition, order: number): FormFieldDefinition {
    const optionItems = this.normalizeFieldOptionItems(field);
    const normalizedType = field.type as FormFieldType;

    return {
      ...field,
      name: field.name.trim(),
      label: field.label.trim(),
      type: normalizedType,
      placeholder: this.fieldSupportsPlaceholder(normalizedType) ? (field.placeholder ?? '') : '',
      helpText: field.helpText ?? '',
      order,
      options: this.fieldSupportsOptionItems(normalizedType)
        ? optionItems.map((option) => option.value)
        : [],
      optionItems: this.fieldSupportsOptionItems(normalizedType) ? optionItems : [],
    };
  }

  private normalizeFieldOptionItems(field: FormFieldDefinition): FormFieldOptionDefinition[] {
    const fromOptionItems = this.normalizeOptionCollection(field.optionItems);
    if (fromOptionItems.length) {
      return fromOptionItems;
    }

    const fromOptions = this.normalizeOptionCollection(field.options);
    if (fromOptions.length) {
      return fromOptions;
    }

    return [];
  }

  private normalizeOptionCollection(rawOptions: unknown): FormFieldOptionDefinition[] {
    if (!rawOptions) {
      return [];
    }

    const values = Array.isArray(rawOptions) ? rawOptions : typeof rawOptions === 'string' ? this.splitLegacyOptions(rawOptions) : [];

    return values
      .map((option) => this.normalizeOptionValue(option))
      .filter((option): option is FormFieldOptionDefinition => !!option);
  }

  private normalizeOptionValue(option: unknown): FormFieldOptionDefinition | null {
    if (typeof option === 'string') {
      const trimmed = option.trim();
      if (!trimmed) {
        return null;
      }

      const splitMatch = trimmed.match(/^(.+?)\s*[=:|]\s*(.+)$/);
      if (splitMatch) {
        const label = splitMatch[1].trim();
        const value = splitMatch[2].trim();
        return label || value ? { label: label || value, value: value || label } : null;
      }

      return { label: trimmed, value: trimmed };
    }

    if (option && typeof option === 'object') {
      const candidate = option as Record<string, unknown>;
      const label = this.readStringCandidate(candidate['label']) || this.readStringCandidate(candidate['name']) || this.readStringCandidate(candidate['text']);
      const value =
        this.readStringCandidate(candidate['value']) ||
        this.readStringCandidate(candidate['id']) ||
        this.readStringCandidate(candidate['key']) ||
        label;

      if (!label && !value) {
        return null;
      }

      return {
        label: label || value,
        value: value || label,
      };
    }

    return null;
  }

  private splitLegacyOptions(rawValue: string): string[] {
    return rawValue
      .split(/[,\n;]/)
      .map((option) => option.trim())
      .filter((option) => !!option);
  }

  private fieldSupportsPlaceholder(type: FormFieldType): boolean {
    return type === 'text' || type === 'textarea' || type === 'number';
  }

  private fieldSupportsOptionItems(type: FormFieldType): boolean {
    return type === 'select' || type === 'checklist';
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
    const extensionValues = laneElement.businessObject.extensionElements?.values ?? [];
    const values = extensionValues.filter((value: any) => value?.$type !== 'custom:areaRef');

    if (areaId) {
      values.push(moddle.create('custom:areaRef', { body: areaId }));
    }

    const extensionElements = moddle.create('bpmn:ExtensionElements', { values });
    const updatedProperties: Record<string, unknown> = { extensionElements };

    if (areaName && areaName !== 'Area no encontrada') {
      updatedProperties['name'] = areaName;
    }

    modeling.updateProperties(laneElement, updatedProperties);
  }

  private normalizeExportedXml(xml: string): string {
    if (!xml.trim()) {
      return xml;
    }

    const document = new DOMParser().parseFromString(xml, 'application/xml');
    if (document.getElementsByTagName('parsererror')[0]) {
      return xml;
    }

    const processElement = document.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'process')[0];
    if (!processElement) {
      return xml;
    }

    const normalizedProcessKey = this.normalizeProcessKey(this.processKey || this.processName);
    const normalizedProcessName = this.processName?.trim() || 'Proceso sin nombre';

    processElement.setAttribute('id', normalizedProcessKey);
    processElement.setAttribute('name', normalizedProcessName);
    processElement.setAttribute('isExecutable', 'true');

    const participant = document.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'participant')[0];
    if (participant) {
      participant.setAttribute('processRef', normalizedProcessKey);
      if (!participant.getAttribute('name')) {
        participant.setAttribute('name', normalizedProcessName);
      }
    }

    return new XMLSerializer().serializeToString(document);
  }

  private normalizeProcessKey(source: string): string {
    const cleaned = (source ?? '').trim().toLowerCase();
    if (!cleaned) {
      return 'proceso_sin_nombre';
    }

    return (
      cleaned
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'proceso_sin_nombre'
    );
  }
}
