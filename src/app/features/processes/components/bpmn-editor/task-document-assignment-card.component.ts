import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-task-document-assignment-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-document-assignment-card.component.html',
  styleUrl: './task-document-assignment-card.component.css',
})
export class TaskDocumentAssignmentCardComponent {
  @Input() visible = false;
  @Input() readonlyMode = false;
  @Input() selectedUserTaskLabel = 'Ninguna userTask seleccionada';
  @Input() summary = 'Sin documentos configurados';
  @Input() hasDocumentConfig = false;

  @Output() readonly configure = new EventEmitter<void>();
}
