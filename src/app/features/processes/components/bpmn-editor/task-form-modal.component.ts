import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FormDefinition,
  FormFieldDefinition,
  FormFieldOptionDefinition,
  FormFieldType,
} from '../../../../core/models/form.models';

@Component({
  selector: 'app-task-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form-modal.component.html',
  styleUrl: './task-form-modal.component.css',
})
export class TaskFormModalComponent {
  @Input() open = false;
  @Input() formLoading = false;
  @Input() formSaving = false;
  @Input() formError = '';
  @Input() formSuccess = '';
  @Input() formContext = '';
  @Input() formDraft: FormDefinition = {
    id: '',
    processKey: '',
    processVersion: 0,
    taskDefinitionKey: '',
    title: '',
    fields: [],
    active: true,
  };

  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly addField = new EventEmitter<void>();
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly removeField = new EventEmitter<number>();
  @Output() readonly moveField = new EventEmitter<{ index: number; direction: -1 | 1 }>();

  protected previewValues: Record<string, unknown> = {};

  protected ensureOptionItems(field: FormFieldDefinition): FormFieldOptionDefinition[] {
    if (field.optionItems?.length) {
      return field.optionItems;
    }

    const fallback = (field.options ?? []).map((option) => ({
      label: option,
      value: option,
    }));
    field.optionItems = fallback;
    return fallback;
  }

  protected supportsPlaceholder(field: FormFieldDefinition): boolean {
    return field.type === 'text' || field.type === 'textarea' || field.type === 'number';
  }

  protected supportsOptions(field: FormFieldDefinition): boolean {
    return field.type === 'select' || field.type === 'checklist';
  }

  protected onVariableInput(field: FormFieldDefinition): void {
    field.name = field.name ?? '';
    if (!field.label?.trim()) {
      field.label = this.humanizeVariable(field.name);
    }
  }

  protected suggestVariable(field: FormFieldDefinition): void {
    field.name = this.normalizeVariableName(field.name || field.label || '');
  }

  protected getVariableSuggestion(field: FormFieldDefinition): string {
    const suggestion = this.normalizeVariableName(field.name || field.label || '');
    return suggestion && suggestion !== field.name ? suggestion : '';
  }

  protected getVariableValidationMessage(field: FormFieldDefinition): string {
    const value = field.name?.trim() || '';
    if (!value) {
      return 'La variable Camunda es obligatoria.';
    }

    if (!/^[a-z][a-zA-Z0-9_]*$/.test(value)) {
      return 'Usa solo letras, numeros o guion bajo, sin espacios ni tildes.';
    }

    return '';
  }

  protected onFieldTypeChange(field: FormFieldDefinition): void {
    if (!this.supportsPlaceholder(field)) {
      field.placeholder = '';
    }

    if (!this.supportsOptions(field)) {
      field.options = [];
      field.optionItems = [];
    } else {
      this.ensureOptionItems(field);
      this.syncLegacyOptions(field);
    }
  }

  protected addOption(field: FormFieldDefinition): void {
    const optionItems = this.ensureOptionItems(field);
    optionItems.push({
      label: '',
      value: '',
    });
    this.syncLegacyOptions(field);
  }

  protected removeOption(field: FormFieldDefinition, index: number): void {
    field.optionItems = this.ensureOptionItems(field).filter((_, currentIndex) => currentIndex !== index);
    this.syncLegacyOptions(field);
  }

  protected onOptionChange(field: FormFieldDefinition, option: FormFieldOptionDefinition): void {
    if (!option.value?.trim() && option.label?.trim()) {
      option.value = this.normalizeVariableName(option.label);
    }
    this.syncLegacyOptions(field);
  }

  protected getPreviewValue(fieldName: string): unknown {
    return this.previewValues[fieldName];
  }

  protected setPreviewValue(fieldName: string, value: unknown): void {
    this.previewValues[fieldName] = value;
  }

  protected togglePreviewChecklist(field: FormFieldDefinition, optionValue: string, checked: boolean): void {
    const currentValue = this.getPreviewChecklistValues(field.name);
    const nextValue = checked
      ? [...currentValue, optionValue]
      : currentValue.filter((value) => value !== optionValue);
    this.previewValues[field.name] = nextValue;
  }

  protected getPreviewChecklistValues(fieldName: string): string[] {
    const value = this.previewValues[fieldName];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  protected getFieldInputType(field: FormFieldDefinition): 'text' | 'number' | 'date' {
    if (field.type === 'number') {
      return 'number';
    }

    if (field.type === 'date') {
      return 'date';
    }

    return 'text';
  }

  protected trackOption(index: number): number {
    return index;
  }

  private syncLegacyOptions(field: FormFieldDefinition): void {
    field.options = this.ensureOptionItems(field)
      .map((option) => option.value?.trim())
      .filter((value): value is string => !!value);
  }

  private normalizeVariableName(source: string): string {
    const cleaned = (source ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]+/g, ' ')
      .trim();

    if (!cleaned) {
      return '';
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    const [first, ...rest] = words;
    return [
      first.charAt(0).toLowerCase() + first.slice(1),
      ...rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)),
    ].join('');
  }

  private humanizeVariable(value: string): string {
    const normalized = value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').trim();
    return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '';
  }
}
