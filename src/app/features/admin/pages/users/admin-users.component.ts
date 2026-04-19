import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Usuario, RegisterRequest } from '../../../../core/models/auth.models';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly userService = inject(UserService);
  protected readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  protected usuarios: Usuario[] = [];
  protected isLoading = false;
  protected isSaving = false;
  protected isDeletingId: string | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected isFormOpen = false;
  protected editingUserId: string | null = null;
  protected isDeleteModalOpen = false;
  protected userToDelete: Usuario | null = null;

  protected form: RegisterRequest = {
    nombre: '',
    apellido: '',
    email: '',
    password: '',
  };

  ngOnInit(): void {
    this.loadUsers();
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

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.userService
      .listarUsuarios()
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
            this.usuarios = response.data ?? [];
            this.cdr.detectChanges();
          });
        },
      error: (error: any) => {
          this.ngZone.run(() => {
            this.showFeedback(
              error?.error?.data?.message ||
              error?.error?.message ||
              'No se pudo cargar la lista de usuarios.',
              'error',
            );
            this.cdr.detectChanges();
          });
        },
      });
  }

  openCreate(): void {
    this.editingUserId = null;
    this.form = { nombre: '', apellido: '', email: '', password: '' };
    this.isFormOpen = true;
  }

  openEdit(usuario: Usuario): void {
    this.editingUserId = usuario.id;
    this.form = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      password: '',
    };
    this.isFormOpen = true;
  }

  closeForm(): void {
    if (this.isSaving) {
      return;
    }

    this.isFormOpen = false;
  }

  saveUser(): void {
    if (this.isSaving) {
      return;
    }

    const payload: any = { ...this.form };
    if (!payload.password) {
      delete payload.password;
    }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.editingUserId
      ? this.userService.actualizarUsuario(this.editingUserId, payload)
      : this.userService.registrarUsuarioAdmin(payload);

    request$.pipe(finalize(() => (this.isSaving = false))).subscribe({
      next: (response) => {
        this.showFeedback(response.message || 'Usuario guardado correctamente.', 'success');
        this.isFormOpen = false;
        this.loadUsers();
      },
      error: (error: any) => {
        this.isSaving = false;
        this.showFeedback(
          error?.error?.data?.email ||
          error?.error?.data?.password ||
          error?.error?.message ||
          'No se pudo guardar el usuario.',
          'error',
        );
      },
    });
  }

  openDeleteModal(usuario: Usuario): void {
    if (this.isDeletingId) {
      return;
    }

    this.userToDelete = usuario;
    this.isDeleteModalOpen = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeDeleteModal(): void {
    if (this.isDeletingId) {
      return;
    }

    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  confirmDelete(): void {
    if (!this.userToDelete || this.isDeletingId) {
      return;
    }

    const usuario = this.userToDelete;
    this.isDeletingId = usuario.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService
      .eliminarUsuario(usuario.id)
      .pipe(finalize(() => (this.isDeletingId = null)))
      .subscribe({
      next: (response) => {
          this.showFeedback(response.message || 'Usuario eliminado correctamente.', 'success');
          this.isDeleteModalOpen = false;
          this.userToDelete = null;
          this.loadUsers();
        },
        error: (error: any) => {
          this.showFeedback(
            error?.error?.data?.message ||
            error?.error?.message ||
            'No se pudo eliminar el usuario.',
            'error',
          );
        },
      });
  }
}
