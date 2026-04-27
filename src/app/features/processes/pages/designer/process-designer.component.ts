import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
import { ProcessAiAnalysis, ProcessService } from '../../../../core/services/process.service';
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
  protected processDescription = '';
  protected get processContext(): string {
    if (!this.currentProcessKey) {
      return '';
    }

    return `${this.currentProcessKey} | v${this.currentProcessVersion || 1} | ${this.currentProcessState}`;
  }
  protected errorMessage = '';
  protected successMessage = '';
  protected isBusy = false;
  protected isSaving = false;
  protected isLoadingProcess = false;
  protected isSaveDialogOpen = false;
  protected isImportConfirmOpen = false;
  protected saveDialogName = '';
  protected saveDialogDescription = '';
  protected saveDialogStatus: 'idle' | 'saving' | 'success' | 'error' = 'idle';
  protected saveDialogMessage = '';
  protected isImportPanelOpen = false;
  protected isExportPanelOpen = false;
  protected isAiEditing = false;
  protected aiEditInstruction = '';
  protected isAiEditPanelOpen = false;
  protected isAiEditPreviewOpen = false;
  protected aiEditedXml = '';
  protected aiEditStatusMessage = '';
  protected aiEditAttempt = 0;
  protected isAiAnalyzing = false;
  protected isAiAnalysisPanelOpen = false;
  protected aiAnalysisResult: ProcessAiAnalysis | null = null;
  protected aiSuggestionActionId = '';
  protected aiSuggestionActionType: 'apply' | 'reject' | '' = '';
  protected aiSuggestionActionMessage = '';
  protected aiProcessDescription = '';
  protected aiGeneratedXml = '';
  protected aiGeneratedProcessName = '';
  protected aiGeneratedProcessKey = '';
  protected isAiDialogOpen = false;
  protected isAiGenerating = false;
  protected isAiConfirmOpen = false;

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private routeSubscription?: { unsubscribe: () => void };
  private pendingProcessId: string | null = null;
  private aiAnalysisRequestSub?: Subscription;
  private aiEditRequestSub?: Subscription;
  private aiEditProgressTimer?: ReturnType<typeof setTimeout>;

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
    this.aiAnalysisRequestSub?.unsubscribe();
    this.aiEditRequestSub?.unsubscribe();
    if (this.aiEditProgressTimer) {
      clearTimeout(this.aiEditProgressTimer);
      this.aiEditProgressTimer = undefined;
    }
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

  private normalizeProcessName(value: string): string {
    const cleaned = value?.trim();
    return cleaned ? cleaned : 'Proceso sin nombre';
  }

  private normalizeProcessKey(source: string): string {
    const cleaned = (source ?? '').trim().toLowerCase();
    if (!cleaned) {
      return 'proceso_sin_nombre';
    }

    return (
      cleaned
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'proceso_sin_nombre'
    );
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

    if (this.editorComponent) {
      const laneValidation = this.editorComponent.validateLaneAssignments();
      if (!laneValidation.valid) {
        this.showFeedback(laneValidation.message, 'error');
        return;
      }
    }

    this.saveDialogName = this.normalizeProcessName(this.processName);
    this.saveDialogDescription = this.processDescription;
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

    const laneValidation = editor.validateLaneAssignments();
    if (!laneValidation.valid) {
      this.saveDialogStatus = 'error';
      this.saveDialogMessage = laneValidation.message;
      this.showFeedback(laneValidation.message, 'error');
      return;
    }

    const nombre = this.normalizeProcessName(this.saveDialogName);
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
    if (!this.currentProcessKey) {
      this.currentProcessKey = this.normalizeProcessKey(nombre);
    }

    try {
      const xml = await editor.exportToXml();
      this.exportedXml = xml;

    this.processService
        .actualizarProceso(this.currentProcessId, {
          nombre,
          descripcion: this.saveDialogDescription.trim() || null,
          xml,
          clientStartEnabled: null,
        })
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
            this.processName = this.normalizeProcessName(response.data.nombre);
            this.editorProcessName = this.processName;
          }

          this.processDescription = response.data?.descripcion ?? this.saveDialogDescription.trim();
          this.saveDialogDescription = this.processDescription;

          if (response.data?.processKey) {
            this.currentProcessKey = this.normalizeProcessKey(response.data.processKey);
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

  protected openAiGenerator(): void {
    if (this.isReadonlyProcess) {
      this.showFeedback('Este proceso está en modo solo lectura. Crea una nueva versión para usar IA.', 'error');
      return;
    }

    this.aiProcessDescription = '';
    this.aiGeneratedXml = '';
    this.aiGeneratedProcessName = '';
    this.aiGeneratedProcessKey = '';
    this.isAiDialogOpen = true;
  }

  protected closeAiGenerator(): void {
    if (this.isAiGenerating) {
      return;
    }

    this.isAiDialogOpen = false;
  }

  protected async generateDiagramWithAi(): Promise<void> {
    if (this.isReadonlyProcess) {
      this.showFeedback('Este proceso está en modo solo lectura. Crea una nueva versión para usar IA.', 'error');
      return;
    }

    const description = this.aiProcessDescription.trim();
    if (!description) {
      this.showFeedback('Escribe una descripción del proceso antes de generar el diagrama.', 'error');
      return;
    }

    this.isAiGenerating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.processService.generarDiagramaIA(description).pipe(
      finalize(() => {
        this.isAiGenerating = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        if (!response.success || !response.data?.xml) {
          this.showFeedback(response.message || 'No se pudo generar el diagrama con IA.', 'error');
          return;
        }

        console.info('XML IA recibido', response.data.xml);
        this.aiGeneratedXml = response.data.xml;
        this.aiGeneratedProcessName = response.data.processName;
        this.aiGeneratedProcessKey = response.data.processKey;
        this.isAiConfirmOpen = true;
        this.showFeedback('Se generó una base editable. Confirma para cargarla en el editor.', 'success');
      },
      error: (error: any) => {
        this.showFeedback(error?.error?.message || 'No se pudo generar el diagrama con IA.', 'error');
      },
    });
  }

  protected closeAiConfirm(): void {
    if (this.isAiGenerating) {
      return;
    }

    this.isAiConfirmOpen = false;
  }

  protected async confirmAiImport(): Promise<void> {
    if (!this.editorComponent || !this.aiGeneratedXml.trim()) {
      return;
    }

    try {
      console.info('Importando XML IA en bpmn-js');
      await this.editorComponent.importFromXml(this.aiGeneratedXml);
      this.editorComponent.resetView();
      console.info('XML IA importado correctamente');
      this.currentProcessKey = this.aiGeneratedProcessKey || this.currentProcessKey;
      this.processName = this.aiGeneratedProcessName || this.processName;
      this.editorProcessName = this.processName;
      this.saveDialogName = this.processName;
      this.isAiConfirmOpen = false;
      this.isAiDialogOpen = false;
      this.isImportPanelOpen = false;
      this.showFeedback('El diagrama generado por IA se cargó correctamente. Ahora puedes editarlo y guardarlo.', 'success');
    } catch (error) {
      console.error('Error al importar XML generado por IA', error);
      console.error('Error importando XML IA');
      this.showFeedback('No se pudo cargar el diagrama generado por IA.', 'error');
    }
  }

  protected openAiEditGenerator(): void {
    if (this.isReadonlyProcess) {
      this.showFeedback('Este proceso está en modo solo lectura. Crea una nueva versión para usar IA.', 'error');
      return;
    }

    this.aiEditInstruction = '';
    this.aiEditedXml = '';
    this.isAiEditPanelOpen = true;
  }

  protected async analyzeProcessWithAi(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    this.isAiAnalyzing = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.aiAnalysisRequestSub?.unsubscribe();

    try {
      const processXml = await editor.exportToXml();
      this.aiAnalysisRequestSub = this.processService
        .analizarProcesoIA({
          processXml,
          processName: this.processName,
          processId: this.currentProcessId,
          processKey: this.currentProcessKey,
          processVersion: this.currentProcessVersion,
          metrics: {},
        })
        .pipe(
          finalize(() => {
            this.isAiAnalyzing = false;
            this.aiAnalysisRequestSub = undefined;
            this.cdr.detectChanges();
          }),
        )
          .subscribe({
          next: (response) => {
            if (!response.success || !response.data) {
              this.showFeedback(response.message || 'No se pudo analizar el proceso con IA.', 'error');
              return;
            }

            this.aiAnalysisResult = response.data;
            this.isAiAnalysisPanelOpen = true;
            this.editorComponent?.clearAiAnalysisHighlights();
            this.highlightAnalysisItems();
            this.showFeedback('Analisis IA listo. Revisa las recomendaciones detectadas.', 'success');
            this.cdr.detectChanges();
          },
          error: (error: any) => {
            this.showFeedback(error?.error?.message || 'No se pudo analizar el proceso con IA.', 'error');
          },
        });
    } catch (error) {
      console.error('Error exportando XML para analisis IA', error);
      this.isAiAnalyzing = false;
      this.showFeedback('No se pudo exportar el XML actual para analizarlo.', 'error');
    }
  }

  protected closeAiAnalysisPanel(): void {
    this.isAiAnalysisPanelOpen = false;
    this.editorComponent?.clearAiAnalysisHighlights();
  }

  protected cancelAiAnalysis(): void {
    if (!this.isAiAnalyzing) {
      return;
    }

    this.aiAnalysisRequestSub?.unsubscribe();
    this.aiAnalysisRequestSub = undefined;
    this.isAiAnalyzing = false;
    this.showFeedback('Analisis IA cancelado por el usuario.', 'error');
    this.cdr.detectChanges();
  }

  protected highlightAnalysisElement(elementId?: string | null): void {
    this.editorComponent?.clearAiAnalysisHighlights();
    this.editorComponent?.highlightAiAnalysisElement(elementId);
  }

  protected getSeverityLabel(severity?: string | null): string {
    switch ((severity ?? '').toLowerCase()) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Sin severidad';
    }
  }

  protected getScoreTone(score?: number | null): string {
    const value = score ?? 0;
    if (value >= 85) {
      return 'good';
    }
    if (value >= 70) {
      return 'warning';
    }
    return 'danger';
  }

  protected canApplyAnalysisSuggestion(suggestion: NonNullable<ProcessAiAnalysis['suggestions']>[number]): boolean {
    return Boolean(
      this.currentProcessState === 'BORRADOR'
      && suggestion?.id
      && suggestion?.status !== 'APPLIED'
      && suggestion?.status !== 'REJECTED'
      && suggestion?.canBeAppliedAutomatically
      && suggestion?.proposedXml
    );
  }

  protected async applyAnalysisSuggestion(suggestion: NonNullable<ProcessAiAnalysis['suggestions']>[number]): Promise<void> {
    if (!suggestion.id) {
      return;
    }

    if (!this.canApplyAnalysisSuggestion(suggestion)) {
      this.showFeedback('Esta sugerencia no tiene XML propuesto o el proceso no está en borrador.', 'error');
      return;
    }

    this.aiSuggestionActionId = suggestion.id;
    this.aiSuggestionActionType = 'apply';
    this.aiSuggestionActionMessage = 'Aplicando sugerencia...';
    this.cdr.detectChanges();

    this.processService
      .aplicarSugerenciaIA(suggestion.id)
      .pipe(
        finalize(() => {
          this.aiSuggestionActionId = '';
          this.aiSuggestionActionType = '';
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: async (response) => {
          if (!response.success || !response.data?.process?.xml) {
            this.showFeedback(response.message || 'No se pudo aplicar la sugerencia.', 'error');
            return;
          }

          try {
            await this.editorComponent?.importFromXml(response.data.process.xml);
            this.editorComponent?.resetView();
          } catch (error) {
            console.error('Error al importar XML aplicado por IA', error);
            this.showFeedback('La sugerencia se aplicó pero no se pudo recargar el XML en el editor.', 'error');
          }

          this.currentProcessId = response.data.process.id ?? this.currentProcessId;
          this.currentProcessKey = response.data.process.processKey || this.currentProcessKey;
          this.currentProcessVersion = response.data.process.version ?? this.currentProcessVersion;
          this.currentProcessState = response.data.process.estado || this.currentProcessState;
          this.isReadonlyProcess = this.currentProcessState !== 'BORRADOR';
          this.processName = this.normalizeProcessName(response.data.process.nombre || this.processName);
          this.editorProcessName = this.processName;

          this.aiAnalysisResult = {
            ...(this.aiAnalysisResult || { summary: '', score: 0, issues: [], suggestions: [] }),
            suggestions: (this.aiAnalysisResult?.suggestions ?? []).map((item) =>
              item.id === suggestion.id
                ? { ...item, status: 'APPLIED', decidedAt: new Date().toISOString(), decidedBy: response.data.suggestion?.decidedBy || '' }
                : item,
            ),
          } as ProcessAiAnalysis;

          this.aiSuggestionActionMessage = response.message || 'Sugerencia aplicada correctamente.';
          this.showFeedback('Sugerencia aplicada y XML recargado en el editor.', 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.aiSuggestionActionMessage = error?.error?.message || 'No se pudo aplicar la sugerencia.';
          this.showFeedback(this.aiSuggestionActionMessage, 'error');
        },
      });
  }

  protected rejectAnalysisSuggestion(suggestion: NonNullable<ProcessAiAnalysis['suggestions']>[number]): void {
    if (!suggestion.id) {
      return;
    }

    this.aiSuggestionActionId = suggestion.id;
    this.aiSuggestionActionType = 'reject';
    this.aiSuggestionActionMessage = 'Rechazando sugerencia...';
    this.cdr.detectChanges();

    this.processService
      .rechazarSugerenciaIA(suggestion.id)
      .pipe(
        finalize(() => {
          this.aiSuggestionActionId = '';
          this.aiSuggestionActionType = '';
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.showFeedback(response.message || 'No se pudo rechazar la sugerencia.', 'error');
            return;
          }

          this.aiAnalysisResult = {
            ...(this.aiAnalysisResult || { summary: '', score: 0, issues: [], suggestions: [] }),
            suggestions: (this.aiAnalysisResult?.suggestions ?? []).map((item) =>
              item.id === suggestion.id ? { ...item, status: 'REJECTED' } : item,
            ),
          } as ProcessAiAnalysis;

          this.aiSuggestionActionMessage = response.message || 'Sugerencia rechazada correctamente.';
          this.showFeedback('Sugerencia rechazada.', 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.aiSuggestionActionMessage = error?.error?.message || 'No se pudo rechazar la sugerencia.';
          this.showFeedback(this.aiSuggestionActionMessage, 'error');
        },
      });
  }

  private highlightAnalysisItems(): void {
    const result = this.aiAnalysisResult;
    if (!result) {
      return;
    }

    for (const issue of result.issues ?? []) {
      this.editorComponent?.highlightAiAnalysisElement(issue.elementId);
    }

    for (const suggestion of result.suggestions ?? []) {
      this.editorComponent?.highlightAiAnalysisElement(suggestion.relatedElementId);
    }
  }

  protected closeAiEditPanel(): void {
    if (this.isAiEditing) {
      return;
    }

    this.isAiEditPanelOpen = false;
  }

  protected async editDiagramWithAi(): Promise<void> {
    const editor = this.editorComponent;
    if (!editor) {
      return;
    }

    const instruction = this.aiEditInstruction.trim();
    if (!instruction) {
      this.showFeedback('Escribe una instrucción para editar el diagrama actual.', 'error');
      return;
    }

    if (this.isAiEditing) {
      this.showFeedback('La IA ya está procesando una versión. Puedes esperar o cancelar antes de iniciar otra.', 'error');
      return;
    }

    this.isAiEditing = true;
    this.aiEditAttempt = 1;
    this.aiEditStatusMessage = 'Procesando cambio con IA...';
    this.isAiEditPanelOpen = false;
    this.isAiEditPreviewOpen = false;
    this.cdr.detectChanges();
    if (this.aiEditProgressTimer) {
      clearTimeout(this.aiEditProgressTimer);
    }
    this.aiEditProgressTimer = setTimeout(() => {
      if (this.isAiEditing) {
        this.aiEditStatusMessage = 'La IA sigue procesando. Puedes cancelar y volver a intentarlo.';
        this.showFeedback('La IA sigue procesando. Puedes esperar o cancelar.', 'error');
        this.cdr.detectChanges();
      }
    }, 15000);
    try {
      const currentXml = await editor.exportToXml();
      console.info('XML actual preparado para IA', currentXml.length);
      this.aiEditRequestSub?.unsubscribe();
      this.aiEditRequestSub = this.processService.editarDiagramaIA(instruction, currentXml).subscribe({
        next: async (response) => {
          this.isAiEditing = false;
          if (this.aiEditProgressTimer) {
            clearTimeout(this.aiEditProgressTimer);
            this.aiEditProgressTimer = undefined;
          }
          if (!response.success || !response.data?.xml?.trim()) {
            this.showFeedback(response.message || 'No se pudo editar el diagrama con IA.', 'error');
            this.aiEditStatusMessage = '';
            this.cdr.detectChanges();
            return;
          }

          this.aiEditedXml = response.data.xml;
          this.isAiEditPreviewOpen = true;
          this.aiEditStatusMessage = '';
          this.showFeedback('La IA generó una edición. Confirma para cargarla en el editor.', 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.isAiEditing = false;
          this.aiEditStatusMessage = '';
          if (this.aiEditProgressTimer) {
            clearTimeout(this.aiEditProgressTimer);
            this.aiEditProgressTimer = undefined;
          }
          const apiMessage = error?.error?.message || error?.error?.detail || '';
          this.showFeedback(apiMessage || 'No se pudo editar el diagrama con IA.', 'error');
          this.cdr.detectChanges();
        },
      });
    } catch (error) {
      this.isAiEditing = false;
      this.aiEditStatusMessage = '';
      if (this.aiEditProgressTimer) {
        clearTimeout(this.aiEditProgressTimer);
        this.aiEditProgressTimer = undefined;
      }
      this.showFeedback('No se pudo exportar el XML actual del editor.', 'error');
      this.cdr.detectChanges();
    }
  }

  protected cancelAiEdit(): void {
    if (!this.isAiEditing) {
      return;
    }

    this.aiEditRequestSub?.unsubscribe();
    this.aiEditRequestSub = undefined;
    this.isAiEditing = false;
    this.aiEditStatusMessage = 'Proceso cancelado por el usuario.';
    this.showFeedback('Edición por IA cancelada.', 'error');
    this.cdr.detectChanges();
  }

  protected async confirmAiEditImport(): Promise<void> {
    if (!this.editorComponent || !this.aiEditedXml.trim()) {
      return;
    }

    try {
      console.info('Importando XML IA en bpmn-js');
      await this.editorComponent.importFromXml(this.aiEditedXml);
      this.editorComponent.resetView();
      console.info('XML IA importado correctamente');
      this.isAiEditPreviewOpen = false;
      this.isAiDialogOpen = false;
      this.showFeedback('Diagrama editado correctamente con IA.', 'success');
    } catch (error) {
      console.error('Error importando XML IA', error);
      const message = error instanceof Error ? error.message : 'No se pudo cargar el diagrama editado por IA.';
      this.showFeedback(message, 'error');
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
          this.currentProcessKey = this.normalizeProcessKey(
            procesoCargado.processKey || procesoCargado.nombre || id,
          );
          this.currentProcessVersion = procesoCargado.version ?? null;
          this.currentProcessState = procesoCargado.estado ?? 'BORRADOR';
          this.isReadonlyProcess = this.currentProcessState !== 'BORRADOR';
          this.processName = this.normalizeProcessName(procesoCargado.nombre);
          this.processDescription = procesoCargado.descripcion ?? '';
          this.editorProcessName = this.processName;
          this.saveDialogName = this.processName;
          this.saveDialogDescription = this.processDescription;
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
        `XML importado sobre el proceso "${this.processName}". Puedes seguir editándolo y actualizarlo.`,
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

