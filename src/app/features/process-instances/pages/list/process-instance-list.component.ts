import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessInstance } from '../../../../core/models/process-instance.models';
import { ProcessInstanceService } from '../../../../core/services/process-instance.service';

type DateFilter = 'today' | 'all';
type StateFilter = 'all' | 'ACTIVA' | 'FINALIZADA' | 'SIN_DATOS';

@Component({
  selector: 'app-process-instance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-instance-list.component.html',
  styleUrl: './process-instance-list.component.css',
})
export class ProcessInstanceListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly processInstanceService = inject(ProcessInstanceService);

  protected isLoading = true;
  protected errorMessage = '';
  protected readonly searchTerm = signal('');
  protected readonly dateFilter = signal<DateFilter>('today');
  protected readonly stateFilter = signal<StateFilter>('all');
  protected readonly processFilter = signal('all');
  protected readonly instances = signal<ProcessInstance[]>([]);

  protected readonly processOptions = computed(() => {
    const values = this.instances()
      .map((item) => item.nombreProceso?.trim() || item.processKey?.trim() || '')
      .filter((value) => !!value);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  });

  protected readonly filteredInstances = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const dateFilter = this.dateFilter();
    const stateFilter = this.stateFilter();
    const processFilter = this.processFilter();

    return this.instances().filter((item) => {
      if (dateFilter === 'today' && !this.isToday(item.startedAt)) {
        return false;
      }

      if (stateFilter !== 'all' && (item.estado || 'SIN_DATOS') !== stateFilter) {
        return false;
      }

      const processLabel = item.nombreProceso?.trim() || item.processKey?.trim() || '';
      if (processFilter !== 'all' && processLabel !== processFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        item.nombreProceso,
        item.processKey,
        item.iniciadoPor,
        item.id,
      ]
        .filter((value): value is string => !!value)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  });

  ngOnInit(): void {
    this.loadInstances();
  }

  protected setDateFilter(value: DateFilter): void {
    this.dateFilter.set(value);
  }

  protected setStateFilter(value: StateFilter): void {
    this.stateFilter.set(value);
  }

  protected updateProcessFilter(value: string): void {
    this.processFilter.set(value);
  }

  protected updateSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected reintentar(): void {
    this.loadInstances();
  }

  protected goBack(): void {
    void this.router.navigate(['/admin']);
  }

  protected goToTracking(instance: ProcessInstance): void {
    if (!instance.id) {
      return;
    }

    void this.router.navigate(['/process-instances', instance.id, 'tracking']);
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected getProcessLabel(item: ProcessInstance): string {
    const name = item.nombreProceso?.trim();
    if (name) {
      return name;
    }

    return item.processKey?.trim() || 'Proceso no identificado';
  }

  protected getVersionLabel(item: ProcessInstance): string {
    return item.version ? `v${item.version}` : 'Sin version';
  }

  protected getStateLabel(item: ProcessInstance): string {
    const state = item.estado?.trim().toUpperCase() || 'SIN_DATOS';
    if (state === 'ACTIVA') {
      return 'Activa';
    }
    if (state === 'FINALIZADA') {
      return 'Finalizada';
    }
    return 'Sin datos';
  }

  protected getStateClass(item: ProcessInstance): string {
    const state = item.estado?.trim().toUpperCase() || 'SIN_DATOS';
    if (state === 'ACTIVA') {
      return 'status-pill status-pill--active';
    }
    if (state === 'FINALIZADA') {
      return 'status-pill status-pill--finished';
    }
    return 'status-pill status-pill--muted';
  }

  protected trackByInstance(_: number, item: ProcessInstance): string {
    return item.id;
  }

  private loadInstances(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.processInstanceService.listar().pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.instances.set(this.sortInstances(items));
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.instances.set([]);
        this.errorMessage = error?.error?.message || 'No se pudieron cargar las instancias.';
        this.cdr.detectChanges();
      },
    });
  }

  private sortInstances(items: ProcessInstance[]): ProcessInstance[] {
    return [...items].sort((left, right) => {
      const leftToday = this.isToday(left.startedAt) ? 1 : 0;
      const rightToday = this.isToday(right.startedAt) ? 1 : 0;
      if (leftToday !== rightToday) {
        return rightToday - leftToday;
      }

      const leftTime = this.toTime(left.startedAt);
      const rightTime = this.toTime(right.startedAt);
      return rightTime - leftTime;
    });
  }

  private isToday(value?: string | null): boolean {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    const now = new Date();

    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  private toTime(value?: string | null): number {
    if (!value) {
      return 0;
    }

    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }
}
