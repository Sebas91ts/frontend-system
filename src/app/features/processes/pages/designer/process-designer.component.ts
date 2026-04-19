import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Observable, timeout } from 'rxjs';
import { ApiResponse } from '../../../../core/models/auth.models';
import { Proceso } from '../../../../core/models/process.models';
import { ProcessService } from '../../../../core/services/process.service';
import { BpmnEditorComponent } from '../../components/bpmn-editor/bpmn-editor.component';
import { ProcessDialogsComponent } from '../../components/process-dialogs/process-dialogs.component';
import { ProcessListPanelComponent } from '../../components/process-list-panel/process-list-panel.component';

@Component({
  selector: 'app-process-designer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BpmnEditorComponent,
    ProcessDialogsComponent,
    ProcessListPanelComponent,
  ],
  templateUrl: './process-designer.component.html',
  styleUrl: './process-designer.component.css',
})
export class ProcessDesignerComponent implements OnDestroy {
  @ViewChild(BpmnEditorComponent)
  private readonly editorComponent?: BpmnEditorComponent;

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  protected importXmlValue = '';
  protected exportedXml = '';
  protected processName = 'Proceso de ventas';
  protected currentProcessId: string | null = null;
  protected editorProcessName = 'Proceso de ventas';
  protected procesosGuardados: Proceso[] = [];
  protected errorMessage = '';
  protected successMessage = '';
  protected isBusy = false;
  protected isSaving = false;
  protected isLoadingProcess = false;
  protected isLoadingProcessList = false;
  protected publishingId: string | null = null;
  protected isSaveDialogOpen = false;
  protected isImportConfirmOpen = false;
  protected saveDialogName = '';
  protected saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  protected saveDialogMessage = '';
  protected isImportPanelOpen = false;
  protected isExportPanelOpen = false;
  protected isProcessListOpen = false;

  constructor(
    private readonly processService: ProcessService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

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
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  protected async createNewDiagram(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    this.currentProcessId = null;
    this.processName = 'Proceso de ventas';
    this.editorProcessName = this.processName;
    this.errorMessage = '';
    this.successMessage = '';
    this.isBusy = true;

    try {
      await editor.createNewDiagram();
      this.showFeedback('Nuevo diagrama listo para modelar.', 'success');
    } catch (error) {
      console.error('Error al crear nuevo diagrama BPMN', error);
      this.showFeedback('No se pudo crear un nuevo diagrama BPMN.', 'error');
    } finally {
      this.isBusy = false;
    }
  }

  protected toggleProcessList(): void {
    this.isProcessListOpen = !this.isProcessListOpen;
    if (this.isProcessListOpen) {
      this.loadProcessList();
    }
  }

  protected loadProcessList(): void {
    this.isLoadingProcessList = true;
    this.errorMessage = '';

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
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || 'No se pudo cargar la lista de procesos guardados.',
            'error',
          );
        },
      });
  }

  protected publishProceso(proceso: Proceso): void {
    if (this.publishingId || proceso.estado === 'PUBLICADO') {
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
          this.cdr.detectChanges();
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

          this.showFeedback(response.message || 'Proceso publicado correctamente.', 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.message || 'No se pudo publicar el proceso.',
            'error',
          );
        },
      });
  }

  protected openSaveAsNew(): void {
    this.currentProcessId = null;
    this.onSaveProcess();
  }

  protected openSaveCurrent(): void {
    this.onSaveProcess();
  }

  protected async loadProceso(proceso: Proceso): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    this.isLoadingProcess = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.processService
      .obtenerProceso(proceso.id)
      .pipe(
        finalize(() => {
          this.isLoadingProcess = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: async (response) => {
          const procesoCargado = response.data;
          if (!procesoCargado) {
            this.showFeedback('No se pudo obtener el proceso seleccionado.', 'error');
            return;
          }

          this.currentProcessId = procesoCargado.id;
          this.processName = procesoCargado.nombre;
          this.editorProcessName = procesoCargado.nombre;
          this.saveDialogName = procesoCargado.nombre;
          this.isProcessListOpen = false;

          try {
            await editor.importFromXml(procesoCargado.xml);
            this.showFeedback(
              `Proceso "${procesoCargado.nombre}" cargado correctamente.`,
              'success',
            );
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

  protected onSaveProcess(): void {
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
    if (!editor) {
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
      const isUpdatingExisting = !!this.currentProcessId;
      const saveRequest$: Observable<ApiResponse<Proceso>> =
        isUpdatingExisting && this.currentProcessId
          ? this.processService.actualizarProceso(this.currentProcessId, { nombre, xml })
          : this.processService.guardarProceso({ nombre, xml });

      saveRequest$
        .pipe(
          timeout(15000),
          finalize(() => {
            this.isSaving = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: (response) => {
            if (response.success) {
              if (response.data?.id) {
                this.currentProcessId = response.data.id;
              }
              if (response.data?.nombre) {
                this.processName = response.data.nombre;
              }

              this.saveDialogStatus = 'success';
              this.saveDialogMessage = isUpdatingExisting
                ? 'Proceso BPMN actualizado correctamente.'
                : 'Proceso BPMN guardado correctamente.';
              this.showFeedback(
                isUpdatingExisting
                  ? 'Proceso BPMN actualizado correctamente en MongoDB.'
                  : 'Proceso BPMN guardado correctamente en MongoDB.',
                'success',
              );

              this.loadProcessList();
              this.cdr.detectChanges();

              setTimeout(() => {
                this.isSaveDialogOpen = false;
              }, 800);
              return;
            }

            this.saveDialogStatus = 'error';
            this.saveDialogMessage = response.message || 'No se pudo guardar el proceso.';
            this.showFeedback(response.message || 'No se pudo guardar el proceso.', 'error');
          },
          error: (error: any) => {
            this.saveDialogStatus = 'error';
            const backendMessage = error?.error?.data;

            this.saveDialogMessage =
              backendMessage ||
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

  protected async onImportXml(): Promise<void> {
    if (this.currentProcessId) {
      this.isImportConfirmOpen = true;
      return;
    }

    await this.executeImportXml();
  }

  protected closeImportConfirm(): void {
    this.isImportConfirmOpen = false;
  }

  protected async confirmImportOverwrite(): Promise<void> {
    this.isImportConfirmOpen = false;
    await this.executeImportXml();
  }

  protected toggleImportPanel(): void {
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

  private async executeImportXml(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await editor.importFromXml(this.importXmlValue);
      if (this.currentProcessId) {
        this.showFeedback(
          `XML importado sobre el proceso "${this.processName}". Puedes seguir editandolo y actualizarlo.`,
          'success',
        );
        return;
      }

      this.showFeedback(
        'XML importado en un nuevo proceso. Puedes guardarlo cuando este listo.',
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
