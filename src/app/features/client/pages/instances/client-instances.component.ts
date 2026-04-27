import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessService } from '../../../../core/services/process.service';
import { ClientProcessInstanceItem } from '../../../../core/models/process.models';

@Component({
  selector: 'app-client-instances',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-instances.component.html',
  styleUrl: './client-instances.component.css',
})
export class ClientInstancesComponent implements OnInit {
  private readonly processService = inject(ProcessService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected errorMessage = '';
  protected instances: ClientProcessInstanceItem[] = [];

  ngOnInit(): void {
    this.cargarInstancias();
  }

  cargarInstancias(): void {
    this.loading = true;
    this.errorMessage = '';
    this.instances = [];
    this.cdr.detectChanges();

    this.processService
      .listarInstanciasCliente()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.instances = Array.isArray(response.data) ? response.data : [];
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.instances = [];
          this.errorMessage = error?.error?.message || 'No se pudieron cargar tus tramites.';
          this.cdr.detectChanges();
        },
      });
  }

  trackByInstanceId(_: number, item: ClientProcessInstanceItem): string {
    return item.id;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString();
  }
}
