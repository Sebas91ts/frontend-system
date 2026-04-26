import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { ProcessMonitoring } from '../models/process-monitoring.models';

@Injectable({
  providedIn: 'root',
})
export class ProcessMonitoringService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  obtenerMonitoreo(processId: string): Observable<ApiResponse<ProcessMonitoring>> {
    return this.http.get<ApiResponse<ProcessMonitoring>>(`${this.apiUrl}/procesos/${processId}/monitoring`);
  }
}
