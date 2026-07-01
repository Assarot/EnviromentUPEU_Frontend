import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id_notification: number;
  message: string;
  type: string; // 'INFO', 'SUCCESS', 'WARNING', 'ERROR'
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener notificaciones del usuario actual
   */
  getMyNotifications(): Observable<AppNotification[]> {
    // Si el backend no tiene endpoints de notificaciones aún, se puede mockear:
    // return of([
    //   { id_notification: 1, message: 'Tu reserva #12 fue aprobada.', type: 'SUCCESS', is_read: false, created_at: new Date().toISOString() },
    //   { id_notification: 2, message: 'Nueva solicitud de reserva pendiente de revisión.', type: 'INFO', is_read: true, created_at: new Date().toISOString() }
    // ]);
    return this.http.get<AppNotification[]>(`${this.apiUrl}/my-notifications`);
  }

  /**
   * Marcar notificación como leída
   */
  markAsRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
  }
}
