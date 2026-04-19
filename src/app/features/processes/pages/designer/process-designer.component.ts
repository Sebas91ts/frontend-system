import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BpmnEditorComponent } from '../../components/bpmn-editor/bpmn-editor.component';

@Component({
  selector: 'app-process-designer',
  standalone: true,
  imports: [CommonModule, BpmnEditorComponent],
  template: `
    <main class="min-h-screen bg-slate-950 text-slate-100">
      <app-bpmn-editor />
    </main>
  `,
})
export class ProcessDesignerComponent {}
