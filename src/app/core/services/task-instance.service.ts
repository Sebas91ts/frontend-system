import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { TareaInstancia } from '../models/task-instance.models';

@Injectable({
  providedIn: 'root',
})
export class TaskInstanceService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  listarTodas(): Observable<ApiResponse<TareaInstancia[]>> {
    console.info('[TaskInstanceService] GET /api/camunda/tasks -> start', { apiUrl: this.apiUrl });
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/camunda/tasks`).pipe(
      tap({
        next: (response) => console.info('[TaskInstanceService] GET /api/camunda/tasks -> success', response),
        error: (error) => console.error('[TaskInstanceService] GET /api/camunda/tasks -> error', error),
      }),
    );
  }

  listarPendientes(): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/camunda/tasks/my`);
  }

  listarMisTareas(): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/camunda/tasks/my`);
  }

  listarTareasDeMiArea(): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/camunda/tasks/my-area`);
  }

  listarTodasCamunda(): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/camunda/tasks/all`);
  }

  obtenerPorId(id: string): Observable<ApiResponse<TareaInstancia>> {
    return this.http.get<ApiResponse<TareaInstancia>>(`${this.apiUrl}/camunda/tasks/${id}`);
  }

  completarTarea(taskId: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(
      `${this.apiUrl}/camunda/tasks/${taskId}/complete`,
      {},
    );
  }

  completarTareaConVariables(
    taskId: string,
    variables: Record<string, unknown>,
  ): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(
      `${this.apiUrl}/camunda/tasks/${taskId}/complete`,
      { variables },
    );
  }

  tomarTarea(taskId: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(
      `${this.apiUrl}/camunda/tasks/${taskId}/claim`,
      {},
    );
  }
}
