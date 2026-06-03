import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcademicSpace } from '../models/academic-space';

// ─── Tipos del backend de course-management ──────────────────────────────────
// Estructura REAL que devuelve GET /courses/course-assignment-course/v1/api

export interface CourseAssignmentCourseBackend {
  idCourseAssignmentCourse: number;
  course: {
    idCourse: number;
    name: string;
    code: string;
    description?: string;
    courseType?: { idCourseType: number; name: string };
    // El backend usa groupNumber, NO name
    group?: {
      idGroup: number;
      groupNumber: string;   // ← campo real del backend
      capacity?: number;
      cycle?: { idCycle: number; name?: string };
    };
    plan?: { idPlan: number; name?: string };
  };
  // courseAssignment puede ser null si el curso no tiene docente asignado
  courseAssignment?: {
    idCourseAssignment: number;
    teacher?: {
      idTeacher: number;
      name: string;
      lastName: string;
      email: string;
    };
  } | null;
}

// ─── Modelo unificado del componente ─────────────────────────────────────────

export interface CourseSpaceAssignment {
  courseAssignmentCourse: CourseAssignmentCourseBackend;
  academicSpace?: AcademicSpace;
  /** idSchedule del backend si ya fue persistido */
  idSchedule?: number;
  status: 'Libre' | 'Ocupado' | 'Bloqueado';
}

// ─── Payload para crear/actualizar un schedule ───────────────────────────────

export interface SchedulePayload {
  startTime: string;   // HH:mm:ss
  endTime: string;     // HH:mm:ss
  duration?: number;
  idAcademicSpace: number;
  idCourseAssignment: number;
  idWeekName?: number;
}

export interface ScheduleBackendResponse {
  idSchedule: number;
  startTime: string;
  endTime: string;
  duration?: number;
  idAcademicSpace: number;
  idCourseAssignment: number;
  idWeekName?: number;
}

// ─── Persistencia local (fallback cuando el backend no está disponible) ───────

interface AsignacionLocal {
  idCourseAssignmentCourse: number;
  academicSpace: AcademicSpace;
  idSchedule?: number;
  status: 'Libre' | 'Ocupado' | 'Bloqueado';
}

const STORAGE_KEY = 'asignaciones_ambientes_v2';

@Injectable({ providedIn: 'root' })
export class CourseSpaceAssignmentService {
  private readonly courseAssignmentCourseUrl =
    `${environment.apiUrl}/courses/course-assignment-course/v1/api`;
  private readonly schedulesUrl =
    `${environment.apiUrl}/schedules/api/v1/schedules`;

  constructor(private http: HttpClient) {}

  // ─── localStorage helpers ─────────────────────────────────────────────────

  private getLocal(): AsignacionLocal[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveLocal(items: AsignacionLocal[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  /** Carga los CourseAssignmentCourse del backend y los combina con el estado local. */
  getCourseSpaceAssignments(): Observable<CourseSpaceAssignment[]> {
    return this.http
      .get<CourseAssignmentCourseBackend[]>(this.courseAssignmentCourseUrl)
      .pipe(
        map((items) => {
          const local = this.getLocal();
          return items.map((item) => {
            const saved = local.find(
              (l) => l.idCourseAssignmentCourse === item.idCourseAssignmentCourse
            );
            return {
              courseAssignmentCourse: item,
              academicSpace: saved?.academicSpace,
              idSchedule: saved?.idSchedule,
              status: saved?.status ?? ('Libre' as const),
            };
          });
        })
      );
  }

  /**
   * Persiste la asignación en el backend (POST /schedules) y en localStorage.
   * Si el backend falla, guarda solo en localStorage para no bloquear la UX.
   */
  assignSpace(
    curso: CourseSpaceAssignment,
    ambiente: AcademicSpace,
    payload: SchedulePayload
  ): Observable<CourseSpaceAssignment> {
    return new Observable((observer) => {
      this.http.post<ScheduleBackendResponse>(this.schedulesUrl, payload).subscribe({
        next: (resp) => {
          this._persistLocal(
            curso.courseAssignmentCourse.idCourseAssignmentCourse,
            ambiente,
            resp.idSchedule,
            'Ocupado'
          );
          observer.next({
            ...curso,
            academicSpace: ambiente,
            idSchedule: resp.idSchedule,
            status: 'Ocupado',
          });
          observer.complete();
        },
        error: (err) => {
          // Fallback: guarda en localStorage aunque el backend falle
          this._persistLocal(
            curso.courseAssignmentCourse.idCourseAssignmentCourse,
            ambiente,
            undefined,
            'Ocupado'
          );
          observer.next({
            ...curso,
            academicSpace: ambiente,
            idSchedule: undefined,
            status: 'Ocupado',
          });
          observer.complete();
        },
      });
    });
  }

  /**
   * Reasigna un ambiente: actualiza el schedule existente (PUT) o crea uno nuevo.
   */
  updateAssignment(
    curso: CourseSpaceAssignment,
    ambiente: AcademicSpace,
    payload: SchedulePayload
  ): Observable<CourseSpaceAssignment> {
    const idSchedule = curso.idSchedule;
    const request$ = idSchedule
      ? this.http.put<ScheduleBackendResponse>(`${this.schedulesUrl}/${idSchedule}`, payload)
      : this.http.post<ScheduleBackendResponse>(this.schedulesUrl, payload);

    return new Observable((observer) => {
      request$.subscribe({
        next: (resp) => {
          this._persistLocal(
            curso.courseAssignmentCourse.idCourseAssignmentCourse,
            ambiente,
            resp.idSchedule,
            'Ocupado'
          );
          observer.next({
            ...curso,
            academicSpace: ambiente,
            idSchedule: resp.idSchedule,
            status: 'Ocupado',
          });
          observer.complete();
        },
        error: () => {
          this._persistLocal(
            curso.courseAssignmentCourse.idCourseAssignmentCourse,
            ambiente,
            idSchedule,
            'Ocupado'
          );
          observer.next({ ...curso, academicSpace: ambiente, status: 'Ocupado' });
          observer.complete();
        },
      });
    });
  }

  /** Actualiza solo el estado local (bloquear/desbloquear). */
  updateStatus(
    idCourseAssignmentCourse: number,
    status: 'Libre' | 'Ocupado' | 'Bloqueado'
  ): Observable<void> {
    const local = this.getLocal();
    const idx = local.findIndex(
      (l) => l.idCourseAssignmentCourse === idCourseAssignmentCourse
    );
    if (idx !== -1) {
      local[idx].status = status;
      // Si se libera el curso, limpiar el ambiente asignado para mantener consistencia
      if (status === 'Libre') {
        local[idx].academicSpace = null as any;
        local[idx].idSchedule = undefined;
      }
    } else {
      // Si no existe entrada, crear una mínima para guardar el estado
      local.push({ idCourseAssignmentCourse, academicSpace: null as any, status });
    }
    this.saveLocal(local);
    return of(undefined);
  }

  /** Elimina la asignación del localStorage. */
  removeAssignment(idCourseAssignmentCourse: number): void {
    const filtered = this.getLocal().filter(
      (l) => l.idCourseAssignmentCourse !== idCourseAssignmentCourse
    );
    this.saveLocal(filtered);
  }

  /** Limpia todo el estado local (útil para resetear datos corruptos). */
  clearAllLocal(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────

  private _persistLocal(
    idCourseAssignmentCourse: number,
    academicSpace: AcademicSpace,
    idSchedule: number | undefined,
    status: 'Libre' | 'Ocupado' | 'Bloqueado'
  ): void {
    const local = this.getLocal();
    const idx = local.findIndex(
      (l) => l.idCourseAssignmentCourse === idCourseAssignmentCourse
    );
    const entry: AsignacionLocal = { idCourseAssignmentCourse, academicSpace, idSchedule, status };
    if (idx !== -1) {
      local[idx] = entry;
    } else {
      local.push(entry);
    }
    this.saveLocal(local);
  }
}
