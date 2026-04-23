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

  @Output() readonly selectedFieldNameChange = new EventEmitter<string>();
  @Output() readonly selectedOperatorChange = new EventEmitter<ConditionOperator | ''>();
  @Output() readonly conditionValueChange = new EventEmitter<string>();
  @Output() readonly defaultFlowDraftChange = new EventEmitter<boolean>();
  @Output() readonly applyChanges = new EventEmitter<void>();

  protected get selectedField(): ConditionFieldOption | null {
    return this.availableFields.find((field) => field.name === this.selectedFieldName) ?? null;
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
    return this.selectedField?.type === 'number';
  }

  protected get valueOptions() {
    return this.selectedField?.optionItems ?? [];
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
