import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessService } from '../../../../core/services/process.service';
import { BpmnEditorComponent } from '../../components/bpmn-editor/bpmn-editor.component';
import { ProcessDialogsComponent } from '../../components/process-dialogs/process-dialogs.component';

@Component({
  selector: 'app-process-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, BpmnEditorComponent, ProcessDialogsComponent],
  templateUrl: './process-designer.component.html',
  styleUrl: './process-designer.component.css',
})
export class ProcessDesignerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(BpmnEditorComponent)
  private readonly editorComponent?: BpmnEditorComponent;

  protected importXmlValue = '';
  protected exportedXml = '';
  protected processName = '';
  protected currentProcessId: string | null = null;
  protected currentProcessKey = '';
  protected currentProcessVersion: number | null = null;
  protected currentProcessState = 'BORRADOR';
  protected isReadonlyProcess = false;
  protected editorProcessName = '';
  protected get processContext(): string {
    if (!this.currentProcessKey) {
      return '';
    }

    return `${this.currentProcessKey} · v${this.currentProcessVersion || 1} · ${this.currentProcessState}`;
  }
  protected errorMessage = '';
  protected successMessage = '';
  protected isBusy = false;
  protected isSaving = false;
  protected isLoadingProcess = false;
  protected isSaveDialogOpen = false;
  protected isImportConfirmOpen = false;
  protected saveDialogName = '';
  protected saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  protected saveDialogMessage = '';
  protected isImportPanelOpen = false;
  protected isExportPanelOpen = false;

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private routeSubscription?: { unsubscribe: () => void };
  private pendingProcessId: string | null = null;

  constructor(
    private readonly processService: ProcessService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const processId = params.get('id');
      if (!processId || processId === 'new') {
        void this.router.navigate(['/processes']);
        return;
      }

      if (this.editorComponent) {
        void this.loadProcesoById(processId);
        return;
      }

      this.pendingProcessId = processId;
    });
  }

  ngAfterViewInit(): void {
    if (this.pendingProcessId) {
      const processId = this.pendingProcessId;
      this.pendingProcessId = null;
      void this.loadProcesoById(processId);
    }
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.clearFeedbackTimer();
  }

  protected goBackToProcesses(): void {
    void this.router.navigate(['/processes']);
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
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  protected openSaveCurrent(): void {
    if (this.isReadonlyProcess) {
      this.showFeedback('Este proceso está en modo solo lectura. Vuelve a la lista para crear una nueva versión.', 'error');
      return;
    }

    if (!this.currentProcessId) {
      this.showFeedback('No hay un proceso cargado para actualizar.', 'error');
      return;
    }

    this.saveDialogName = this.processName.trim();
    this.saveDialogStatus = 'idle';
    this.saveDialogMessage = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.isSaveDialogOpen = true;
  }

  protected closeSaveDialog(): void {
    if (this.isSaving) {
      return;
    }

    this.isSaveDialogOpen = false;
  }

  protected async confirmSaveProcess(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor || !this.currentProcessId || this.isReadonlyProcess) {
      return;
    }

    const nombre = this.saveDialogName.trim();
    if (!nombre) {
      this.showFeedback('Debes ingresar un nombre para el proceso.', 'error');
      return;
    }

    this.isSaving = true;
    this.saveDialogStatus = 'saving';
    this.saveDialogMessage = 'Guardando el proceso en MongoDB...';
    this.errorMessage = '';
    this.successMessage = '';
    this.processName = nombre;
    this.editorProcessName = nombre;

    try {
      const xml = await editor.exportToXml();
      this.exportedXml = xml;

      this.processService
        .actualizarProceso(this.currentProcessId, { nombre, xml })
        .pipe(
          finalize(() => {
            this.isSaving = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: (response) => {
            if (!response.success) {
              this.saveDialogStatus = 'error';
              this.saveDialogMessage = response.message || 'No se pudo guardar el proceso.';
              this.showFeedback(this.saveDialogMessage, 'error');
              return;
            }

            if (response.data?.nombre) {
              this.processName = response.data.nombre;
              this.editorProcessName = response.data.nombre;
            }

            this.saveDialogStatus = 'success';
            this.saveDialogMessage = 'Proceso BPMN actualizado correctamente.';
            this.showFeedback('Proceso BPMN actualizado correctamente en MongoDB.', 'success');
            this.cdr.detectChanges();

            setTimeout(() => {
              this.isSaveDialogOpen = false;
            }, 800);
          },
          error: (error: any) => {
            this.saveDialogStatus = 'error';
            this.saveDialogMessage =
              error?.error?.message ||
              (error?.name === 'TimeoutError'
                ? 'El backend no respondio a tiempo. Intenta nuevamente.'
                : 'No se pudo guardar el proceso en el backend.');
            this.showFeedback(this.saveDialogMessage, 'error');
            this.cdr.detectChanges();
          },
        });
    } catch (error: any) {
      console.error('Error al exportar BPMN antes del guardado', error);
      this.saveDialogStatus = 'error';
      this.saveDialogMessage =
        error?.error?.message || 'No se pudo exportar el XML del diagrama actual.';
      this.showFeedback(this.saveDialogMessage, 'error');
      this.isSaving = false;
    }
  }

  protected async onExportXml(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.exportedXml = await editor.exportToXml();
      this.isExportPanelOpen = true;
      this.showFeedback('XML exportado correctamente.', 'success');
    } catch (error) {
      console.error('Error al exportar XML BPMN', error);
      this.showFeedback('No se pudo exportar el XML del diagrama actual.', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  protected onImportXml(): void {
    if (this.isReadonlyProcess) {
      this.showFeedback('Este proceso está en modo solo lectura. Crea una nueva versión para modificarlo.', 'error');
      return;
    }

    if (this.currentProcessId) {
      this.isImportConfirmOpen = true;
      return;
    }

    void this.executeImportXml();
  }

  protected closeImportConfirm(): void {
    this.isImportConfirmOpen = false;
  }

  protected confirmImportOverwrite(): void {
    this.isImportConfirmOpen = false;
    void this.executeImportXml();
  }

  protected toggleImportPanel(): void {
    if (this.isReadonlyProcess) {
      this.showFeedback('Este proceso está en modo solo lectura. Crea una nueva versión para importar XML.', 'error');
      return;
    }

    this.isImportPanelOpen = !this.isImportPanelOpen;
    if (this.isImportPanelOpen && !this.importXmlValue) {
      this.importXmlValue = this.editorComponent?.sampleXml ?? '';
    }
  }

  protected zoomIn(): void {
    this.editorComponent?.zoomIn();
  }

  protected zoomOut(): void {
    this.editorComponent?.zoomOut();
  }

  protected resetView(): void {
    this.editorComponent?.resetView();
  }

  private async loadProcesoById(id: string): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    this.isLoadingProcess = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.processService
      .obtenerProceso(id)
      .pipe(
        finalize(() => {
          this.isLoadingProcess = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: async (response) => {
          const procesoCargado = response.data ?? undefined;
          if (!procesoCargado) {
            this.showFeedback('No se pudo obtener el proceso seleccionado.', 'error');
            return;
          }

          this.currentProcessId = procesoCargado.id;
          this.currentProcessKey = procesoCargado.processKey ?? '';
          this.currentProcessVersion = procesoCargado.version ?? null;
          this.currentProcessState = procesoCargado.estado ?? 'BORRADOR';
          this.isReadonlyProcess = this.currentProcessState !== 'BORRADOR';
          this.processName = procesoCargado.nombre;
          this.editorProcessName = procesoCargado.nombre;
          this.saveDialogName = procesoCargado.nombre;
          this.isImportPanelOpen = false;
          this.isExportPanelOpen = false;
          this.isSaveDialogOpen = false;
          this.isImportConfirmOpen = false;

          if (this.isReadonlyProcess) {
            this.showFeedback(
              'Este proceso está en solo lectura. Vuelve a la lista para crear una nueva versión.',
              'success',
            );
          } else {
            this.showFeedback('Proceso en borrador cargado correctamente.', 'success');
          }

          try {
            await editor.importFromXml(procesoCargado.xml);
            this.showFeedback(`Proceso "${procesoCargado.nombre}" cargado correctamente.`, 'success');
          } catch (error) {
            console.error('Error al importar proceso guardado', error);
            this.showFeedback('No se pudo cargar el XML BPMN del proceso seleccionado.', 'error');
          }

          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || 'No se pudo abrir el proceso seleccionado.',
            'error',
          );
        },
      });
  }

  private async executeImportXml(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor || this.isReadonlyProcess) {
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await editor.importFromXml(this.importXmlValue);
      this.showFeedback(
        `XML importado sobre el proceso "${this.processName}". Puedes seguir editandolo y actualizarlo.`,
        'success',
      );
    } catch (error) {
      console.error('Error al importar XML BPMN', error);
      this.showFeedback(
        'No se pudo importar el XML BPMN. Verifica la estructura del archivo e intenta nuevamente.',
        'error',
      );
    } finally {
      this.isBusy = false;
    }
  }
}
