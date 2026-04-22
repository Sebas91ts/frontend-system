import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { UploadedFileMetadata } from '../models/form.models';

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  upload(file: File): Observable<ApiResponse<UploadedFileMetadata>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<UploadedFileMetadata>>(`${this.apiUrl}/files/upload`, formData);
  }
}
