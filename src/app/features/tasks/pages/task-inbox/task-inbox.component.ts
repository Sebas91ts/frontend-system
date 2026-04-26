import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, firstValueFrom, of } from 'rxjs';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { AuthService } from '../../../../core/services/auth.service';
import {
  FormDefinition,
  FormFieldDefinition,
  FormFieldOptionDefinition,
  UploadedFileMetadata,
} from '../../../../core/models/form.models';
import { FormService } from '../../../../core/services/form.service';
import { FileUploadService } from '../../../../core/services/file-upload.service';
import { ApiResponse } from '../../../../core/models/auth.models';
import { RealtimeService } from '../../../../core/services/realtime.service';

@Component({
  selector: 'app-task-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-inbox.component.html',
  styleUrl: './task-inbox.component.css',
})
export class TaskInboxComponent implements OnInit, OnDestroy {
  private static readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

  private readonly taskService = inject(TaskInstanceService);
  private readonly authService = inject(AuthService);
  private readonly formService = inject(FormService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly realtimeService = inject(RealtimeService);

  protected tasks: TareaInstancia[] = [];
  protected isLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected viewMode: 'mine' | 'area' | 'all' = 'mine';
  protected myTasksCount = 0;
  protected myAreaTasksCount = 0;
  protected allTasksCount = 0;
  protected quickWorkTask: TareaInstancia | null = null;
  protected quickWorkLoading = false;
  protected quickWorkSaving = false;
  protected quickWorkError = '';
  protected quickWorkSuccess = '';
  protected quickWorkForm: FormDefinition | null = null;
  protected quickWorkValues: Record<string, unknown> = {};
  protected quickWorkFileState: Record<string, { uploading: boolean; error: string }> = {};

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private queryParamsSubscription?: { unsubscribe: () => void };
  private realtimeSubscription?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.subscribeRealtimeTopics();
    this.queryParamsSubscription = this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      this.viewMode = mode === 'area' ? 'area' : mode === 'all' ? 'all' : 'mine';
      void this.loadTasks();
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSubscription?.unsubscribe();
    this.realtimeSubscription?.unsubscribe();
    this.clearFeedbackTimer();
  }

  protected async refreshTasks(): Promise<void> {
    await this.loadTasks();
  }

  protected async showMine(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'mine' } });
  }

  protected async showArea(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'area' } });
  }

  protected async showAll(): Promise<void> {
    await this.router.navigate(['/tasks'], { queryParams: { mode: 'all' } });
  }

  protected goBack(): void {
    const isAdmin = this.authService.isAdmin();
    void this.router.navigate([isAdmin ? '/admin' : '/user']);
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected getProcessLabel(task: TareaInstancia): string {
    const processName = task.nombreProceso?.trim();
    if (processName) {
      return processName;
    }

    const processId = task.processDefinitionId?.trim();
    if (!processId) {
      return 'Proceso no identificado';
    }

    const [key] = processId.split(':');
    return key?.trim() || 'Proceso no identificado';
  }

  protected getTaskLabel(task: TareaInstancia): string {
    return task.name?.trim() || 'Tarea sin nombre';
  }

  protected getInstanceShortLabel(task: TareaInstancia): string {
    const instanceId = task.processInstanceId?.trim();
    if (!instanceId) {
      return 'Instancia no identificada';
    }

    return `Instancia #${instanceId.slice(-6)}`;
  }

  protected getAssigneeLabel(task: TareaInstancia): string {
    return task.assignee?.trim() || 'Sin asignar';
  }

  protected isTaskTakenByMe(task: TareaInstancia): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.email || !task.assignee) {
      return false;
    }

    return currentUser.email.trim().toLowerCase() === task.assignee.trim().toLowerCase();
  }

  protected canWorkNow(task: TareaInstancia): boolean {
    return this.isTaskTakenByMe(task);
  }

  protected getAreaLabel(task: TareaInstancia): string {
    return task.areaNombre?.trim() || 'Área no identificada';
  }

  protected canClaimTask(task: TareaInstancia): boolean {
    const user = this.authService.currentUser();
    if (!user?.areaId || !task?.areaId || task.assignee) {
      return false;
    }

    return user.areaId.trim().toLowerCase() === task.areaId.trim().toLowerCase();
  }

  protected getClaimHint(task: TareaInstancia): string {
    if (task.assignee) {
      return `Asignada a ${this.getAssigneeLabel(task)}`;
    }

    const user = this.authService.currentUser();
    if (!task.areaId) {
      return 'Area no identificada';
    }

    if (!user?.areaId) {
      return `Solo usuarios del area ${this.getAreaLabel(task)} pueden tomar esta tarea`;
    }

    if (user.areaId.trim().toLowerCase() !== task.areaId.trim().toLowerCase()) {
      return `Solo usuarios del area ${this.getAreaLabel(task)} pueden tomar esta tarea`;
    }

    return 'Puedes tomar esta tarea';
  }

  protected get filterSummary(): string {
    if (this.viewMode === 'all') {
      return 'Todas las tareas de Camunda';
    }

    if (this.viewMode === 'area') {
      return 'Tareas de mi area';
    }

    return 'Mis tareas';
  }

  protected get showAllTab(): boolean {
    return this.authService.isAdmin();
  }

  protected get myTasksTabLabel(): string {
    return `Mis tareas${this.myTasksCount > 0 ? ` (${this.myTasksCount})` : ''}`;
  }

  protected get myAreaTabLabel(): string {
    return `Tareas de mi area${this.myAreaTasksCount > 0 ? ` (${this.myAreaTasksCount})` : ''}`;
  }

  protected get allTasksTabLabel(): string {
    return `Todas${this.allTasksCount > 0 ? ` (${this.allTasksCount})` : ''}`;
  }

  protected get processOptions(): string[] {
    const values = this.tasks
      .map((task) => task.processDefinitionId?.trim())
      .filter((value): value is string => !!value);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }

  protected get instanceOptions(): TareaInstancia[] {
    const seen = new Set<string>();
    return this.tasks.filter((task) => {
      const id = task.processInstanceId ?? '';
      if (!id || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });
  }

  protected getInstanceLabel(task: TareaInstancia): string {
    return this.getInstanceShortLabel(task);
  }

  protected openTask(task: TareaInstancia): void {
    if (!this.canWorkNow(task)) {
      return;
    }

    this.openQuickWork(task);
  }

  protected openQuickWork(task: TareaInstancia): void {
    if (!task?.id) {
      return;
    }

    this.quickWorkTask = task;
    this.quickWorkLoading = true;
    this.quickWorkError = '';
    this.quickWorkSuccess = '';
    this.quickWorkForm = null;
    this.quickWorkValues = {};
    this.quickWorkFileState = {};
    this.cdr.detectChanges();

    this.taskService.obtenerPorId(task.id).pipe(
      finalize(() => {
        this.quickWorkLoading = false;
        this.cdr.detectChanges();
      }),
    ).subscribe({
      next: (response) => {
        const loadedTask = response.data ?? task;
        this.quickWorkTask = loadedTask;
        this.loadQuickWorkForm(loadedTask);
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.quickWorkError = error?.error?.message || 'No se pudo abrir la tarea.';
        this.cdr.detectChanges();
      },
    });
  }

  protected closeQuickWork(): void {
    if (this.quickWorkSaving) {
      return;
    }

    this.quickWorkTask = null;
    this.quickWorkForm = null;
    this.quickWorkValues = {};
    this.quickWorkFileState = {};
    this.quickWorkError = '';
    this.quickWorkSuccess = '';
  }

  protected get quickWorkProcessLabel(): string {
    return this.quickWorkTask ? this.getProcessLabel(this.quickWorkTask) : '';
  }

  protected get quickWorkAreaLabel(): string {
    return this.quickWorkTask ? this.getAreaLabel(this.quickWorkTask) : '';
  }

  protected get quickWorkHasForm(): boolean {
    return !!this.quickWorkForm;
  }

  protected get quickWorkIsFormValid(): boolean {
    if (!this.quickWorkForm) {
      return true;
    }

    return (this.quickWorkForm.fields ?? []).every((field) => {
      if (!field.required) {
        return true;
      }

      if (field.type === 'file') {
        const selectedFile = this.getQuickWorkSelectedFile(field.name);
        return !!selectedFile;
      }

      if (field.type === 'checkbox') {
        return this.quickWorkValues[field.name] === true;
      }

      if (field.type === 'checklist') {
        return this.getQuickWorkChecklistValues(field.name).length > 0;
      }

      const value = this.quickWorkValues[field.name];
      if (value === undefined || value === null) {
        return false;
      }

      return typeof value === 'string' ? value.trim().length > 0 : true;
    });
  }

  protected get isAnyFileUploading(): boolean {
    return false;
  }

  protected isQuickWorkFieldMissing(field: FormFieldDefinition): boolean {
    if (!field.required) {
      return false;
    }

    if (field.type === 'file') {
      return !this.getQuickWorkSelectedFile(field.name) && !this.getQuickWorkFile(field.name);
    }

    if (field.type === 'checkbox') {
      return this.quickWorkValues[field.name] !== true;
    }

    if (field.type === 'checklist') {
      return this.getQuickWorkChecklistValues(field.name).length === 0;
    }

    const value = this.quickWorkValues[field.name];
    if (value === undefined || value === null) {
      return true;
    }

    return typeof value === 'string' ? value.trim().length === 0 : false;
  }

  protected getQuickWorkFieldValue(field: FormFieldDefinition): string | number | boolean | '' {
    const value = this.quickWorkValues[field.name];
    if (typeof value === 'boolean' || typeof value === 'number') {
      return value;
    }

    return typeof value === 'string' ? value : '';
  }

  protected setQuickWorkFieldValue(fieldName: string, value: unknown): void {
    this.quickWorkValues[fieldName] = value as never;
  }

  protected getQuickWorkFieldOptions(field: FormFieldDefinition): FormFieldOptionDefinition[] {
    if (field.optionItems?.length) {
      return field.optionItems;
    }

    return (field.options ?? []).map((option) => ({
      label: option,
      value: option,
    }));
  }

  protected getQuickWorkChecklistValues(fieldName: string): string[] {
    const value = this.quickWorkValues[fieldName];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  protected isQuickWorkChecklistSelected(fieldName: string, optionValue: string): boolean {
    return this.getQuickWorkChecklistValues(fieldName).includes(optionValue);
  }

  protected toggleQuickWorkChecklistValue(fieldName: string, optionValue: string, checked: boolean): void {
    const currentValues = this.getQuickWorkChecklistValues(fieldName);
    const nextValues = checked
      ? Array.from(new Set([...currentValues, optionValue]))
      : currentValues.filter((value) => value !== optionValue);

    this.quickWorkValues[fieldName] = nextValues;
  }

  protected getQuickWorkFile(fieldName: string): UploadedFileMetadata | null {
    const value = this.quickWorkValues[fieldName];
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (value instanceof File) {
      return null;
    }

    return value as UploadedFileMetadata;
  }

  protected getQuickWorkSelectedFile(fieldName: string): File | null {
    const value = this.quickWorkValues[fieldName];
    return value instanceof File ? value : null;
  }

  protected getQuickWorkFileLabel(fieldName: string): string {
    const selectedFile = this.getQuickWorkSelectedFile(fieldName);
    if (selectedFile) {
      return selectedFile.name;
    }

    const metadata = this.getQuickWorkFile(fieldName);
    return metadata?.fileName || '';
  }

  protected isQuickWorkFileUploading(fieldName: string): boolean {
    return false;
  }

  protected getQuickWorkFileError(fieldName: string): string {
    return this.quickWorkFileState[fieldName]?.error || '';
  }

  protected onQuickWorkFileSelected(field: FormFieldDefinition, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.size > TaskInboxComponent.MAX_UPLOAD_BYTES) {
      this.quickWorkFileState[field.name] = {
        uploading: false,
        error: 'El archivo supera el limite de 10 MB.',
      };
      this.cdr.detectChanges();
      if (input) {
        input.value = '';
      }
      return;
    }

    this.quickWorkValues[field.name] = file;
    this.quickWorkFileState[field.name] = { uploading: false, error: '' };
    this.cdr.detectChanges();
  }

  protected async completeQuickWork(): Promise<void> {
    if (!this.quickWorkTask?.id || this.quickWorkSaving) {
      return;
    }

    if (this.quickWorkForm && !this.quickWorkIsFormValid) {
      this.quickWorkError = 'Completa los campos obligatorios antes de finalizar la tarea.';
      this.cdr.detectChanges();
      return;
    }

    this.quickWorkSaving = true;
    this.quickWorkError = '';
    this.quickWorkSuccess = '';
    this.cdr.detectChanges();

    try {
      const variables = this.quickWorkForm ? await this.buildQuickWorkVariablesWithUploads() : {};
      console.info('[TaskInbox] Completing task with variables', {
        taskId: this.quickWorkTask.id,
        variables,
      });

      await firstValueFrom(this.taskService.completarTareaConVariables(this.quickWorkTask.id, variables));
      this.quickWorkSuccess = 'La tarea se completó correctamente.';
      this.cdr.detectChanges();
      await this.loadTasks();
      setTimeout(() => this.closeQuickWork(), 900);
    } catch (error: any) {
      this.quickWorkError = error?.error?.message || 'No se pudo completar la tarea.';
      this.cdr.detectChanges();
    } finally {
      this.quickWorkSaving = false;
      this.cdr.detectChanges();
    }
  }

  protected takeTask(task: TareaInstancia): void {
    if (!task.id || !this.canClaimTask(task)) {
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.taskService
      .tomarTarea(task.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.showFeedback(`La tarea "${this.getTaskName(task)}" fue tomada correctamente.`, 'success');
          void this.loadTasks();
        },
        error: (error: any) => {
          this.showFeedback(error?.error?.message || 'No se pudo tomar la tarea.', 'error');
        },
      });
  }

  protected trackByInstance(_: number, task: TareaInstancia): string {
    return task.processInstanceId ?? task.id;
  }

  protected async completeTask(task: TareaInstancia): Promise<void> {
    if (!task.id) {
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.taskService
      .completarTarea(task.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.showFeedback(`La tarea "${this.getTaskName(task)}" se completó correctamente.`, 'success');
          void this.loadTasks();
        },
        error: (error: any) => {
          this.showFeedback(error?.error?.message || 'No se pudo completar la tarea.', 'error');
        },
      });
  }

  private async loadTasks(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const request$ = this.viewMode === 'all'
      ? this.taskService.listarTodasCamunda()
      : this.viewMode === 'area'
        ? this.taskService.listarTareasDeMiArea()
        : this.taskService.listarMisTareas();

    forkJoin({
      current: request$,
      mine: this.taskService.listarMisTareas().pipe(finalize(() => undefined)),
      area: this.taskService.listarTareasDeMiArea().pipe(finalize(() => undefined)),
      all: this.showAllTab ? this.taskService.listarTodasCamunda().pipe(finalize(() => undefined)) : of(null),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (result) => {
          const tasks = result.current?.data ?? [];
          this.tasks = tasks;
          this.myTasksCount = result.mine?.data?.length ?? 0;
          this.myAreaTasksCount = result.area?.data?.length ?? 0;
          this.allTasksCount = this.showAllTab ? (result.all?.data?.length ?? 0) : 0;
          this.showFeedback(`Se cargaron ${tasks.length} tareas activas de Camunda.`, 'success');
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.tasks = [];
          this.myTasksCount = 0;
          this.myAreaTasksCount = 0;
          this.allTasksCount = 0;
          this.showFeedback(error?.error?.message || 'No se pudieron cargar las tareas de Camunda.', 'error');
          this.cdr.detectChanges();
        },
      });
  }

  protected getTaskName(task: TareaInstancia): string {
    return task.name || task.nombreTarea || 'Tarea sin nombre';
  }

  private loadQuickWorkForm(task: TareaInstancia): void {
    const processKey = this.getProcessKey(task);
    const taskDefinitionKey = task.taskDefinitionKey || '';
    if (!processKey || !taskDefinitionKey) {
      this.quickWorkForm = null;
      this.quickWorkLoading = false;
      this.quickWorkError = '';
      this.cdr.detectChanges();
      return;
    }

    this.formService.obtenerFormulario(processKey, this.getProcessVersion(task), taskDefinitionKey).subscribe({
      next: (response: ApiResponse<FormDefinition>) => {
        this.quickWorkForm = response.data ?? null;
        this.quickWorkValues = {};
        this.quickWorkFileState = {};
        if (!this.quickWorkForm) {
          this.quickWorkError = 'Esta tarea no tiene formulario configurado.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.quickWorkForm = null;
        this.quickWorkError = 'Esta tarea no tiene formulario configurado.';
        this.cdr.detectChanges();
      },
    });
  }

  private async buildQuickWorkVariablesWithUploads(): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {};
    if (!this.quickWorkForm) {
      return variables;
    }

    for (const field of this.quickWorkForm.fields ?? []) {
      const value = this.quickWorkValues[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (field.type === 'checklist' && Array.isArray(value) && value.length === 0) {
        continue;
      }

      if (field.type === 'file') {
        variables[field.name] = await this.uploadQuickWorkFileValue(value as File | UploadedFileMetadata | null);
        continue;
      }

      if (field.type === 'checklist') {
        variables[field.name] = JSON.stringify(Array.isArray(value) ? value : []);
        continue;
      }

      variables[field.name] = field.type === 'number'
        ? (Number(value) || value)
        : field.type === 'date'
          ? String(value)
          : value;
    }

    return variables;
  }

  private async uploadQuickWorkFileValue(value: File | UploadedFileMetadata | null): Promise<UploadedFileMetadata | null> {
    if (!value) {
      return null;
    }

    if (!(value instanceof File)) {
      return value;
    }

    this.quickWorkFileState['__pending_upload__'] = { uploading: true, error: '' };
    try {
      const response = await firstValueFrom(this.fileUploadService.upload(value));
      return response.data ?? {
        publicId: '',
        fileName: value.name,
        secureUrl: '',
        mimeType: value.type,
        size: value.size,
        resourceType: 'auto',
      };
    } finally {
      delete this.quickWorkFileState['__pending_upload__'];
    }
  }

  private getProcessKey(task: TareaInstancia): string {
    const processId = task.processDefinitionId?.trim();
    if (!processId) {
      return '';
    }

    const [key] = processId.split(':');
    return key?.trim() || '';
  }

  private getProcessVersion(task: TareaInstancia): number {
    const processId = task.processDefinitionId?.trim();
    if (!processId) {
      return 1;
    }

    const parts = processId.split(':');
    if (parts.length < 2) {
      return 1;
    }

    const version = Number(parts[1]);
    return Number.isFinite(version) && version > 0 ? version : 1;
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
    }, 3500);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  private subscribeRealtimeTopics(): void {
    const user = this.authService.currentUser();
    if (user?.areaId) {
      this.realtimeService.subscribeToTopic(`/topic/areas/${user.areaId}/tasks`);
    }
    this.realtimeService.subscribeToTopic('/topic/tasks');

    this.realtimeSubscription = this.realtimeService.events$.subscribe((event) => {
      if (
        event.type === 'TASK_CREATED' ||
        event.type === 'TASK_AVAILABLE' ||
        event.type === 'TASK_CLAIMED' ||
        event.type === 'TASK_COMPLETED'
      ) {
        void this.loadTasks();
      }
    });
  }
}
