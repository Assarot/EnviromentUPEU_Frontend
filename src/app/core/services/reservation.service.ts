import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaz para crear una reserva (request)
export interface CreateReservationRequest {
  idAcademicSpace: number;
  startDatetime: string; // ISO 8601: "2026-01-15T08:00:00"
  endDatetime: string;   // ISO 8601: "2026-01-15T10:00:00"
  reason: string;         // Motivo principal
  description?: string;   // Descripción adicional (opcional)
  idCourse?: number;      // NULL si es actividad extracurricular
  memberIds?: number[];   // IDs de miembros adicionales
  idempotencyKey?: string;// Para evitar duplicados
}

// Interfaz para la respuesta de reserva
export interface Reservation {
  idReservation: number;
  startDatetime: string;
  endDatetime: string;
  reason: string;
  description?: string;
  requestedAt: string; // Fecha de solicitud
  idUserProfile: number;
  idAcademicSpace: number;
  idCourse?: number;
  idSchedule?: number;
  status: ReservationState; // FK a STATE
  idempotencyKey?: string;
  changeReason?: string;
}

// Interfaz para el estado de reserva
export interface ReservationState {
  idStatus: number;
  name: string; // "Pendiente", "Aprobada", "Rechazada", "Cancelada"
  isActive: boolean;
}

// Interfaz para miembros de reserva
export interface ReservationMember {
  idReservationMember: number;
  idReservation: number;
  idUserProfile: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  // 🔧 AJUSTA ESTA URL según tu backend
  private apiUrl = `${environment.apiUrl}/api/reservations`;

  constructor(private http: HttpClient) {}

  /**
   * Crear una nueva reserva
   */
  createReservation(data: CreateReservationRequest): Observable<Reservation> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<Reservation>(this.apiUrl, data, { headers });
  }

  /**
   * Obtener todas las reservas del usuario actual por perfil
   */
  getMyReservations(userProfileId: number): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/student/${userProfileId}`);
  }

  /**
   * Obtener todas las reservas (Para COOROOMS/Admins)
   */
  getAllReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(this.apiUrl);
  }

  /**
   * Aprobar una reserva
   */
  approveReservation(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/approve`, { changeReason: 'Aprobado' });
  }

  /**
   * Rechazar una reserva
   */
  rejectReservation(id: number, reason?: string): Observable<Reservation> {
    const body = reason ? { changeReason: reason } : { changeReason: 'Rechazado' };
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/reject`, body);
  }

  /**
   * Obtener una reserva por ID
   */
  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cancelar una reserva (cambiar estado a cancelada)
   */
  cancelReservation(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/cancel`, { changeReason: 'Cancelado por el usuario' });
  }

  /**
   * Deshacer decisión (Volver a PENDIENTE)
   */
  revertToPending(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.apiUrl}/${id}/revert-to-pending`, {});
  }

  /**
   * Actualizar una reserva
   */
  updateReservation(id: number, data: Partial<CreateReservationRequest>): Observable<Reservation> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<Reservation>(`${this.apiUrl}/${id}`, data, { headers });
  }

  /**
   * Verificar disponibilidad de un ambiente en un horario específico
   */
  checkAvailability(
    academicSpaceId: number,
    startDatetime: string,
    endDatetime: string
  ): Observable<{ available: boolean; conflicts?: Reservation[] }> {
    const params = {
      academic_space_id: academicSpaceId.toString(),
      start_datetime: startDatetime,
      end_datetime: endDatetime,
    };
    return this.http.get<{ available: boolean; conflicts?: Reservation[] }>(
      `${this.apiUrl}/check-availability`,
      { params }
    );
  }

  /**
   * Obtener IDs de ambientes ocupados para un horario específico
   */
  checkBulkAvailability(
    date: string,
    startTime: string,
    endTime: string
  ): Observable<number[]> {
    const params = {
      date,
      startTime,
      endTime
    };
    // Aquí llamamos al endpoint correcto en ReservationBlockController a través del API Gateway
    const scheduleApiUrl = `${environment.apiUrl}/schedules/api/v1/schedules`;
    return this.http.get<number[]>(`${scheduleApiUrl}/reservation-blocks/occupied-spaces`, { params });
  }

  /**
   * Obtener estados de reserva disponibles
   */
  getReservationStates(): Observable<ReservationState[]> {
    return this.http.get<ReservationState[]>(`${this.apiUrl}/states`);
  }

  /**
   * Agregar miembros a una reserva
   */
  addMembers(reservationId: number, userProfileIds: number[]): Observable<ReservationMember[]> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<ReservationMember[]>(
      `${this.apiUrl}/${reservationId}/members`,
      { user_profile_ids: userProfileIds },
      { headers }
    );
  }

  /**
   * Obtener miembros de una reserva
   */
  getMembers(reservationId: number): Observable<ReservationMember[]> {
    return this.http.get<ReservationMember[]>(`${this.apiUrl}/${reservationId}/members`);
  }
}
