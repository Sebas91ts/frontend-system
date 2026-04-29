import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
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
}
