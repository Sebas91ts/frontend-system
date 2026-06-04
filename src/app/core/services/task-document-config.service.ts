import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import {
  TaskDocumentConfig,
  TaskDocumentConfigCreateRequest,
  TaskDocumentUploadValidationRequest,
  TaskDocumentUploadValidationResponse,
} from '../models/document-config.models';

@Injectable({
  providedIn: 'root',
})
export class TaskDocumentConfigService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  guardarConfig(request: TaskDocumentConfigCreateRequest): Observable<ApiResponse<TaskDocumentConfig>> {
    return this.http.post<ApiResponse<TaskDocumentConfig>>(`${this.apiUrl}/documents/task-config`, request).pipe(
      tap({
        next: (response) => console.info('[TaskDocumentConfigService] POST /api/documents/task-config -> success', response),
        error: (error) => console.error('[TaskDocumentConfigService] POST /api/documents/task-config -> error', error),
      }),
    );
  }

  obtenerConfig(processKey: string, version: number, taskDefinitionKey: string): Observable<ApiResponse<TaskDocumentConfig>> {
    return this.http.get<ApiResponse<TaskDocumentConfig>>(
      `${this.apiUrl}/documents/task-config/${encodeURIComponent(processKey)}/${version}/${encodeURIComponent(taskDefinitionKey)}`,
    );
  }

  validarUpload(request: TaskDocumentUploadValidationRequest): Observable<ApiResponse<TaskDocumentUploadValidationResponse>> {
    return this.http.post<ApiResponse<TaskDocumentUploadValidationResponse>>(
      `${this.apiUrl}/documents/task-config/validate-upload`,
      request,
    );
  }
}

