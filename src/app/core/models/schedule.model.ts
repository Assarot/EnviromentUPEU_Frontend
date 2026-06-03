export interface ScheduleRequest {
  dayOfWeek?: string;
  startTime?: string; // HH:mm:ss
  endTime?: string;   // HH:mm:ss
  idCourseAssignment?: number;
  idAcademicSpace?: number;
  idWeekName?: number;
  duration?: number;
  idTypeSchedule?: number;
}

export interface ScheduleResponse {
  idSchedule?: number;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  idCourseAssignment?: number;
  idAcademicSpace?: number;
  idWeekName?: number;
  duration?: number;
  idTypeSchedule?: number;
  courseName?: string;
  spaceName?: string;
  teacherName?: string;
  colorHex?: string;
  borderColorHex?: string;
}
