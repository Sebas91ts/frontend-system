import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ProcessAiAnalysis, ProcessService } from '../../../../core/services/process.service';

@Component({
  selector: 'app-ai-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-recommendations.component.html',
  styleUrl: './ai-recommendations.component.css',
})
export class AiRecommendationsComponent implements OnInit {
  private readonly processService = inject(ProcessService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected analyses: ProcessAiAnalysis[] = [];
  protected filteredAnalyses: ProcessAiAnalysis[] = [];
  protected isLoading = true;
  protected errorMessage = '';
  protected updatingId = '';
  protected decisionLoadingId = '';
  protected decisionMessage = '';
  protected actionMessage = '';
  protected actionMessageType: 'success' | 'error' = 'success';
  protected showDecisionModal = false;
  protected selectedSuggestionId = '';
  protected selectedSuggestionTitle = '';
  protected selectedDecision: 'apply' | 'reject' | '' = '';
  protected showReviewedAnalyses = false;
  protected statusFilter: 'ALL' | 'NEW' | 'REVIEWED' | 'IGNORED' | 'APPLIED' = 'ALL';
  protected maxScoreFilter: number | null = null;
  protected dateFromFilter = '';
  protected dateToFilter = '';

  ngOnInit(): void {
    this.loadAnalyses();
  }

  protected goBack(): void {
    void this.router.navigate(['/admin']);
  }

  protected refresh(): void {
    this.loadAnalyses();
  }

  protected applyFilters(): void {
    const dateFrom = this.dateFromFilter ? new Date(this.dateFromFilter) : null;
    const dateTo = this.dateToFilter ? new Date(this.dateToFilter) : null;
    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }

    this.filteredAnalyses = (this.analyses ?? []).filter((analysis) => {
      const status = (analysis.status || 'NEW').toUpperCase();
      const score = analysis.score ?? 0;
      const createdAt = analysis.createdAt ? new Date(analysis.createdAt) : null;

      if (!this.showReviewedAnalyses && status !== 'NEW') {
        return false;
      }

      if (this.showReviewedAnalyses && this.statusFilter !== 'ALL' && status !== this.statusFilter) {
        return false;
      }

      if (this.maxScoreFilter !== null && this.maxScoreFilter !== undefined && score > this.maxScoreFilter) {
        return false;
      }

      if (dateFrom && (!createdAt || createdAt < dateFrom)) {
        return false;
      }

      if (dateTo && (!createdAt || createdAt > dateTo)) {
        return false;
      }

      return true;
    });
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

  protected formatDecisionTitle(value?: string): string {
    return value ? value : 'Sugerencia IA';
  }

  protected canApplySuggestion(suggestion?: ProcessAiAnalysis['suggestions'][number]): boolean {
    return Boolean(
      suggestion?.id
      && suggestion?.status !== 'APPLIED'
      && suggestion?.status !== 'REJECTED'
      && suggestion?.canBeAppliedAutomatically
      && suggestion?.proposedXml
    );
  }

  protected filteredCountLabel(): string {
    return `${this.filteredAnalyses.length} recomendaciones visibles`;
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
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudo actualizar la recomendacion.';
        },
      });
  }

  protected openDecisionModal(suggestion: NonNullable<ProcessAiAnalysis['suggestions']>[number], decision: 'apply' | 'reject'): void {
    if (!suggestion.id) {
      return;
    }

    this.selectedSuggestionId = suggestion.id;
    this.selectedSuggestionTitle = suggestion.title || 'Sugerencia IA';
    this.selectedDecision = decision;
    this.decisionMessage = '';
    this.showDecisionModal = true;
  }

  protected closeDecisionModal(): void {
    if (this.decisionLoadingId) {
      return;
    }

    this.showDecisionModal = false;
    this.selectedSuggestionId = '';
    this.selectedSuggestionTitle = '';
    this.selectedDecision = '';
    this.decisionMessage = '';
  }

  protected confirmDecision(): void {
    if (!this.selectedSuggestionId || !this.selectedDecision || this.decisionLoadingId) {
      return;
    }

    const suggestionId = this.selectedSuggestionId;
    this.decisionLoadingId = suggestionId;
    this.decisionMessage = '';

    const action$ = this.selectedDecision === 'apply'
      ? this.processService.aplicarSugerenciaIA(suggestionId)
      : this.processService.rechazarSugerenciaIA(suggestionId);

    action$
      .pipe(
        finalize(() => {
          this.decisionLoadingId = '';
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.decisionMessage = response.message || 'No se pudo procesar la sugerencia.';
            return;
          }

          this.actionMessage = response.message || 'Sugerencia procesada correctamente.';
          this.actionMessageType = 'success';
          this.showDecisionModal = false;
          this.reloadAnalysesAfterDecision();
        },
        error: (error) => {
          this.decisionMessage = error?.error?.message || 'No se pudo procesar la sugerencia.';
          this.actionMessage = this.decisionMessage;
          this.actionMessageType = 'error';
        },
      });
  }

  private loadAnalyses(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.actionMessage = '';

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
          this.applyFilters();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'No se pudieron cargar las recomendaciones IA.';
          this.analyses = [];
          this.filteredAnalyses = [];
        },
      });
  }

  private reloadAnalysesAfterDecision(): void {
    this.processService.listarAnalisisIA().subscribe({
      next: (response) => {
        this.analyses = response.data ?? [];
        this.applyFilters();
        this.showDecisionModal = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadAnalyses();
      },
    });
  }
}
