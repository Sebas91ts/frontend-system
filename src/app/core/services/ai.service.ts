import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import {
  AiAssistResponse,
  AiAssignmentRecommendationResponse,
  AiBusinessContextRequest,
  AiDocumentAnalysisRequest,
  AiDocumentAnalysisResponse,
  AiProcessRecommendationResponse,
  AiReportPlanResponse,
  AiRiskPredictionResponse,
  AiRoutingDashboardResponse,
  AiVoiceRequest,
} from '../models/enterprise-ai.models';
import { FormFieldDefinition } from '../models/form.models';

export interface FormFillSuggestion {
  fieldName: string;
  value: string | number | boolean | string[] | null;
  rationale?: string | null;
}

export interface FormFillResponse {
  summary: string;
  suggestions: FormFillSuggestion[];
}

export interface FormFillRequest {
  transcript: string;
  processName?: string;
  taskName?: string;
  areaName?: string;
  currentValues?: Record<string, unknown>;
  fields: Array<{
    name: string;
    label: string;
    type: FormFieldDefinition['type'];
    required: boolean;
    placeholder?: string | null;
    helpText?: string | null;
    options: string[];
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  sugerirFormulario(request: FormFillRequest): Observable<ApiResponse<FormFillResponse>> {
    return this.http.post<ApiResponse<FormFillResponse>>(`${this.apiUrl}/ai/fill-form`, request).pipe(
      tap({
        next: (response) => console.info('[AiService] POST /api/ai/fill-form -> success', response),
        error: (error) => console.error('[AiService] POST /api/ai/fill-form -> error', error),
      }),
    );
  }

  asistir(request: AiBusinessContextRequest): Observable<ApiResponse<AiAssistResponse>> {
    return this.http.post<ApiResponse<AiAssistResponse>>(`${this.apiUrl}/ai/assist`, request);
  }

  recomendarProceso(request: AiBusinessContextRequest): Observable<ApiResponse<AiProcessRecommendationResponse>> {
    return this.http.post<ApiResponse<AiProcessRecommendationResponse>>(`${this.apiUrl}/ai/recommend-process`, request);
  }

  planificarReporte(request: AiBusinessContextRequest): Observable<ApiResponse<AiReportPlanResponse>> {
    return this.http.post<ApiResponse<AiReportPlanResponse>>(`${this.apiUrl}/ai/reports`, request);
  }

  analizarDocumento(request: AiDocumentAnalysisRequest): Observable<ApiResponse<AiDocumentAnalysisResponse>> {
    return this.http.post<ApiResponse<AiDocumentAnalysisResponse>>(`${this.apiUrl}/ai/document-analysis`, request);
  }

  procesarVoz(request: AiVoiceRequest): Observable<ApiResponse<AiAssistResponse>> {
    return this.http.post<ApiResponse<AiAssistResponse>>(`${this.apiUrl}/ai/voice`, request);
  }

  predecirRiesgoTarea(taskId: string): Observable<ApiResponse<AiRiskPredictionResponse>> {
    return this.http.post<ApiResponse<AiRiskPredictionResponse>>(
      `${this.apiUrl}/ai/routing/task-risk/${encodeURIComponent(taskId)}`,
      {},
    );
  }

  predecirRiesgoInstancia(processInstanceId: string): Observable<ApiResponse<AiRiskPredictionResponse>> {
    return this.http.post<ApiResponse<AiRiskPredictionResponse>>(
      `${this.apiUrl}/ai/routing/instance-risk/${encodeURIComponent(processInstanceId)}`,
      {},
    );
  }

  recomendarAsignacion(taskId: string): Observable<ApiResponse<AiAssignmentRecommendationResponse>> {
    return this.http.post<ApiResponse<AiAssignmentRecommendationResponse>>(
      `${this.apiUrl}/ai/routing/recommend-assignment/${encodeURIComponent(taskId)}`,
      {},
    );
  }

  obtenerDashboardEnrutamiento(): Observable<ApiResponse<AiRoutingDashboardResponse>> {
    return this.http.get<ApiResponse<AiRoutingDashboardResponse>>(`${this.apiUrl}/ai/routing/dashboard`);
  }
}
