import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Proceso } from '../../../../core/models/process.models';
import { ProcessService } from '../../../../core/services/process.service';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';
import { validateExclusiveGatewayXml } from '../../shared/bpmn-gateway-validation';

type ProcessStatusFilter = 'all' | 'BORRADOR' | 'PUBLICADO' | 'HISTORICO';
type ProcessSortMode = 'recent' | 'name' | 'version';

@Component({
  selector: 'app-process-family-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './process-family-detail.component.html',
  styleUrl: './process-family-detail.component.css',
})
export class ProcessFamilyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly processService = inject(ProcessService);
  private readonly preferences = inject(UiPreferencesService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected familyKey = '';
  protected familyName = '';
  protected procesos: Proceso[] = [];
  protected isLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected searchQuery = '';
  protected statusFilter: ProcessStatusFilter = 'all';
  protected sortMode: ProcessSortMode = 'recent';
  protected publishingId: string | null = null;
  protected versioningId: string | null = null;
  protected startingId: string | null = null;

  t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  ngOnInit(): void {
    this.familyKey = decodeURIComponent(this.route.snapshot.paramMap.get('processKey') || '');
    this.loadFamily();
  }

  protected get filteredProcesos(): Proceso[] {
    const query = this.searchQuery.trim().toLowerCase();
    let items = [...this.procesos];

    if (this.statusFilter !== 'all') {
      items = items.filter((proceso) => proceso.estado === this.statusFilter);
    }

    if (query) {
      items = items.filter((proceso) => {
        const nombre = (proceso.nombre || '').toLowerCase();
        const key = (proceso.processKey || '').toLowerCase();
        const version = String(proceso.version ?? '').toLowerCase();
        return nombre.includes(query) || key.includes(query) || version.includes(query);
      });
    }

    return items.sort((a, b) => {
      if (this.sortMode === 'name') {
        return (a.nombre || '').localeCompare(b.nombre || '');
      }
      if (this.sortMode === 'version') {
        return (b.version ?? 0) - (a.version ?? 0);
      }
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    });
  }

  protected get hasFiltersApplied(): boolean {
    return !!this.searchQuery.trim() || this.statusFilter !== 'all' || this.sortMode !== 'recent';
  }

  protected get summaryCards(): Array<{ label: string; value: number }> {
    return [
      { label: this.t('processes.totalCount'), value: this.procesos.length },
      { label: this.t('processes.statusDraft'), value: this.countByStatus('BORRADOR') },
      { label: this.t('processes.statusPublished'), value: this.countByStatus('PUBLICADO') },
      { label: this.t('processes.statusHistoric'), value: this.countByStatus('HISTORICO') },
    ];
  }

  protected resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.sortMode = 'recent';
  }

  protected goBack(): void {
    void this.router.navigate(['/processes']);
  }

  protected openProcess(proceso: Proceso): void {
    void this.router.navigate(['/processes/designer', proceso.id]);
  }

  protected publishProceso(proceso: Proceso): void {
    if (this.publishingId || proceso.estado !== 'BORRADOR') {
      return;
    }

    const gatewayValidation = validateExclusiveGatewayXml(proceso.xml ?? '');
    if (!gatewayValidation.valid) {
      this.showMessage(gatewayValidation.message || this.t('processes.validationError'), 'error');
      return;
    }

    this.publishingId = proceso.id;
    this.processService
      .publicarProceso(proceso.id)
      .pipe(
        finalize(() => {
          this.publishingId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.procesos = this.procesos.map((item) => (item.id === response.data?.id ? response.data! : item));
          }
          this.showMessage(response.message || this.t('processes.publishSuccess'), 'success');
        },
        error: (error: any) => {
          this.showMessage(error?.error?.message || this.t('processes.publishError'), 'error');
        },
      });
  }

  protected versionProceso(proceso: Proceso): void {
    if (this.versioningId) {
      return;
    }

    this.versioningId = proceso.id;
    this.processService
      .crearNuevaVersion(proceso.id)
      .pipe(
        finalize(() => {
          this.versioningId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.data?.id) {
            this.showMessage(response.message || this.t('processes.versionSuccess'), 'success');
            this.loadFamily();
            return;
          }

          this.showMessage(this.t('processes.versionError'), 'error');
        },
        error: (error: any) => {
          this.showMessage(error?.error?.message || this.t('processes.versionError'), 'error');
        },
      });
  }

  protected startProceso(proceso: Proceso): void {
    if (this.startingId || proceso.estado !== 'PUBLICADO') {
      return;
    }

    this.startingId = proceso.id;
    this.processService
      .iniciarProceso(proceso.processKey || proceso.nombre)
      .pipe(
        finalize(() => {
          this.startingId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          const instanceId =
            (response.data as any)?.processInstanceId ||
            (response.data as any)?.id ||
            (response.data as any)?.instanceId;

          this.showMessage(
            instanceId
              ? `${response.message || this.t('processes.startSuccess')}: ${instanceId}`
              : response.message || this.t('processes.startSuccess'),
            'success',
          );
        },
        error: (error: any) => {
          this.showMessage(error?.error?.message || this.t('processes.startError'), 'error');
        },
      });
  }

  protected openMonitoring(proceso: Proceso): void {
    void this.router.navigate(['/processes', proceso.id, 'monitor']);
  }

  private loadFamily(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.processService
      .listarProcesos()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          const all = response.data ?? [];
          this.procesos = all
            .filter((proceso) => (proceso.processKey || '') === this.familyKey)
            .sort((a, b) => (b.version ?? 0) - (a.version ?? 0));

          this.familyName = this.procesos[0]?.nombre || this.familyKey || this.t('processes.familyMissing');
          if (!this.procesos.length) {
            this.errorMessage = this.t('processes.familyMissing');
          }
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || this.t('processes.loadError');
          this.cdr.detectChanges();
        },
      });
  }

  private countByStatus(status: 'BORRADOR' | 'PUBLICADO' | 'HISTORICO'): number {
    return this.procesos.filter((proceso) => proceso.estado === status).length;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = message;
      this.errorMessage = '';
    } else {
      this.errorMessage = message;
      this.successMessage = '';
    }

    this.cdr.detectChanges();
  }
}
