import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Area } from '../../../../core/models/area.models';
import { TaskDocumentConfigCreateRequest } from '../../../../core/models/document-config.models';
import { DocumentAreaAccessRule } from '../../../../core/models/document-lifecycle.models';
import { DocumentRequirement } from '../../../../core/models/document-config.models';

@Component({
  selector: 'app-task-document-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-document-modal.component.html',
  styleUrl: './task-document-modal.component.css',
})
export class TaskDocumentModalComponent {
  protected readonly fileTypeOptions = [
    { label: 'PDF', mimeTypes: ['application/pdf'] },
    {
      label: 'Word',
      mimeTypes: [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    },
    {
      label: 'Excel',
      mimeTypes: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    },
    {
      label: 'PowerPoint',
      mimeTypes: [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
    },
    { label: 'Imagen', mimeTypes: ['image/*'] },
    { label: 'Otros', mimeTypes: ['application/octet-stream'] },
  ];

  protected readonly fileSizeOptions = [
    { label: '1 MB', bytes: 1_048_576 },
    { label: '5 MB', bytes: 5_242_880 },
    { label: '10 MB', bytes: 10_485_760 },
    { label: '20 MB', bytes: 20_971_520 },
    { label: '50 MB', bytes: 52_428_800 },
    { label: '100 MB', bytes: 104_857_600 },
  ];

  protected advancedMimeMode = false;

  @Input() open = false;
  @Input() loading = false;
  @Input() saving = false;
  @Input() error = '';
  @Input() success = '';
  @Input() context = '';
  @Input() activeAreas: Area[] = [];
  @Input() draft: TaskDocumentConfigCreateRequest = {
    processKey: '',
    processVersion: 0,
    taskDefinitionKey: '',
    documentDirection: 'INPUT',
    required: false,
    allowUpload: true,
    allowMultipleFiles: false,
    editable: false,
    allowEditing: false,
    collaborativeEditing: false,
    requireApproval: false,
    readOnlyAfterComplete: false,
    allowedMimeTypes: [],
    maxFiles: 1,
    permissions: {
      canView: true,
      canUpload: true,
      canDownload: true,
    },
    allowedAreaIds: [],
    accessRules: [],
    shareWithNextArea: false,
  };

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly addAreaRule = new EventEmitter<string>();
  @Output() readonly removeAreaRule = new EventEmitter<number>();

  protected selectedRequirementIndex = 0;

  protected get requirements(): DocumentRequirement[] {
    this.draft.documentRequirements ??= [];
    return this.draft.documentRequirements;
  }

  protected get selectedRequirement(): DocumentRequirement | null {
    if (!this.requirements.length) {
      return null;
    }
    if (this.selectedRequirementIndex >= this.requirements.length) {
      this.selectedRequirementIndex = this.requirements.length - 1;
    }
    return this.requirements[this.selectedRequirementIndex];
  }

  protected selectRequirement(index: number): void {
    this.selectedRequirementIndex = index;
  }

  protected addRequirement(): void {
    this.requirements.push({
      id: this.createRequirementId(),
      name: `Documento ${this.requirements.length + 1}`,
      description: '',
      documentDirection: 'INPUT',
      required: false,
      allowUpload: true,
      allowMultipleFiles: false,
      editable: false,
      collaborativeEditing: false,
      requireApproval: false,
      readOnlyAfterComplete: false,
      allowedMimeTypes: [],
      maxFiles: 1,
      ownerAreaId: '',
      allowedAreaIds: [],
      accessRules: [],
      documentLifecyclePolicy: 'TASK_ONLY',
    });
    this.selectedRequirementIndex = this.requirements.length - 1;
  }

  protected removeRequirement(index: number): void {
    this.draft.documentRequirements = this.requirements.filter((_, currentIndex) => currentIndex !== index);
    this.selectedRequirementIndex = Math.max(0, Math.min(this.selectedRequirementIndex, this.requirements.length - 1));
  }

  protected mimeTypesText(): string {
    return (this.selectedRequirement?.allowedMimeTypes ?? []).join(', ');
  }

  protected setMimeTypes(value: string): void {
    if (!this.selectedRequirement) {
      return;
    }
    this.selectedRequirement.allowedMimeTypes = value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  protected isFileTypeSelected(requirement: DocumentRequirement, mimeTypes: string[]): boolean {
    const selected = new Set(requirement.allowedMimeTypes ?? []);
    return mimeTypes.some((mimeType) => selected.has(mimeType));
  }

  protected toggleFileType(requirement: DocumentRequirement, mimeTypes: string[], checked: boolean): void {
    const selected = new Set(requirement.allowedMimeTypes ?? []);
    for (const mimeType of mimeTypes) {
      if (checked) {
        selected.add(mimeType);
      } else {
        selected.delete(mimeType);
      }
    }
    requirement.allowedMimeTypes = Array.from(selected);
  }

  protected selectedFileTypeLabels(requirement: DocumentRequirement): string {
    const labels = this.fileTypeOptions
      .filter((option) => this.isFileTypeSelected(requirement, option.mimeTypes))
      .map((option) => option.label);
    return labels.length ? labels.join(', ') : 'Todos los tipos permitidos por el sistema';
  }

  protected setMaxFileSize(requirement: DocumentRequirement, value: string): void {
    requirement.maxFileSizeBytes = value ? Number(value) : undefined;
  }

  protected directionLabel(requirement: DocumentRequirement): string {
    return requirement.documentDirection === 'OUTPUT'
      ? 'Documento que genera esta tarea'
      : 'Documento que recibe esta tarea';
  }

  protected directionHelp(requirement: DocumentRequirement): string {
    return requirement.documentDirection === 'OUTPUT'
      ? 'Esta tarea crea o solicita este documento.'
      : 'Este documento fue creado o cargado en una tarea anterior.';
  }

  protected onDirectionChange(requirement: DocumentRequirement, direction: 'INPUT' | 'OUTPUT'): void {
    requirement.documentDirection = direction;
    if (direction === 'OUTPUT' && (!requirement.documentLifecyclePolicy || requirement.documentLifecyclePolicy === 'TASK_ONLY')) {
      requirement.documentLifecyclePolicy = 'AVAILABLE_FOR_NEXT_TASKS';
    }
    if (direction === 'INPUT' && !requirement.documentLifecyclePolicy) {
      requirement.documentLifecyclePolicy = 'TASK_ONLY';
    }
  }

  protected lifecycleLabel(value?: string): string {
    if (value === 'AVAILABLE_FOR_NEXT_TASKS') return 'Disponible para tareas posteriores';
    if (value === 'AVAILABLE_FOR_INSTANCE') return 'Disponible durante todo el proceso';
    if (value === 'PUBLISH_ON_PROCESS_END') return 'Publicar en repositorio al finalizar el proceso';
    return 'Solo para esta tarea';
  }

  protected lifecycleHelp(value?: string): string {
    if (value === 'AVAILABLE_FOR_NEXT_TASKS') return 'Las siguientes tareas podran utilizar este documento.';
    if (value === 'AVAILABLE_FOR_INSTANCE') return 'El documento estara disponible durante toda la instancia BPM.';
    if (value === 'PUBLISH_ON_PROCESS_END') return 'El documento sera enviado al repositorio documental cuando el proceso termine.';
    return 'El documento se usa solo en esta tarea.';
  }

  protected selectedAccessAreas(): string[] {
    return (this.selectedRequirement?.accessRules ?? []).map((rule) => rule.areaId).filter(Boolean);
  }

  protected availableAreas(): Area[] {
    const selected = new Set(this.selectedAccessAreas());
    return this.activeAreas.filter((area) => area.id && !selected.has(area.id));
  }

  protected areaName(areaId?: string): string {
    if (!areaId) {
      return 'Sin area';
    }
    return this.activeAreas.find((area) => area.id === areaId)?.nombre || areaId;
  }

  protected onOwnerAreaChange(areaId: string): void {
    if (this.selectedRequirement) {
      this.selectedRequirement.ownerAreaId = areaId || undefined;
    }
  }

  protected onAddArea(areaId: string): void {
    if (!areaId || !this.selectedRequirement) {
      return;
    }
    const rules = this.selectedRequirement.accessRules ?? [];
    if (rules.some((rule) => rule.areaId === areaId)) {
      return;
    }
    this.selectedRequirement.accessRules = [
      ...rules,
      {
        areaId,
        canView: true,
        canDownload: true,
        canUpload: false,
        canEdit: false,
        canApprove: false,
        canReject: false,
        canLock: false,
      },
    ];
    this.selectedRequirement.allowedAreaIds = this.selectedRequirement.accessRules.map((rule) => rule.areaId);
  }

  protected removeRule(index: number): void {
    if (!this.selectedRequirement) {
      return;
    }
    this.selectedRequirement.accessRules = (this.selectedRequirement.accessRules ?? []).filter((_, currentIndex) => currentIndex !== index);
    this.selectedRequirement.allowedAreaIds = this.selectedRequirement.accessRules.map((rule) => rule.areaId);
  }

  protected ensureRuleDefaults(rule: DocumentAreaAccessRule): DocumentAreaAccessRule {
    rule.canView ??= true;
    rule.canDownload ??= true;
    rule.canUpload ??= false;
    rule.canEdit ??= false;
    rule.canApprove ??= false;
    rule.canReject ??= false;
    rule.canLock ??= false;
    return rule;
  }

  protected countRequired(): number {
    return this.requirements.filter((requirement) => requirement.required).length;
  }

  protected countEditable(): number {
    return this.requirements.filter((requirement) => requirement.editable).length;
  }

  protected countApproval(): number {
    return this.requirements.filter((requirement) => requirement.requireApproval).length;
  }

  protected countShared(): number {
    return this.requirements.filter((requirement) => (requirement.accessRules?.length ?? 0) > 0).length;
  }

  protected requirementBadges(requirement: DocumentRequirement): string[] {
    const badges = [this.directionLabel(requirement)];
    if (requirement.required) badges.push('Obligatorio');
    if (requirement.editable) badges.push('OnlyOffice');
    if (requirement.requireApproval) badges.push('Requiere aprobacion');
    if ((requirement.accessRules?.length ?? 0) > 0) badges.push('Compartido');
    return badges;
  }

  private createRequirementId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
