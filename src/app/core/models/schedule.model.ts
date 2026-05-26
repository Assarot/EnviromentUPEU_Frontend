export interface ScheduleRequest {
  dayOfWeek?: string;
  startTime?: string; // HH:mm:ss
  endTime?: string;   // HH:mm:ss
  idCourseAssignment?: number;
  idAcademicSpace?: number;
  // Añade otros campos requeridos por tu DTO de backend aquí
}

export interface ScheduleResponse {
  idSchedule?: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  idCourseAssignment?: number;
  idAcademicSpace?: number;
  // Campos visuales mapeados desde backend (si tu backend los envía así)
  courseName?: string;
  spaceName?: string;
  colorHex?: string;
  borderColorHex?: string;
}
