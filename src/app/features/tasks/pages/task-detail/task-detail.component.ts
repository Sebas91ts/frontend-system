import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TaskInstanceService } from '../../../../core/services/task-instance.service';
import { TareaInstancia } from '../../../../core/models/task-instance.models';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly taskService = inject(TaskInstanceService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected task: TareaInstancia | null = null;
  protected isLoading = false;
  protected errorMessage = '';
  private loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No se recibió el identificador de la tarea.';
      return;
    }

    this.loadTask(id);
  }

  protected goBack(): void {
    void this.router.navigate(['/tasks']);
  }

  protected formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }

  protected openPlaceholderAction(): void {
    console.info('[TaskDetail] Acción pendiente para tarea', this.task?.id);
  }

  private loadTask(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.clearLoadingTimeout();
    this.loadingTimeoutId = setTimeout(() => {
      if (!this.task && this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'La carga del detalle tardó demasiado. Intenta refrescar la página.';
        this.cdr.detectChanges();
      }
    }, 15000);

    this.taskService
      .obtenerPorId(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.clearLoadingTimeout();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.task = response.data ?? null;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'No se pudo cargar el detalle de la tarea.';
          this.cdr.detectChanges();
        },
      });
  }

  private clearLoadingTimeout(): void {
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
      this.loadingTimeoutId = null;
    }
  }
}
