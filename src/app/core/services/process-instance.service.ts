import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { ProcessInstance } from '../models/process-instance.models';

@Injectable({
  providedIn: 'root',
})
export class ProcessInstanceService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  listar(): Observable<ApiResponse<ProcessInstance[]>> {
    return this.http.get<ApiResponse<ProcessInstance[]>>(`${this.apiUrl}/proceso-instancias`);
  }

  obtenerPorId(id: string): Observable<ApiResponse<ProcessInstance>> {
    return this.http.get<ApiResponse<ProcessInstance>>(`${this.apiUrl}/proceso-instancias/${id}`);
  }
}
