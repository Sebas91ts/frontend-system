import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormDefinition, FormFieldDefinition } from '../../../../core/models/form.models';

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
  @Output() readonly updateOptions = new EventEmitter<{ field: FormFieldDefinition; raw: string }>();
}
