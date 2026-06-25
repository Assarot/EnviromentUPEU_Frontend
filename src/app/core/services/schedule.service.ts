import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ScheduleRequest, ScheduleResponse, AutoAssignRequest, AutoAssignResponse } from '../models/schedule.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/schedules/api/v1/schedules`;

  create(request: ScheduleRequest): Observable<ScheduleResponse> {
    return this.http.post<ScheduleResponse>(this.apiUrl, request);
  }

  autoAssign(request: AutoAssignRequest): Observable<AutoAssignResponse> {
    return this.http.post<AutoAssignResponse>(`${this.apiUrl}/auto-assign`, request);
  }

  findById(id: number): Observable<ScheduleResponse> {
    return this.http.get<ScheduleResponse>(`${this.apiUrl}/${id}`);
  }

  findAll(): Observable<ScheduleResponse[]> {
    return this.http.get<ScheduleResponse[]>(this.apiUrl);
  }

  update(id: number, request: ScheduleRequest): Observable<ScheduleResponse> {
    return this.http.put<ScheduleResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
