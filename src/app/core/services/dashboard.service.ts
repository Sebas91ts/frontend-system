import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { DashboardSummary } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  obtenerResumen(): Observable<ApiResponse<DashboardSummary>> {
    console.info('[DashboardService] GET /api/dashboard/summary -> start', { apiUrl: this.apiUrl });
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.apiUrl}/dashboard/summary`).pipe(
      tap({
        next: (response) => console.info('[DashboardService] GET /api/dashboard/summary -> success', response),
        error: (error) => console.error('[DashboardService] GET /api/dashboard/summary -> error', error),
      }),
    );
  }
}
