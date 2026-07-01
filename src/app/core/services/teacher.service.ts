import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Teacher } from '../models/teacher';

@Injectable({
  providedIn: 'root',
})
export class TeacherService {
  private apiUrl = `${environment.apiUrl}/courses/teacher/v1/api`;
  constructor(private http: HttpClient) {}

  getTeachers(): Observable<Teacher[]> {
    return this.http.get<Teacher[]>(this.apiUrl);
  }

  getTeacherById(id: number): Observable<Teacher> {
    return this.http.get<Teacher>(`${this.apiUrl}/${id}`);
  }

  createTeacher(body: {
    name: string;
    lastName: string;
    email: string;
    authUserId?: number;
  }): Observable<Teacher> {
    return this.http.post<Teacher>(this.apiUrl, body);
  }

  updateTeacher(
    id: number,
    body: { name: string; lastName: string; email: string; authUserId?: number }
  ): Observable<Teacher> {
    return this.http.put<Teacher>(`${this.apiUrl}/${id}`, body);
  }

  deleteTeacher(id?: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
