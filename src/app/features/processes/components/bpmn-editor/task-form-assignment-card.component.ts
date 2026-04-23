import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-task-form-assignment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-form-assignment-card.component.html',
  styleUrl: './task-form-assignment-card.component.css',
})
export class TaskFormAssignmentCardComponent {
  @Input() visible = false;
  @Input() selectedUserTaskLabel = 'Ninguna userTask seleccionada';
  @Input() taskFormContext = '';
  @Input() readonlyMode = false;
  @Input() hasTaskForm = false;

  @Output() readonly configure = new EventEmitter<void>();
}
