import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { DocumentSearchRequest, DocumentSearchResponse } from '../models/document-search.models';

@Injectable({
  providedIn: 'root',
})
export class DocumentSearchService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  search(request: DocumentSearchRequest = {}): Observable<ApiResponse<DocumentSearchResponse>> {
    let params = new HttpParams();
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiResponse<DocumentSearchResponse>>(`${this.apiUrl}/documents/search`, { params });
  }
}
