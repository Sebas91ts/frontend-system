import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { Area, AreaCreateRequest, AreaUpdateRequest } from '../models/area.models';

@Injectable({
  providedIn: 'root',
})
export class AreaService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  listarAreas(): Observable<ApiResponse<Area[]>> {
    console.info('[AreaService] GET /api/areas -> start', { apiUrl: this.apiUrl });

    return this.http.get<ApiResponse<Area[]>>(`${this.apiUrl}/areas`).pipe(
      tap({
        next: (response) => console.info('[AreaService] GET /api/areas -> success', response),
        error: (error) => console.error('[AreaService] GET /api/areas -> error', error),
      }),
    );
  }

  listarAreasActivas(): Observable<ApiResponse<Area[]>> {
    return this.http.get<ApiResponse<Area[]>>(`${this.apiUrl}/areas/activas`);
  }

  obtenerArea(id: string): Observable<ApiResponse<Area>> {
    return this.http.get<ApiResponse<Area>>(`${this.apiUrl}/areas/${id}`);
  }

  crearArea(request: AreaCreateRequest): Observable<ApiResponse<Area>> {
    console.info('[AreaService] POST /api/areas -> start', { apiUrl: this.apiUrl });

    return this.http.post<ApiResponse<Area>>(`${this.apiUrl}/areas`, request).pipe(
      tap({
        next: (response) => console.info('[AreaService] POST /api/areas -> success', response),
        error: (error) => console.error('[AreaService] POST /api/areas -> error', error),
      }),
    );
  }

  actualizarArea(id: string, request: AreaUpdateRequest): Observable<ApiResponse<Area>> {
    console.info('[AreaService] PUT /api/areas/{id} -> start', { id, apiUrl: this.apiUrl });

    return this.http.put<ApiResponse<Area>>(`${this.apiUrl}/areas/${id}`, request).pipe(
      tap({
        next: (response) => console.info('[AreaService] PUT /api/areas/{id} -> success', response),
        error: (error) => console.error('[AreaService] PUT /api/areas/{id} -> error', error),
      }),
    );
  }

  desactivarArea(id: string): Observable<ApiResponse<void>> {
    console.info('[AreaService] PATCH /api/areas/{id}/desactivar -> start', { id, apiUrl: this.apiUrl });

    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/areas/${id}/desactivar`, {}).pipe(
      tap({
        next: (response) => console.info('[AreaService] PATCH /api/areas/{id}/desactivar -> success', response),
        error: (error) => console.error('[AreaService] PATCH /api/areas/{id}/desactivar -> error', error),
      }),
    );
  }
}
