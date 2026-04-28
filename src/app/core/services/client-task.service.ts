import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import {
  ClientTaskCompleteResponse,
  ClientTaskFormResponse,
  ClientTaskListItem,
} from '../models/client-task.models';

@Injectable({
  providedIn: 'root',
})
export class ClientTaskService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  listarTareas(): Observable<ApiResponse<ClientTaskListItem[]>> {
    console.info('[ClientTaskService] GET /api/client/tasks -> start', { apiUrl: this.apiUrl });
    return this.http.get<ApiResponse<ClientTaskListItem[]>>(`${this.apiUrl}/client/tasks`).pipe(
      tap({
        next: (response) => console.info('[ClientTaskService] GET /api/client/tasks -> success', response),
        error: (error) => console.error('[ClientTaskService] GET /api/client/tasks -> error', error),
      }),
    );
  }

  obtenerFormulario(taskId: string): Observable<ApiResponse<ClientTaskFormResponse>> {
    console.info('[ClientTaskService] GET /api/client/tasks/{id}/form -> start', { taskId });
    return this.http.get<ApiResponse<ClientTaskFormResponse>>(`${this.apiUrl}/client/tasks/${encodeURIComponent(taskId)}/form`).pipe(
      tap({
        next: (response) => console.info('[ClientTaskService] GET /api/client/tasks/{id}/form -> success', response),
        error: (error) => console.error('[ClientTaskService] GET /api/client/tasks/{id}/form -> error', error),
      }),
    );
  }

  completarTarea(taskId: string, payload: FormData): Observable<ApiResponse<ClientTaskCompleteResponse>> {
    console.info('[ClientTaskService] POST /api/client/tasks/{id}/complete -> start', { taskId });
    return this.http.post<ApiResponse<ClientTaskCompleteResponse>>(
      `${this.apiUrl}/client/tasks/${encodeURIComponent(taskId)}/complete`,
      payload,
    ).pipe(
      tap({
        next: (response) => console.info('[ClientTaskService] POST /api/client/tasks/{id}/complete -> success', response),
        error: (error) => console.error('[ClientTaskService] POST /api/client/tasks/{id}/complete -> error', error),
      }),
    );
  }
}
