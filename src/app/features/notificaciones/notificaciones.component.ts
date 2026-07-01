import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../core/services/notification.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent implements OnInit {
  private notificationService = inject(NotificationService);
  
  notifications: AppNotification[] = [];
  isLoading = false;

  // Fallback a notificaciones simuladas si el backend aún no está listo
  mockNotifications: AppNotification[] = [
    { id_notification: 1, message: 'Tu reserva del Laboratorio de Cómputo B ha sido APROBADA.', type: 'SUCCESS', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id_notification: 2, message: 'Nueva solicitud de reserva del Auditorio Central pendiente de revisión.', type: 'INFO', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id_notification: 3, message: 'Tu reserva de la Sala de Estudio 4 ha sido RECHAZADA. Motivo: Mantenimiento programado.', type: 'ERROR', is_read: true, created_at: new Date(Date.now() - 172800000).toISOString() }
  ];

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getMyNotifications().pipe(
      catchError(() => {
        // Fallback a mocks si el endpoint falla (porque tal vez el backend no lo tenga implementado)
        return of(this.mockNotifications);
      })
    ).subscribe((data) => {
      this.notifications = data;
      this.isLoading = false;
    });
  }

  markAsRead(notif: AppNotification): void {
    if (notif.is_read) return;
    notif.is_read = true;
    
    this.notificationService.markAsRead(notif.id_notification).pipe(
      catchError(() => of(null)) // Ignorar errores en mock
    ).subscribe();
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'SUCCESS': return 'text-green-500 bg-green-100';
      case 'ERROR': return 'text-red-500 bg-red-100';
      case 'WARNING': return 'text-amber-500 bg-amber-100';
      default: return 'text-blue-500 bg-blue-100';
    }
  }

  getIconSvg(type: string): string {
    switch (type) {
      case 'SUCCESS': return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />';
      case 'ERROR': return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />';
      case 'WARNING': return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />';
      default: return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
    }
  }

  formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Si es hoy, mostrar 'Hace X horas/minutos'
    if (diff < 86400000 && date.getDate() === now.getDate()) {
      const hours = Math.floor(diff / 3600000);
      if (hours === 0) {
        const mins = Math.floor(diff / 60000);
        return `Hace ${mins} min`;
      }
      return `Hace ${hours}h`;
    }
    
    // Si no es hoy, mostrar fecha corta
    return date.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
}
