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

export interface CourseToAssign {
  idCourseAssignment: number;
  capacityRequired?: number;
  preferredType?: string;
  candidateAcademicSpaceIds: number[];
  idTypeSchedule?: number;
  hoursRequired: number;
  idTeacher?: number;
  idGroup?: number;
  priority?: number;
}

export interface AutoAssignRequest {
  courses: CourseToAssign[];
  startTimes: string[];
  durationMinutes: number;
  weekDayIds: number[];
}

export interface AutoAssignResponse {
  assigned: ScheduleResponse[];
  failedCourseAssignmentIds: number[];
}
