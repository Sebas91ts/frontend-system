import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessAiAnalysis, ProcessService } from '../../../../core/services/process.service';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-recommendations.component.html',
  styleUrl: './ai-recommendations.component.css',
})
export class AiRecommendationsComponent implements OnInit {
  private readonly processService = inject(ProcessService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected analyses: ProcessAiAnalysis[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected updatingId = '';

  ngOnInit(): void {
    this.loadAnalyses();
  }

  protected goBack(): void {
    void this.router.navigate(['/admin']);
  }

  protected refresh(): void {
    this.loadAnalyses();
  }

  protected trackAnalysis(_: number, analysis: ProcessAiAnalysis): string {
    return analysis.id || `${analysis.processKey}-${analysis.createdAt}`;
  }

  protected scoreTone(score?: number): string {
    const value = score ?? 0;
    if (value >= 85) {
      return 'good';
    }
    if (value >= 70) {
      return 'warning';
    }
    return 'danger';
  }

  protected severityLabel(severity?: string): string {
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

  protected formatDate(value?: string): string {
    return value ? new Date(value).toLocaleString() : 'Sin fecha';
  }

  protected viewProcess(analysis: ProcessAiAnalysis): void {
    if (!analysis.processId) {
      return;
    }

    void this.router.navigate(['/processes/designer', analysis.processId]);
  }

  protected updateStatus(analysis: ProcessAiAnalysis, status: 'REVIEWED' | 'IGNORED'): void {
    if (!analysis.id || this.updatingId) {
      return;
    }

    this.updatingId = analysis.id;
    this.processService.actualizarEstadoAnalisisIA(analysis.id, status)
      .pipe(
        finalize(() => {
          this.updatingId = '';
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success || !response.data) {
            this.errorMessage = response.message || 'No se pudo actualizar la recomendacion.';
            return;
          }

          this.analyses = this.analyses.map((item) => item.id === response.data?.id ? response.data : item);
          this.errorMessage = '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudo actualizar la recomendacion.';
        },
      });
  }

  private loadAnalyses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.processService.listarAnalisisIA()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.analyses = response.data ?? [];
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudieron cargar las recomendaciones IA.';
          this.analyses = [];
        },
      });
  }
}
