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
    console.info('[TaskInstanceService] GET /api/tarea-instancias -> start', { apiUrl: this.apiUrl });
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/tarea-instancias`).pipe(
      tap({
        next: (response) => console.info('[TaskInstanceService] GET /api/tarea-instancias -> success', response),
        error: (error) => console.error('[TaskInstanceService] GET /api/tarea-instancias -> error', error),
      }),
    );
  }

  listarPendientes(): Observable<ApiResponse<TareaInstancia[]>> {
    console.info('[TaskInstanceService] GET /api/tarea-instancias/pendientes -> start', { apiUrl: this.apiUrl });
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/tarea-instancias/pendientes`).pipe(
      tap({
        next: (response) =>
          console.info('[TaskInstanceService] GET /api/tarea-instancias/pendientes -> success', response),
        error: (error) =>
          console.error('[TaskInstanceService] GET /api/tarea-instancias/pendientes -> error', error),
      }),
    );
  }

  obtenerPorId(id: string): Observable<ApiResponse<TareaInstancia>> {
    return this.http.get<ApiResponse<TareaInstancia>>(`${this.apiUrl}/tarea-instancias/${id}`);
  }

  listarPorInstancia(processInstanceId: string): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(
      `${this.apiUrl}/tarea-instancias/instancia/${processInstanceId}`,
    );
  }

  listarPorArea(areaId: string): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(`${this.apiUrl}/tarea-instancias/area/${areaId}`);
  }

  listarPorUsuario(assignedTo: string): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(
      `${this.apiUrl}/tarea-instancias/usuario/${assignedTo}`,
    );
  }

  listarPorProceso(nombreProceso: string): Observable<ApiResponse<TareaInstancia[]>> {
    return this.http.get<ApiResponse<TareaInstancia[]>>(
      `${this.apiUrl}/tarea-instancias/proceso/${encodeURIComponent(nombreProceso)}`,
    );
  }
}
