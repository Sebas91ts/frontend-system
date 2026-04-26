import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { NotificationItem, NotificationUnreadCount } from '../models/notification.models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  listarMias(): Observable<ApiResponse<NotificationItem[]>> {
    return this.http.get<ApiResponse<NotificationItem[]>>(`${this.apiUrl}/notifications/me`);
  }

  obtenerNoLeidas(): Observable<ApiResponse<NotificationUnreadCount>> {
    return this.http.get<ApiResponse<NotificationUnreadCount>>(`${this.apiUrl}/notifications/me/unread-count`);
  }

  marcarComoLeida(id: string): Observable<ApiResponse<NotificationItem>> {
    return this.http.patch<ApiResponse<NotificationItem>>(`${this.apiUrl}/notifications/${id}/read`, {});
  }

  marcarTodasComoLeidas(): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(`${this.apiUrl}/notifications/me/read-all`, {});
  }
}
