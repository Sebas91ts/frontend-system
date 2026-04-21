import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { Proceso } from '../../../../core/models/process.models';
import { ProcessService } from '../../../../core/services/process.service';
import { EMPTY_BPMN_XML } from '../../shared/bpmn-templates';
import { ProcessDialogsComponent } from '../../components/process-dialogs/process-dialogs.component';
import { ProcessListPanelComponent } from '../../components/process-list-panel/process-list-panel.component';

@Component({
  selector: 'app-processes-list',
  standalone: true,
  imports: [CommonModule, ProcessDialogsComponent, ProcessListPanelComponent],
  templateUrl: './processes-list.component.html',
  styleUrl: './processes-list.component.css',
})
export class ProcessesListComponent implements OnInit, OnDestroy {
  protected procesosGuardados: Proceso[] = [];
  protected errorMessage = '';
  protected successMessage = '';
  protected isLoadingProcessList = false;
  protected publishingId: string | null = null;
  protected versioningId: string | null = null;
  protected startingId: string | null = null;
  protected isNewProcessDialogOpen = false;
  protected newProcessName = '';
  protected isCreatingProcess = false;
  protected saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  protected saveDialogMessage = '';

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly processService: ProcessService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
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
            error?.error?.message || 'No se pudo cargar la lista de procesos.',
            'error',
          );
          this.cdr.detectChanges();
        },
      });
  }

  protected openProcess(proceso: Proceso): void {
    void this.router.navigate(['/processes/designer', proceso.id]);
  }

  protected openNewProcessDialog(): void {
    this.newProcessName = '';
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
      this.showFeedback('Debes ingresar un nombre para el proceso.', 'error');
      return;
    }

    this.isCreatingProcess = true;
    this.saveDialogStatus = 'saving';
    this.saveDialogMessage = 'Creando nuevo proceso...';
    this.errorMessage = '';
    this.successMessage = '';

    this.processService
      .guardarProceso({ nombre, xml: EMPTY_BPMN_XML })
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
            this.saveDialogMessage = response.message || 'No se pudo crear el proceso.';
            this.showFeedback(this.saveDialogMessage, 'error');
            return;
          }

          this.saveDialogStatus = 'success';
          this.saveDialogMessage = 'Proceso creado correctamente.';
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
              ? 'El backend no respondio a tiempo. Intenta nuevamente.'
              : 'No se pudo crear el proceso.');
          this.showFeedback(this.saveDialogMessage, 'error');
        },
      });
  }

  protected publishProceso(proceso: Proceso): void {
    if (this.publishingId || proceso.estado !== 'BORRADOR') {
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

          this.showFeedback(response.message || 'Proceso publicado y desplegado correctamente.', 'success');
          this.loadProcessList();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || 'No se pudo publicar el proceso.',
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
              ? `Instancia iniciada correctamente. ID: ${instanceId}`
              : response.message || 'Instancia iniciada correctamente.',
            'success',
          );
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || 'No se pudo iniciar la instancia del proceso.',
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
              response.message || 'Nueva version creada correctamente.',
              'success',
            );
            this.loadProcessList();
            void this.router.navigate(['/processes/designer', response.data.id]);
            return;
          }

          this.showFeedback('No se pudo crear la nueva version.', 'error');
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || 'No se pudo crear la nueva version del proceso.',
            'error',
          );
        },
      });
  }
}
