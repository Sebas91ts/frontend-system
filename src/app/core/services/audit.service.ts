import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { AuditEvent, AuditSearchRequest, AuditSearchResponse } from '../models/audit.models';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  search(request: AuditSearchRequest = {}): Observable<ApiResponse<AuditSearchResponse>> {
    let params = new HttpParams();
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiResponse<AuditSearchResponse>>(`${this.apiUrl}/audit/events`, { params });
  }

  byDocument(documentId: string): Observable<ApiResponse<AuditEvent[]>> {
    return this.http.get<ApiResponse<AuditEvent[]>>(`${this.apiUrl}/audit/documents/${encodeURIComponent(documentId)}`);
  }

  byProcessInstance(processInstanceId: string): Observable<ApiResponse<AuditEvent[]>> {
    return this.http.get<ApiResponse<AuditEvent[]>>(`${this.apiUrl}/audit/process-instances/${encodeURIComponent(processInstanceId)}`);
  }

  byTask(taskInstanceId: string): Observable<ApiResponse<AuditEvent[]>> {
    return this.http.get<ApiResponse<AuditEvent[]>>(`${this.apiUrl}/audit/tasks/${encodeURIComponent(taskInstanceId)}`);
  }
}
