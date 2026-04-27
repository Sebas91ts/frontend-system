import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { Proceso } from '../../../../core/models/process.models';
import { ProcessService } from '../../../../core/services/process.service';
import { TranslationKey, UiPreferencesService } from '../../../../core/services/ui-preferences.service';
import { EMPTY_BPMN_XML } from '../../shared/bpmn-templates';
import { validateExclusiveGatewayXml } from '../../shared/bpmn-gateway-validation';
import { ProcessDialogsComponent } from '../../components/process-dialogs/process-dialogs.component';
import { ProcessListPanelComponent } from '../../components/process-list-panel/process-list-panel.component';

type ProcessStatusFilter = 'all' | 'BORRADOR' | 'PUBLICADO' | 'HISTORICO';
type ProcessSortMode = 'recent' | 'name' | 'version';

@Component({
  selector: 'app-processes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProcessDialogsComponent, ProcessListPanelComponent],
  templateUrl: './processes-list.component.html',
  styleUrl: './processes-list.component.css',
})
export class ProcessesListComponent implements OnInit, OnDestroy {
  private readonly preferences = inject(UiPreferencesService);
  protected procesosGuardados: Proceso[] = [];
  protected errorMessage = '';
  protected successMessage = '';
  protected isLoadingProcessList = false;
  protected publishingId: string | null = null;
  protected versioningId: string | null = null;
  protected startingId: string | null = null;
  protected isNewProcessDialogOpen = false;
  protected newProcessName = '';
  protected newProcessDescription = '';
  protected isCreatingProcess = false;
  protected saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  protected saveDialogMessage = '';
  protected searchQuery = '';
  protected statusFilter: ProcessStatusFilter = 'all';
  protected sortMode: ProcessSortMode = 'recent';

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly processService: ProcessService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
  }

  protected t(key: TranslationKey): string {
    return this.preferences.translate(key);
  }

  protected get filteredProcesos(): Proceso[] {
    const query = this.searchQuery.trim().toLowerCase();
    let items = [...this.procesosGuardados];

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

  protected get summaryCards(): Array<{ label: string; value: number; tone: string }> {
    return [
      { label: this.t('processes.totalCount'), value: this.procesosGuardados.length, tone: 'blue' },
      { label: this.t('processes.statusDraft'), value: this.countByStatus('BORRADOR'), tone: 'amber' },
      { label: this.t('processes.statusPublished'), value: this.countByStatus('PUBLICADO'), tone: 'green' },
      { label: this.t('processes.statusHistoric'), value: this.countByStatus('HISTORICO'), tone: 'slate' },
    ];
  }

  protected get hasFiltersApplied(): boolean {
    return !!this.searchQuery.trim() || this.statusFilter !== 'all' || this.sortMode !== 'recent';
  }

  protected resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.sortMode = 'recent';
  }

  protected goBack(): void {
    void this.router.navigate(['/admin']);
  }

  ngOnInit(): void {
    this.loadProcessList();
  }

  ngOnDestroy(): void {
    this.clearFeedbackTimer();
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.clearFeedbackTimer();

    if (type === 'success') {
      this.successMessage = message;
      this.errorMessage = '';
    } else {
      this.errorMessage = message;
      this.successMessage = '';
    }

    this.feedbackTimer = setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 3500);

    this.cdr.detectChanges();
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  protected loadProcessList(): void {
    this.isLoadingProcessList = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.processService
      .listarProcesos()
      .pipe(
        finalize(() => {
          this.isLoadingProcessList = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.procesosGuardados = [...(response.data ?? [])].sort((a, b) =>
            (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
          );
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || this.t('processes.loadError'),
            'error',
          );
          this.cdr.detectChanges();
        },
      });
  }

  protected openFamily(processKey: string): void {
    if (!processKey) {
      return;
    }

    void this.router.navigate(['/processes/families', encodeURIComponent(processKey)]);
  }

  protected openMonitoring(proceso: Proceso): void {
    void this.router.navigate(['/processes', proceso.id, 'monitor']);
  }

  protected openNewProcessDialog(): void {
    this.newProcessName = '';
    this.newProcessDescription = '';
    this.saveDialogStatus = 'idle';
    this.saveDialogMessage = '';
    this.isNewProcessDialogOpen = true;
  }

  protected closeNewProcessDialog(): void {
    if (this.isCreatingProcess) {
      return;
    }

    this.isNewProcessDialogOpen = false;
  }

  protected confirmNewProcess(): void {
    const nombre = this.newProcessName.trim();
    if (!nombre) {
      this.showFeedback(this.t('processes.validationError'), 'error');
      return;
    }

    this.isCreatingProcess = true;
    this.saveDialogStatus = 'saving';
    this.saveDialogMessage = this.t('processes.create');
    this.errorMessage = '';
    this.successMessage = '';

    this.processService
      .guardarProceso({
        nombre,
        descripcion: this.newProcessDescription.trim() || null,
        xml: EMPTY_BPMN_XML,
        clientStartEnabled: null,
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isCreatingProcess = false;
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data?.id) {
            this.saveDialogStatus = 'error';
            this.saveDialogMessage = response.message || this.t('processes.createError');
            this.showFeedback(this.saveDialogMessage, 'error');
            return;
          }

          this.saveDialogStatus = 'success';
          this.saveDialogMessage = this.t('processes.createSuccess');
          this.showFeedback(this.saveDialogMessage, 'success');
          this.isNewProcessDialogOpen = false;
          this.loadProcessList();
          void this.router.navigate(['/processes/designer', response.data.id]);
        },
        error: (error: any) => {
          this.saveDialogStatus = 'error';
          this.saveDialogMessage =
            error?.error?.message ||
            (error?.name === 'TimeoutError'
              ? this.t('processes.loadError')
              : this.t('processes.createError'));
          this.showFeedback(this.saveDialogMessage, 'error');
        },
      });
  }

  protected publishProceso(proceso: Proceso): void {
    if (this.publishingId || proceso.estado !== 'BORRADOR') {
      return;
    }

    const gatewayValidation = validateExclusiveGatewayXml(proceso.xml ?? '');
    if (!gatewayValidation.valid) {
      this.showFeedback(gatewayValidation.message || this.t('processes.validationError'), 'error');
      return;
    }

    this.publishingId = proceso.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.processService
      .publicarProceso(proceso.id)
      .pipe(
        finalize(() => {
          this.publishingId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          const actualizado = response.data;
          if (actualizado) {
            this.procesosGuardados = this.procesosGuardados.map((item) =>
              item.id === actualizado.id ? actualizado : item,
            );
          }

          this.showFeedback(response.message || this.t('processes.publishSuccess'), 'success');
          this.loadProcessList();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || this.t('processes.publishError'),
            'error',
          );
        },
      });
  }

  protected startProceso(proceso: Proceso): void {
    if (this.startingId || proceso.estado !== 'PUBLICADO') {
      return;
    }

    this.startingId = proceso.id;
    this.errorMessage = '';
    this.successMessage = '';

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

          this.showFeedback(
            instanceId
              ? `${response.message || this.t('processes.startSuccess')}: ${instanceId}`
              : response.message || this.t('processes.startSuccess'),
            'success',
          );
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || this.t('processes.startError'),
            'error',
          );
          this.cdr.detectChanges();
        },
      });
  }

  protected versionProceso(proceso: Proceso): void {
    if (this.versioningId) {
      return;
    }

    this.versioningId = proceso.id;
    this.errorMessage = '';
    this.successMessage = '';

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
            this.showFeedback(
              response.message || this.t('processes.versionSuccess'),
              'success',
            );
            this.loadProcessList();
            void this.router.navigate(['/processes/designer', response.data.id]);
            return;
          }

          this.showFeedback(this.t('processes.versionError'), 'error');
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || this.t('processes.versionError'),
            'error',
          );
        },
      });
  }

  private countByStatus(status: 'BORRADOR' | 'PUBLICADO' | 'HISTORICO'): number {
    return this.procesosGuardados.filter((proceso) => proceso.estado === status).length;
  }
}
