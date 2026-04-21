import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Proceso, ProcesoCreateRequest, ProcesoUpdateRequest } from '../models/process.models';
import { API_BASE_URL } from '../config/api.config';

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
}
