import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import {
  FormDefinition,
  FormDefinitionCreateRequest,
  FormDefinitionUpdateRequest,
} from '../models/form.models';

@Injectable({
  providedIn: 'root',
})
export class FormService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  obtenerFormulario(processKey: string, version: number, taskDefinitionKey: string): Observable<ApiResponse<FormDefinition>> {
    return this.http.get<ApiResponse<FormDefinition>>(
      `${this.apiUrl}/forms/${encodeURIComponent(processKey)}/${version}/${encodeURIComponent(taskDefinitionKey)}`,
    );
  }

  crearFormulario(request: FormDefinitionCreateRequest): Observable<ApiResponse<FormDefinition>> {
    return this.http.post<ApiResponse<FormDefinition>>(`${this.apiUrl}/forms`, request).pipe(
      tap({
        next: (response) => console.info('[FormService] POST /api/forms -> success', response),
        error: (error) => console.error('[FormService] POST /api/forms -> error', error),
      }),
    );
  }

  actualizarFormulario(id: string, request: FormDefinitionUpdateRequest): Observable<ApiResponse<FormDefinition>> {
    return this.http.put<ApiResponse<FormDefinition>>(`${this.apiUrl}/forms/${id}`, request).pipe(
      tap({
        next: (response) => console.info('[FormService] PUT /api/forms/{id} -> success', response),
        error: (error) => console.error('[FormService] PUT /api/forms/{id} -> error', error),
      }),
    );
  }

  listarPorProceso(processKey: string): Observable<ApiResponse<FormDefinition[]>> {
    return this.http.get<ApiResponse<FormDefinition[]>>(`${this.apiUrl}/forms/process/${encodeURIComponent(processKey)}`).pipe(
      tap({
        next: (response) => console.log('FORMULARIOS BACKEND:', JSON.stringify(response.data ?? [], null, 2)),
        error: (error) => console.error('[FormService] GET /api/forms/process -> error', error),
      }),
    );
  }
}
