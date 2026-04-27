import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Proceso, ProcesoAutosaveRequest, ProcesoCreateRequest, ProcesoUpdateRequest } from '../models/process.models';
import { API_BASE_URL } from '../config/api.config';

export interface ProcessAiIssue {
  type: string;
  description: string;
  elementId?: string | null;
  severity: 'low' | 'medium' | 'high' | string;
}

export interface ProcessAiSuggestion {
  id?: string;
  analysisId?: string | null;
  processId?: string | null;
  processKey?: string | null;
  processVersion?: number | null;
  title: string;
  description: string;
  impact: string;
  relatedElementId?: string | null;
  canBeAppliedAutomatically?: boolean;
  proposedXml?: string | null;
  status?: 'PENDING' | 'APPLIED' | 'REJECTED' | string;
  createdAt?: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
}

export interface ProcessAiAnalysis {
  id?: string;
  processId?: string | null;
  processKey?: string | null;
  processVersion?: number | null;
  processName?: string | null;
  summary: string;
  score: number;
  issues: ProcessAiIssue[];
  suggestions: ProcessAiSuggestion[];
  status?: 'NEW' | 'REVIEWED' | 'IGNORED' | 'APPLIED' | string;
  createdAt?: string;
}

export interface ProcessAiSuggestionActionResponse {
  process?: Proceso | null;
  suggestion?: ProcessAiSuggestion | null;
}

export interface ProcessAiAnalysisRequest {
  processXml: string;
  processName?: string;
  processId?: string | null;
  processKey?: string | null;
  processVersion?: number | null;
  metrics?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class ProcessService {
  constructor(
    private http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string
  ) {}

  guardarProceso(request: ProcesoCreateRequest): Observable<ApiResponse<Proceso>> {
    console.info('[ProcessService] POST /api/procesos -> start', {
      nombre: request.nombre,
      xmlLength: request.xml?.length ?? 0,
      apiUrl: this.apiUrl,
    });

    return this.http.post<ApiResponse<Proceso>>(`${this.apiUrl}/procesos`, request).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] POST /api/procesos -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] POST /api/procesos -> error', error);
        },
        complete: () => {
          console.info('[ProcessService] POST /api/procesos -> complete');
        },
      })
    );
  }

  listarProcesos(): Observable<ApiResponse<Proceso[]>> {
    console.info('[ProcessService] GET /api/procesos -> start', {
      apiUrl: this.apiUrl,
    });

    return this.http.get<ApiResponse<Proceso[]>>(`${this.apiUrl}/procesos`).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] GET /api/procesos -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] GET /api/procesos -> error', error);
        },
      }),
    );
  }

  listarProcesosPublicados(): Observable<ApiResponse<Proceso[]>> {
    console.info('[ProcessService] GET /api/procesos/publicados -> start', {
      apiUrl: this.apiUrl,
    });

    return this.http.get<ApiResponse<Proceso[]>>(`${this.apiUrl}/procesos/publicados`).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] GET /api/procesos/publicados -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] GET /api/procesos/publicados -> error', error);
        },
      }),
    );
  }

  obtenerProceso(id: string): Observable<ApiResponse<Proceso>> {
    console.info('[ProcessService] GET /api/procesos/{id} -> start', {
      id,
      apiUrl: this.apiUrl,
    });

    return this.http.get<ApiResponse<Proceso>>(`${this.apiUrl}/procesos/${id}`).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] GET /api/procesos/{id} -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] GET /api/procesos/{id} -> error', error);
        },
      }),
    );
  }

  actualizarProceso(id: string, request: ProcesoUpdateRequest): Observable<ApiResponse<Proceso>> {
    console.info('[ProcessService] PUT /api/procesos/{id} -> start', {
      id,
      nombre: request.nombre,
      xmlLength: request.xml?.length ?? 0,
      apiUrl: this.apiUrl,
    });

    return this.http.put<ApiResponse<Proceso>>(`${this.apiUrl}/procesos/${id}`, request).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] PUT /api/procesos/{id} -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] PUT /api/procesos/{id} -> error', error);
        },
      }),
    );
  }

  autosaveProceso(id: string, request: ProcesoAutosaveRequest): Observable<ApiResponse<Proceso>> {
    console.info('[ProcessService] PUT /api/procesos/{id}/autosave -> start', {
      id,
      xmlLength: request.xml?.length ?? 0,
      apiUrl: this.apiUrl,
    });

    return this.http.put<ApiResponse<Proceso>>(`${this.apiUrl}/procesos/${id}/autosave`, request).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] PUT /api/procesos/{id}/autosave -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] PUT /api/procesos/{id}/autosave -> error', error);
        },
      }),
    );
  }

  publicarProceso(id: string): Observable<ApiResponse<Proceso>> {
    console.info('[ProcessService] PUT /api/procesos/{id}/publicar -> start', {
      id,
      apiUrl: this.apiUrl,
    });

    return this.http.put<ApiResponse<Proceso>>(`${this.apiUrl}/procesos/${id}/publicar`, {}).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] PUT /api/procesos/{id}/publicar -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] PUT /api/procesos/{id}/publicar -> error', error);
        },
      }),
    );
  }

  iniciarProceso(processKey: string, businessKey?: string): Observable<ApiResponse<Record<string, unknown>>> {
    const path = businessKey
      ? `${this.apiUrl}/camunda/start/${encodeURIComponent(processKey)}/business/${encodeURIComponent(businessKey)}`
      : `${this.apiUrl}/camunda/start/${encodeURIComponent(processKey)}`;

    console.info('[ProcessService] POST /api/camunda/start -> start', {
      processKey,
      businessKey,
      apiUrl: this.apiUrl,
    });

    return this.http.post<ApiResponse<Record<string, unknown>>>(path, {}).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] POST /api/camunda/start -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] POST /api/camunda/start -> error', error);
        },
      }),
    );
  }

  crearNuevaVersion(id: string): Observable<ApiResponse<Proceso>> {
    console.info('[ProcessService] POST /api/procesos/{id}/versionar -> start', {
      id,
      apiUrl: this.apiUrl,
    });

    return this.http.post<ApiResponse<Proceso>>(`${this.apiUrl}/procesos/${id}/versionar`, {}).pipe(
      tap({
        next: (response) => {
          console.info('[ProcessService] POST /api/procesos/{id}/versionar -> success', response);
        },
        error: (error) => {
          console.error('[ProcessService] POST /api/procesos/{id}/versionar -> error', error);
        },
      }),
    );
  }

  generarDiagramaIA(text: string): Observable<ApiResponse<{ processName: string; processKey: string; xml: string }>> {
    console.info('[ProcessService] POST /api/ai/generate-diagram -> start', {
      textLength: text?.length ?? 0,
      apiUrl: this.apiUrl,
    });

    return this.http.post<ApiResponse<{ processName: string; processKey: string; xml: string }>>(
      `${this.apiUrl}/ai/generate-diagram`,
      { text },
    ).pipe(
      tap({
        next: (response) => console.info('[ProcessService] POST /api/ai/generate-diagram -> success', response),
        error: (error) => console.error('[ProcessService] POST /api/ai/generate-diagram -> error', error),
      }),
    );
  }

  editarDiagramaIA(instruction: string, currentXml: string): Observable<ApiResponse<{ xml: string; message: string }>> {
    console.info('[ProcessService] POST /api/ai/edit-diagram -> start', {
      instructionLength: instruction?.length ?? 0,
      xmlLength: currentXml?.length ?? 0,
      apiUrl: this.apiUrl,
    });

    return this.http.post<ApiResponse<{ xml: string; message: string }>>(
      `${this.apiUrl}/ai/edit-diagram`,
      { instruction, currentXml },
    ).pipe(
      tap({
        next: (response) => console.info('[ProcessService] POST /api/ai/edit-diagram -> success', response),
        error: (error) => console.error('[ProcessService] POST /api/ai/edit-diagram -> error', error),
      }),
    );
  }

  analizarProcesoIA(request: ProcessAiAnalysisRequest): Observable<ApiResponse<ProcessAiAnalysis>> {
    console.info('[ProcessService] POST /api/ai/analyze-process -> start', {
      processName: request.processName,
      xmlLength: request.processXml?.length ?? 0,
      apiUrl: this.apiUrl,
    });

    return this.http.post<ApiResponse<ProcessAiAnalysis>>(`${this.apiUrl}/ai/analyze-process`, request).pipe(
      tap({
        next: (response) => console.info('[ProcessService] POST /api/ai/analyze-process -> success', response),
        error: (error) => console.error('[ProcessService] POST /api/ai/analyze-process -> error', error),
      }),
    );
  }

  listarAnalisisIA(): Observable<ApiResponse<ProcessAiAnalysis[]>> {
    console.info('[ProcessService] GET /api/ai/analyses -> start', { apiUrl: this.apiUrl });

    return this.http.get<ApiResponse<ProcessAiAnalysis[]>>(`${this.apiUrl}/ai/analyses`).pipe(
      tap({
        next: (response) => console.info('[ProcessService] GET /api/ai/analyses -> success', response),
        error: (error) => console.error('[ProcessService] GET /api/ai/analyses -> error', error),
      }),
    );
  }

  actualizarEstadoAnalisisIA(id: string, status: 'REVIEWED' | 'IGNORED' | 'APPLIED'): Observable<ApiResponse<ProcessAiAnalysis>> {
    console.info('[ProcessService] PATCH /api/ai/analyses/{id}/status -> start', { id, status });

    return this.http.patch<ApiResponse<ProcessAiAnalysis>>(`${this.apiUrl}/ai/analyses/${id}/status`, { status }).pipe(
      tap({
        next: (response) => console.info('[ProcessService] PATCH /api/ai/analyses/{id}/status -> success', response),
        error: (error) => console.error('[ProcessService] PATCH /api/ai/analyses/{id}/status -> error', error),
      }),
    );
  }

  aplicarSugerenciaIA(id: string): Observable<ApiResponse<ProcessAiSuggestionActionResponse>> {
    console.info('[ProcessService] POST /api/ai/suggestions/{id}/apply -> start', { id });

    return this.http.post<ApiResponse<ProcessAiSuggestionActionResponse>>(`${this.apiUrl}/ai/suggestions/${id}/apply`, {}).pipe(
      tap({
        next: (response) => console.info('[ProcessService] POST /api/ai/suggestions/{id}/apply -> success', response),
        error: (error) => console.error('[ProcessService] POST /api/ai/suggestions/{id}/apply -> error', error),
      }),
    );
  }

  rechazarSugerenciaIA(id: string): Observable<ApiResponse<ProcessAiSuggestionActionResponse>> {
    console.info('[ProcessService] POST /api/ai/suggestions/{id}/reject -> start', { id });

    return this.http.post<ApiResponse<ProcessAiSuggestionActionResponse>>(`${this.apiUrl}/ai/suggestions/${id}/reject`, {}).pipe(
      tap({
        next: (response) => console.info('[ProcessService] POST /api/ai/suggestions/{id}/reject -> success', response),
        error: (error) => console.error('[ProcessService] POST /api/ai/suggestions/{id}/reject -> error', error),
      }),
    );
  }
}
