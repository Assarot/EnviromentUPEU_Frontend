import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CargaAcademicaService {
  // Utilizamos la ruta autogenerada del discovery client del gateway que sí hace correctamente el RewritePath
  private apiUrl = `${environment.apiUrl}/microservice-import/api/v1/import/upload-excel`;

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(this.apiUrl, formData, {
      reportProgress: true,
      observe: 'events',
    });
  }
}
