import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Proceso, ProcesoCreateRequest } from '../models/process.models';
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
}
