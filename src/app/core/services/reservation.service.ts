import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Interfaz para crear una reserva (request) - ACTUALIZADA según diagrama
export interface CreateReservationRequest {
  id_academic_space: number;
  start_datetime: string; // ISO 8601: "2026-01-15T08:00:00"
  end_datetime: string;   // ISO 8601: "2026-01-15T10:00:00"
  reason: string;         // Motivo principal
  description?: string;   // Descripción adicional (opcional)
  id_user_profile?: number; // FK a user_profile (opcional si viene del token)
  members?: number[];     // IDs de miembros adicionales (RESERVATION_MEMBER)
}

// Interfaz para la respuesta de reserva - ACTUALIZADA según diagrama
export interface Reservation {
  id_reservation: number;
  start_datetime: string;
  end_datetime: string;
  reason: string;
  description?: string;
  resquested_at: string; // Fecha de solicitud
  id_user_profile: number;
  id_academic_space: number;
  id_state: number; // FK a STATE
  created_at?: string;
  updated_at?: string;
}

// Interfaz para el estado de reserva
export interface ReservationState {
  id_state: number;
  name: string; // "Pendiente", "Aprobada", "Rechazada", "Cancelada"
  is_active: string;
}

// Interfaz para miembros de reserva
export interface ReservationMember {
  id_reservation_member: number;
  id_reservation: number;
  id_user_profile: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  // 🔧 AJUSTA ESTA URL según tu backend
  private apiUrl = `${environment.apiUrl}/reservations`; // Ejemplo: http://146.181.39.73:8080/reservations

  constructor(private http: HttpClient) {}

  /**
   * Crear una nueva reserva
   */
  createReservation(data: CreateReservationRequest): Observable<Reservation> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<Reservation>(this.apiUrl, data, { headers });
  }

  /**
   * Obtener todas las reservas del usuario actual
   */
  getMyReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/my-reservations`);
  }

  /**
   * Obtener una reserva por ID
   */
  getReservationById(id: number): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cancelar una reserva (cambiar estado)
   */
  cancelReservation(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/cancel`, {});
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
