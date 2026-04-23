import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SequenceFlowTechnicalState } from './bpmn-editor.types';

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
  @Input() conditionDraft = '';
  @Input() defaultFlowDraft = false;
  @Input() feedbackMessage = '';

  @Output() readonly conditionDraftChange = new EventEmitter<string>();
  @Output() readonly defaultFlowDraftChange = new EventEmitter<boolean>();
  @Output() readonly applyChanges = new EventEmitter<void>();
}
