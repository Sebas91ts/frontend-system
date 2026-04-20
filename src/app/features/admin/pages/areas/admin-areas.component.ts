import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Area, AreaCreateRequest, AreaUpdateRequest } from '../../../../core/models/area.models';
import { AreaService } from '../../../../core/services/area.service';

@Component({
  selector: 'app-admin-areas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-areas.component.html',
  styleUrl: './admin-areas.component.css',
})
export class AdminAreasComponent implements OnInit, OnDestroy {
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly areaService = inject(AreaService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  protected areas: Area[] = [];
  protected isLoading = false;
  protected isSaving = false;
  protected isDesactivatingId: string | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected isFormOpen = false;
  protected editingAreaId: string | null = null;
  protected isDeactivateModalOpen = false;
  protected areaToDeactivate: Area | null = null;

  protected form: AreaCreateRequest = {
    nombre: '',
    descripcion: '',
  };

  ngOnInit(): void {
    this.loadAreas();
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
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
  }

  loadAreas(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.areaService
      .listarAreas()
      .pipe(
        finalize(() => {
          this.ngZone.run(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }),
      )
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.areas = response.data ?? [];
            this.cdr.detectChanges();
          });
        },
        error: (error: any) => {
          this.ngZone.run(() => {
            this.showFeedback(
              error?.error?.data?.message ||
                error?.error?.message ||
                'No se pudo cargar la lista de areas.',
              'error',
            );
            this.cdr.detectChanges();
          });
        },
      });
  }

  openCreate(): void {
    this.editingAreaId = null;
    this.form = { nombre: '', descripcion: '' };
    this.isFormOpen = true;
  }

  openEdit(area: Area): void {
    this.editingAreaId = area.id;
    this.form = {
      nombre: area.nombre,
      descripcion: area.descripcion ?? '',
    };
    this.isFormOpen = true;
  }

  closeForm(): void {
    if (this.isSaving) {
      return;
    }

    this.isFormOpen = false;
  }

  saveArea(): void {
    if (this.isSaving) {
      return;
    }

    const payload: AreaCreateRequest | AreaUpdateRequest = {
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || '',
    };

    if (!payload.nombre) {
      this.showFeedback('Debes ingresar un nombre para el area.', 'error');
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.editingAreaId
      ? this.areaService.actualizarArea(this.editingAreaId, payload as AreaUpdateRequest)
      : this.areaService.crearArea(payload);

    request$.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: (response) => {
        this.showFeedback(response.message || 'Area guardada correctamente.', 'success');
        this.isFormOpen = false;
        this.loadAreas();
      },
      error: (error: any) => {
        this.showFeedback(
          error?.error?.data?.nombre ||
            error?.error?.data?.message ||
            error?.error?.message ||
            'No se pudo guardar el area.',
          'error',
        );
      },
    });
  }

  openDeactivateModal(area: Area): void {
    if (this.isDesactivatingId) {
      return;
    }

    this.areaToDeactivate = area;
    this.isDeactivateModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDeactivateModal(): void {
    if (this.isDesactivatingId) {
      return;
    }

    this.isDeactivateModalOpen = false;
    this.areaToDeactivate = null;
  }

  confirmDeactivate(): void {
    if (!this.areaToDeactivate || this.isDesactivatingId) {
      return;
    }

    const area = this.areaToDeactivate;
    this.isDesactivatingId = area.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.areaService
      .desactivarArea(area.id)
      .pipe(finalize(() => (this.isDesactivatingId = null)))
      .subscribe({
        next: (response) => {
          this.showFeedback(response.message || 'Area desactivada correctamente.', 'success');
          this.isDeactivateModalOpen = false;
          this.areaToDeactivate = null;
          this.loadAreas();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.data?.message ||
              error?.error?.message ||
              'No se pudo desactivar el area.',
            'error',
          );
        },
      });
  }
}
