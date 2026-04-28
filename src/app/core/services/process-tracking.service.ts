import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { ClientInstanceTracking, ProcessInstanceTracking } from '../models/process-tracking.models';

@Injectable({
  providedIn: 'root',
})
export class ProcessTrackingService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  obtenerTracking(processInstanceId: string): Observable<ApiResponse<ProcessInstanceTracking>> {
    return this.http.get<ApiResponse<ProcessInstanceTracking>>(
      `${this.apiUrl}/process-instances/${processInstanceId}/tracking`,
    );
  }

  obtenerTrackingCliente(processInstanceId: string): Observable<ApiResponse<ClientInstanceTracking>> {
    return this.http.get<ApiResponse<ClientInstanceTracking>>(
      `${this.apiUrl}/client/instances/${processInstanceId}/tracking`,
    );
  }
}
