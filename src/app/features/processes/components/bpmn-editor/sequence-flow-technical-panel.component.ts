import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConditionFieldOption,
  ConditionOperator,
  ConditionOperatorOption,
  SequenceFlowTechnicalState,
} from './bpmn-editor.types';

@Component({
  selector: 'app-sequence-flow-technical-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sequence-flow-technical-panel.component.html',
  styleUrl: './sequence-flow-technical-panel.component.css',
})
export class SequenceFlowTechnicalPanelComponent {
  @Input() visible = false;
  @Input() readonlyMode = false;
  @Input() technicalState: SequenceFlowTechnicalState | null = null;
  @Input() availableFields: ConditionFieldOption[] = [];
  @Input() selectedFieldName = '';
  @Input() selectedOperator: ConditionOperator | '' = '';
  @Input() conditionValue = '';
  @Input() generatedExpression = '';
  @Input() defaultFlowDraft = false;
  @Input() feedbackMessage = '';
  @Input() validationMessage = '';
  @Input() parseWarningMessage = '';
  @Input() fieldsLoading = false;
  @Input() fieldsError = '';
  @Input() emptyFieldsMessage = '';

  @Output() readonly selectedFieldNameChange = new EventEmitter<string>();
  @Output() readonly selectedOperatorChange = new EventEmitter<ConditionOperator | ''>();
  @Output() readonly conditionValueChange = new EventEmitter<string>();
  @Output() readonly defaultFlowDraftChange = new EventEmitter<boolean>();
  @Output() readonly applyChanges = new EventEmitter<void>();

  protected resolvedSelectedField: ConditionFieldOption | null = null;
  protected resolvedValueOptions: Array<{ label: string; value: string }> = [];

  protected get selectedField(): ConditionFieldOption | null {
    return this.resolvedSelectedField;
  }

  protected get operatorOptions(): ConditionOperatorOption[] {
    const fieldType = this.selectedField?.type;
    if (!fieldType) {
      return [];
    }

    return OPERATOR_OPTIONS_BY_TYPE[fieldType];
  }

  protected get selectedOperatorConfig(): ConditionOperatorOption | null {
    return this.operatorOptions.find((operator) => operator.value === this.selectedOperator) ?? null;
  }

  protected get requiresValue(): boolean {
    return this.selectedOperatorConfig?.requiresValue ?? false;
  }

  protected get usesSelectInput(): boolean {
    return this.selectedField?.type === 'select';
  }

  protected get usesDateInput(): boolean {
    return this.selectedField?.type === 'date';
  }

  protected get usesNumberInput(): boolean {
    return this.resolvedSelectedField?.type === 'number';
  }

  protected get valueOptions() {
    return this.resolvedValueOptions;
  }

  ngOnChanges(): void {
    this.refreshResolvedField();
  }

  private refreshResolvedField(): void {
    this.resolvedSelectedField = this.availableFields.find((field) => field.name === this.selectedFieldName) ?? null;
    this.resolvedValueOptions = this.resolvedSelectedField ? this.normalizeSelectOptions(this.resolvedSelectedField) : [];
  }

  private normalizeSelectOptions(field: ConditionFieldOption): Array<{ label: string; value: string }> {
    const rawOptions = [
      field.optionItems,
      field.options,
      (field as unknown as { values?: unknown }).values,
    ];

    for (const candidate of rawOptions) {
      const normalized = this.normalizeSelectOptionSource(candidate);
      if (normalized.length) {
        return normalized;
      }
    }

    return [];
  }

  private normalizeSelectOptionSource(source: unknown): Array<{ label: string; value: string }> {
    if (!source) {
      return [];
    }

    const items = Array.isArray(source)
      ? source
      : typeof source === 'string'
        ? source.split(',').map((option) => option.trim()).filter((option) => !!option)
        : [];

    return items
      .map((option) => this.normalizeSelectOptionEntry(option))
      .filter((option): option is { label: string; value: string } => !!option);
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
}

const OPERATOR_OPTIONS_BY_TYPE: Record<ConditionFieldOption['type'], ConditionOperatorOption[]> = {
  text: [
    { value: 'equals', label: 'igual a', requiresValue: true },
    { value: 'not_equals', label: 'distinto de', requiresValue: true },
    { value: 'contains', label: 'contiene', requiresValue: true },
    { value: 'not_contains', label: 'no contiene', requiresValue: true },
    { value: 'exists', label: 'existe', requiresValue: false },
    { value: 'not_exists', label: 'no existe', requiresValue: false },
  ],
  textarea: [
    { value: 'equals', label: 'igual a', requiresValue: true },
    { value: 'not_equals', label: 'distinto de', requiresValue: true },
    { value: 'contains', label: 'contiene', requiresValue: true },
    { value: 'not_contains', label: 'no contiene', requiresValue: true },
    { value: 'exists', label: 'existe', requiresValue: false },
    { value: 'not_exists', label: 'no existe', requiresValue: false },
  ],
  number: [
    { value: 'equals', label: 'igual a', requiresValue: true },
    { value: 'not_equals', label: 'distinto de', requiresValue: true },
    { value: 'greater_than', label: 'mayor que', requiresValue: true },
    { value: 'less_than', label: 'menor que', requiresValue: true },
    { value: 'greater_or_equal', label: 'mayor o igual que', requiresValue: true },
    { value: 'less_or_equal', label: 'menor o igual que', requiresValue: true },
  ],
  date: [
    { value: 'equals', label: 'igual a', requiresValue: true },
    { value: 'before', label: 'antes de', requiresValue: true },
    { value: 'after', label: 'despues de', requiresValue: true },
  ],
  select: [
    { value: 'equals', label: 'igual a', requiresValue: true },
    { value: 'not_equals', label: 'distinto de', requiresValue: true },
  ],
  checkbox: [
    { value: 'is_true', label: 'es verdadero', requiresValue: false },
    { value: 'is_false', label: 'es falso', requiresValue: false },
  ],
  checklist: [
    { value: 'exists', label: 'existe', requiresValue: false },
    { value: 'not_exists', label: 'no existe', requiresValue: false },
  ],
  file: [
    { value: 'exists', label: 'existe', requiresValue: false },
    { value: 'not_exists', label: 'no existe', requiresValue: false },
  ],
};
