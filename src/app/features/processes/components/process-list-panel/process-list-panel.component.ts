import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Proceso } from '../../../../core/models/process.models';

@Component({
  selector: 'app-process-list-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-list-panel.component.html',
  styleUrl: './process-list-panel.component.css',
})
export class ProcessListPanelComponent {
  @Input() procesos: Proceso[] = [];
  @Input() loading = false;
  @Input() publishingId: string | null = null;

  @Output() processSelected = new EventEmitter<Proceso>();
  @Output() publishProcess = new EventEmitter<Proceso>();
}
