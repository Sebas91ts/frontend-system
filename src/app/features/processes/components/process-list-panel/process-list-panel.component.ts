import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Proceso } from '../../../../core/models/process.models';

type ProcessGroup = {
  processKey: string;
  procesos: Proceso[];
  expanded: boolean;
};

@Component({
  selector: 'app-process-list-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-list-panel.component.html',
  styleUrl: './process-list-panel.component.css',
})
export class ProcessListPanelComponent {
  private _procesos: Proceso[] = [];

  @Input()
  set procesos(value: Proceso[]) {
    this._procesos = value ?? [];
    this.expandedKeys = new Set(this._procesos.map((proceso) => proceso.processKey || 'sin_clave'));
  }

  get procesos(): Proceso[] {
    return this._procesos;
  }

  @Input() loading = false;
  @Input() publishingId: string | null = null;
  @Input() versioningId: string | null = null;
  @Input() startingId: string | null = null;

  @Output() processSelected = new EventEmitter<Proceso>();
  @Output() publishProcess = new EventEmitter<Proceso>();
  @Output() versionProcess = new EventEmitter<Proceso>();
  @Output() startProcess = new EventEmitter<Proceso>();
  @Output() monitorProcess = new EventEmitter<Proceso>();

  private expandedKeys = new Set<string>();

  get groupedProcesses(): ProcessGroup[] {
    const groups = new Map<string, Proceso[]>();

    for (const proceso of this._procesos) {
      const key = proceso.processKey || 'sin_clave';
      const current = groups.get(key) ?? [];
      current.push(proceso);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([processKey, procesos]) => ({
        processKey,
        procesos: procesos.sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
        expanded: this.expandedKeys.has(processKey),
      }))
      .sort((a, b) => a.processKey.localeCompare(b.processKey));
  }

  toggleGroup(processKey: string): void {
    if (this.expandedKeys.has(processKey)) {
      this.expandedKeys.delete(processKey);
      return;
    }

    this.expandedKeys.add(processKey);
  }

  isGroupExpanded(processKey: string): boolean {
    return this.expandedKeys.has(processKey);
  }
}
