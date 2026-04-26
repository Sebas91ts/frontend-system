import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Proceso } from '../../../../core/models/process.models';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';

type ProcessFamilyCard = {
  processKey: string;
  procesos: Proceso[];
  latest: Proceso;
};

@Component({
  selector: 'app-process-list-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './process-list-panel.component.html',
  styleUrl: './process-list-panel.component.css',
})
export class ProcessListPanelComponent {
  private readonly preferences = inject(UiPreferencesService);
  private _procesos: Proceso[] = [];

  @Input()
  set procesos(value: Proceso[]) {
    this._procesos = value ?? [];
  }

  get procesos(): Proceso[] {
    return this._procesos;
  }

  @Input() loading = false;

  @Output() familySelected = new EventEmitter<string>();

  t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  get groupedFamilies(): ProcessFamilyCard[] {
    const groups = new Map<string, Proceso[]>();

    for (const proceso of this._procesos) {
      const key = proceso.processKey || 'sin_clave';
      const current = groups.get(key) ?? [];
      current.push(proceso);
      groups.set(key, current);
    }

    return Array.from(groups.entries())
      .map(([processKey, procesos]) => {
        const sortedByVersion = [...procesos].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
        const latest = [...procesos].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0] ?? sortedByVersion[0];
        return {
          processKey,
          procesos: sortedByVersion,
          latest,
        };
      })
      .sort((a, b) => (b.latest?.createdAt ?? '').localeCompare(a.latest?.createdAt ?? ''));
  }

  openFamily(processKey: string): void {
    this.familySelected.emit(processKey);
  }

  protected countByState(procesos: Proceso[], state: 'BORRADOR' | 'PUBLICADO' | 'HISTORICO'): number {
    return procesos.filter((proceso) => proceso.estado === state).length;
  }
}
