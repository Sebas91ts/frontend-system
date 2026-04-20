import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-process-dialogs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-dialogs.component.html',
  styleUrl: './process-dialogs.component.css',
})
export class ProcessDialogsComponent {
  @Input() saveDialogOpen = false;
  @Input() importConfirmOpen = false;
  @Input() newProcessDialogOpen = false;
  @Input() saving = false;
  @Input() importXml = '';
  @Input() processName = '';
  @Input() currentProcessId: string | null = null;
  @Input() saveDialogName = '';
  @Input() newProcessName = '';
  @Input() saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  @Input() saveDialogMessage = '';
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() processContext = '';

  @Output() saveDialogNameChange = new EventEmitter<string>();
  @Output() newProcessNameChange = new EventEmitter<string>();
  @Output() importXmlChange = new EventEmitter<string>();
  @Output() cancelSave = new EventEmitter<void>();
  @Output() confirmSave = new EventEmitter<void>();
  @Output() cancelImport = new EventEmitter<void>();
  @Output() confirmImport = new EventEmitter<void>();
  @Output() cancelNewProcess = new EventEmitter<void>();
  @Output() confirmNewProcess = new EventEmitter<void>();
}

