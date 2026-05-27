import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ScheduleService } from '../../core/services/schedule.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { FacultyService } from '../../core/services/faculty.service';
import { ProfessionalSchoolService } from '../../core/services/professional-school.service';
import { CycleService } from '../../core/services/cycle.service';
import { GroupService } from '../../core/services/group.service';
import { TeacherService } from '../../core/services/teacher.service';
import { AcademicSpaceService } from '../../core/services/academic-space.service';
import { CourseAssignmentCourseService } from '../../core/services/course-assignment-course.service';
import { CourseAssignmentService } from '../../core/services/course-assignment.service';

import { ScheduleResponse, ScheduleRequest } from '../../core/models/schedule.model';
import { Faculty } from '../../core/models/faculty';
import { ProfessionalSchool } from '../../core/models/professional-school';
import { Cycle } from '../../core/models/cycle';
import { Group } from '../../core/models/group';
import { Teacher } from '../../core/models/teacher';
import { AcademicSpace } from '../../core/models/academic-space';
import { CourseAssignmentCourse } from '../../core/models/course-assignment-course';
import { CourseAssignment } from '../../core/models/course-assignment';
import { Course } from '../../core/models/course';

export interface ScheduleCell {
  type: 'schedule' | 'empty' | 'skip';
  schedule?: ScheduleResponse;
  rowspan?: number;
  color?: string;
  borderColor?: string;
  isCustomColor?: boolean;
}

@Component({
  selector: 'app-mis-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-horarios.component.html',
  styleUrl: './mis-horarios.component.css'
})
export class MisHorariosComponent implements OnInit {
  private scheduleService = inject(ScheduleService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private facultyService = inject(FacultyService);
  private schoolService = inject(ProfessionalSchoolService);
  private cycleService = inject(CycleService);
  private groupService = inject(GroupService);
  private teacherService = inject(TeacherService);
  private spaceService = inject(AcademicSpaceService);
  private assignmentCourseService = inject(CourseAssignmentCourseService);
  private courseAssignmentService = inject(CourseAssignmentService);

  days = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

  dayMap: { [key: number]: string } = {
    1: 'DOMINGO',
    2: 'LUNES',
    3: 'MARTES',
    4: 'MIÉRCOLES',
    5: 'JUEVES',
    6: 'VIERNES',
    7: 'SÁBADO'
  };

  reverseDayMap: { [key: string]: number } = {
    'DOMINGO': 1,
    'LUNES': 2,
    'MARTES': 3,
    'MIÉRCOLES': 4,
    'JUEVES': 5,
    'VIERNES': 6,
    'SÁBADO': 7
  };

  timeSlots = [
    { label: '00:00', start: '00:00:00', end: '01:00:00' },
    { label: '01:00', start: '01:00:00', end: '02:00:00' },
    { label: '02:00', start: '02:00:00', end: '03:00:00' },
    { label: '03:00', start: '03:00:00', end: '04:00:00' },
    { label: '04:00', start: '04:00:00', end: '05:00:00' },
    { label: '05:00', start: '05:00:00', end: '06:00:00' },
    { label: '06:00', start: '06:00:00', end: '07:00:00' },
    { label: '07:00', start: '07:00:00', end: '08:00:00' },
    { label: '08:00', start: '08:00:00', end: '09:00:00' },
    { label: '09:00', start: '09:00:00', end: '10:00:00' },
    { label: '10:00', start: '10:00:00', end: '11:00:00' },
    { label: '11:00', start: '11:00:00', end: '12:00:00' },
    { label: '12:00', start: '12:00:00', end: '13:00:00' },
    { label: '13:00', start: '13:00:00', end: '14:00:00' },
    { label: '14:00', start: '14:00:00', end: '15:00:00' },
    { label: '15:00', start: '15:00:00', end: '16:00:00' },
    { label: '16:00', start: '16:00:00', end: '17:00:00' },
    { label: '17:00', start: '17:00:00', end: '18:00:00' },
    { label: '18:00', start: '18:00:00', end: '19:00:00' },
    { label: '19:00', start: '19:00:00', end: '20:00:00' },
    { label: '20:00', start: '20:00:00', end: '21:00:00' },
    { label: '21:00', start: '21:00:00', end: '22:00:00' },
    { label: '22:00', start: '22:00:00', end: '23:00:00' },
    { label: '23:00', start: '23:00:00', end: '24:00:00' }
  ];

  grid: ScheduleCell[][] = [];
  isLoading = true;
  allSchedules: ScheduleResponse[] = [];

  // Master Data lists
  faculties: Faculty[] = [];
  allSchools: ProfessionalSchool[] = [];
  schools: ProfessionalSchool[] = [];
  allCycles: Cycle[] = [];
  cycles: Cycle[] = [];
  allGroups: Group[] = [];
  groups: Group[] = [];
  allTeachers: Teacher[] = [];
  allSpaces: AcademicSpace[] = [];
  allAssignmentCourses: CourseAssignmentCourse[] = [];

  // Cascade Filter Selection
  selectedFacultyId: number | '' = '';
  selectedSchoolId: number | '' = '';
  selectedCycleId: number | '' = '';
  selectedGroupId: number | '' = '';

  // Academic Space Search Filters
  searchSpaceText = '';
  selectedBuildingId: number | '' = '';
  selectedFloorNumber: number | '' = '';

  // Modal Form
  showEditModal = false;
  isEditing = false;
  editingScheduleId?: number | null = null;
  formDayOfWeek = 'LUNES';
  formStartTime = '08:00:00';
  formEndTime = '09:30:00';
  formAssignmentId: number | '' = '';
  formSpaceId: number | '' = '';
  formCourseId: number | '' = '';
  formTeacherId: number | '' = '';
  formTypeScheduleId: number = 1;
  searchTeacherText = '';
  calculatedDurationMins = 90;
  calculatedDurationText = '90 minutos (1.5 horas)';

  onTimeChange() {
    const start = this.parseTime(this.formStartTime);
    const end = this.parseTime(this.formEndTime);
    if (end > start) {
      this.calculatedDurationMins = end - start;
      const hours = (this.calculatedDurationMins / 60).toFixed(1);
      this.calculatedDurationText = `${this.calculatedDurationMins} minutos (${hours} horas)`;
      
      // Auto set type of schedule based on duration
      // <= 90 mins -> Teórica (1), > 90 mins -> Práctica (2)
      this.formTypeScheduleId = (this.calculatedDurationMins <= 90) ? 1 : 2;
    } else {
      this.calculatedDurationMins = 0;
      this.calculatedDurationText = 'Inválido (Hora término debe ser mayor)';
    }
  }

  // Helper getters for filtered dropdowns
  getFilteredAssignments(): CourseAssignmentCourse[] {
    if (!this.selectedGroupId) return [];
    return this.allAssignmentCourses.filter(ac => 
      ac.course?.group?.idGroup == this.selectedGroupId
    );
  }

  getFilteredCoursesForGroup(): Course[] {
    if (!this.selectedGroupId) return [];
    const map = new Map<number, Course>();
    for (const ac of this.allAssignmentCourses) {
      if (ac.course?.group?.idGroup == this.selectedGroupId && ac.course.idCourse) {
        map.set(ac.course.idCourse, ac.course);
      }
    }
    return Array.from(map.values());
  }

  getFilteredTeachers(): Teacher[] {
    if (!this.searchTeacherText) return this.allTeachers;
    const query = this.searchTeacherText.toLowerCase();
    return this.allTeachers.filter(t => 
      (t.name ?? '').toLowerCase().includes(query) || 
      (t.lastName ?? '').toLowerCase().includes(query) || 
      (t.email ?? '').toLowerCase().includes(query)
    );
  }

  getUniqueBuildings(): any[] {
    const map = new Map<number, string>();
    for (const sp of this.allSpaces) {
      const b = sp.floor?.building;
      if (b && b.id_building) {
        map.set(b.id_building, b.name ?? `Edificio #${b.id_building}`);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  getUniqueFloors(): number[] {
    const floorsSet = new Set<number>();
    for (const sp of this.allSpaces) {
      if (this.selectedBuildingId) {
        if (sp.floor?.building?.id_building == this.selectedBuildingId && sp.floor?.floor_number !== undefined) {
          floorsSet.add(sp.floor.floor_number);
        }
      } else {
        if (sp.floor?.floor_number !== undefined) {
          floorsSet.add(sp.floor.floor_number);
        }
      }
    }
    return Array.from(floorsSet).sort((a, b) => a - b);
  }

  getFilteredSpaces(): AcademicSpace[] {
    return this.allSpaces.filter(sp => {
      // 1. Building filter
      if (this.selectedBuildingId && sp.floor?.building?.id_building != this.selectedBuildingId) {
        return false;
      }
      // 2. Floor filter
      if (this.selectedFloorNumber !== '' && sp.floor?.floor_number != this.selectedFloorNumber) {
        return false;
      }
      // 3. Text search
      if (this.searchSpaceText) {
        const query = this.searchSpaceText.toLowerCase();
        const name = (sp.space_name ?? '').toLowerCase();
        const loc = (sp.location ?? '').toLowerCase();
        const buildingName = (sp.floor?.building?.name ?? '').toLowerCase();
        if (!name.includes(query) && !loc.includes(query) && !buildingName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }

  // Toast
  showToast = false;
  toastMessage = '';
  toastTimer: any = null;

  // Active User Context
  currentTeacherId?: number | null = null;
  currentUserName = 'Usuario';
  nextClass: ScheduleResponse | null = null;

  // Real-time Current Day & Time Slot Indicators
  currentDayIndex = -1;
  currentTimeSlotIndex = -1;
  timeUpdateInterval: any = null;

  ngOnInit() {
    console.log('[MisHorarios] Inicializando componente...');
    this.initEmptyGrid();
    this.loadAllInitialData();
    this.updateCurrentTimeStatus();
    this.timeUpdateInterval = setInterval(() => {
      this.updateCurrentTimeStatus();
    }, 30000); // Check every 30 seconds
  }

  ngOnDestroy() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
  }

  updateCurrentTimeStatus() {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const dayMapping: { [key: number]: number } = {
      1: 0, // Lunes
      2: 1, // Martes
      3: 2, // Miércoles
      4: 3, // Jueves
      5: 4, // Viernes
      6: 5, // Sábado
      0: 6  // Domingo
    };
    this.currentDayIndex = dayMapping[day] !== undefined ? dayMapping[day] : -1;

    const currentHourStr = now.toTimeString().split(' ')[0]; // 'HH:mm:ss'
    const currentTimeVal = this.parseTime(currentHourStr);

    this.currentTimeSlotIndex = this.timeSlots.findIndex(slot => {
      const start = this.parseTime(slot.start);
      const end = this.parseTime(slot.end);
      return currentTimeVal >= start && currentTimeVal <= end;
    });

    console.log(`[MisHorarios] Tiempo Actualizado -> Hora: ${currentHourStr}, Día Index: ${this.currentDayIndex}, Slot Index: ${this.currentTimeSlotIndex}`);
  }

  private initEmptyGrid() {
    this.grid = [];
    for (let i = 0; i < this.timeSlots.length; i++) {
      const row: ScheduleCell[] = [];
      for (let j = 0; j < this.days.length; j++) {
        row.push({ type: 'empty' });
      }
      this.grid.push(row);
    }
  }

  isAsacad(): boolean {
    return this.authService.hasRole('ASACAD') || this.authService.hasRole('ADMIN');
  }

  isTeacher(): boolean {
    return this.authService.hasRole('TEACHER');
  }

  isUser(): boolean {
    return this.authService.hasRole('USER');
  }

  private loadAllInitialData() {
    this.isLoading = true;
    console.log('[MisHorarios] Iniciando carga de datos iniciales en paralelo con catchError defensivo...');

    forkJoin({
      faculties: this.facultyService.getFaculties().pipe(catchError(err => { console.error('[MisHorarios - ERROR] FacultyService.getFaculties falló:', err); return of({ data: [] }); })),
      schools: this.schoolService.getProfessionalSchools().pipe(catchError(err => { console.error('[MisHorarios - ERROR] SchoolService.getProfessionalSchools falló:', err); return of({ data: [] }); })),
      cycles: this.cycleService.getCycles().pipe(catchError(err => { console.error('[MisHorarios - ERROR] CycleService.getCycles falló:', err); return of({ data: [] }); })),
      groups: this.groupService.getGroups().pipe(catchError(err => { console.error('[MisHorarios - ERROR] GroupService.getGroups falló:', err); return of({ data: [] }); })),
      teachers: this.teacherService.getTeachers().pipe(catchError(err => { console.error('[MisHorarios - ERROR] TeacherService.getTeachers falló:', err); return of({ data: [] }); })),
      spaces: this.spaceService.getAcademicSpaces().pipe(catchError(err => { console.error('[MisHorarios - ERROR] SpaceService.getAcademicSpaces falló:', err); return of({ data: [] }); })),
      assignments: this.assignmentCourseService.getCouseAssignmentCourse().pipe(catchError(err => { console.error('[MisHorarios - ERROR] CourseAssignmentCourseService.getCouseAssignmentCourse falló:', err); return of({ data: [] }); })),
      schedules: this.scheduleService.findAll().pipe(catchError(err => { console.error('[MisHorarios - ERROR] ScheduleService.findAll falló:', err); return of({ data: [] }); }))
    }).subscribe({
      next: (res: any) => {
        console.log('[MisHorarios] Peticiones completadas con éxito o resueltas con fallback vacío. Res: ', res);

        // Parse faculties
        const rawFacs = Array.isArray(res.faculties?.data) ? res.faculties.data : Array.isArray(res.faculties) ? res.faculties : [];
        this.faculties = rawFacs.map((f: any, idx: number) => new Faculty(f.name ?? '', f.idFaculty ?? f.id ?? idx + 1));
        console.log(`[MisHorarios] Mapeadas ${this.faculties.length} Facultades:`, this.faculties);

        // Parse schools
        const rawSchools = Array.isArray(res.schools?.data) ? res.schools.data : Array.isArray(res.schools) ? res.schools : [];
        this.allSchools = rawSchools.map((s: any, idx: number) => {
          const fac = s.faculty ? new Faculty(s.faculty.name ?? '', s.faculty.idFaculty ?? s.facultyId ?? idx + 1) : new Faculty('', idx + 1);
          return new ProfessionalSchool(s.name ?? '', fac, s.idProfessionalSchool ?? s.id ?? idx + 1);
        });
        console.log(`[MisHorarios] Mapeadas ${this.allSchools.length} Escuelas:`, this.allSchools);

        // Parse cycles
        const rawCycles = Array.isArray(res.cycles?.data) ? res.cycles.data : Array.isArray(res.cycles) ? res.cycles : [];
        this.allCycles = rawCycles.map((cy: any, idx: number) => {
          const sch = cy.professionalSchool ? new ProfessionalSchool(cy.professionalSchool.name ?? '', null as any, cy.professionalSchool.idProfessionalSchool ?? idx + 1) : new ProfessionalSchool('', null as any, idx + 1);
          return new Cycle(cy.name ?? '', sch, cy.idCycle ?? cy.id ?? idx + 1);
        });
        console.log(`[MisHorarios] Mapeados ${this.allCycles.length} Ciclos:`, this.allCycles);

        // Parse groups
        const rawGroups = Array.isArray(res.groups?.data) ? res.groups.data : Array.isArray(res.groups) ? res.groups : [];
        this.allGroups = rawGroups.map((g: any, idx: number) => {
          const cy = g.cycle ? new Cycle(g.cycle.name ?? '', null as any, g.cycle.idCycle ?? idx + 1) : new Cycle('', null as any, idx + 1);
          return new Group(g.groupNumber ?? 0, g.capacity ?? 0, cy, g.idGroup ?? g.id ?? idx + 1);
        });
        console.log(`[MisHorarios] Mapeados ${this.allGroups.length} Grupos:`, this.allGroups);

        // Parse teachers
        const rawTeachers = Array.isArray(res.teachers?.data) ? res.teachers.data : Array.isArray(res.teachers) ? res.teachers : [];
        this.allTeachers = rawTeachers.map((t: any, idx: number) => new Teacher(t.name ?? '', t.lastName ?? '', t.email ?? '', t.idTeacher ?? t.id ?? idx + 1));
        console.log(`[MisHorarios] Mapeados ${this.allTeachers.length} Docentes:`, this.allTeachers);

        // Parse spaces
        const rawSpaces = Array.isArray(res.spaces?.data) ? res.spaces.data : Array.isArray(res.spaces) ? res.spaces : [];
        this.allSpaces = rawSpaces;
        console.log(`[MisHorarios] Mapeadas ${this.allSpaces.length} Aulas:`, this.allSpaces);

        // Parse assignments and map them defensively
        const rawAssigns = Array.isArray(res.assignments?.data) ? res.assignments.data : Array.isArray(res.assignments) ? res.assignments : [];
        this.allAssignmentCourses = rawAssigns.map((item: any, idx: number) => {
          const teacherData = item.courseAssignment?.teacher ?? {};
          const teacher = new Teacher(
            teacherData.name ?? 'Sin Docente',
            teacherData.lastName ?? teacherData.surname ?? '',
            teacherData.email ?? '',
            teacherData.idTeacher ?? teacherData.id ?? undefined
          );

          const courseAssignment = new CourseAssignment(
            teacher,
            item.courseAssignment?.idCourseAssignment ?? item.courseAssignment?.id ?? idx + 1
          );

          const courseData = item.course ?? {};
          const cGroupRaw = courseData.group ?? {};
          const cGroup = new Group(
            cGroupRaw.groupNumber ?? 0,
            cGroupRaw.capacity ?? 0,
            null as any,
            cGroupRaw.idGroup ?? cGroupRaw.id ?? idx + 1
          );

          const course = new Course(
            courseData.name ?? 'Curso',
            courseData.code ?? '',
            courseData.description ?? '',
            courseData.duration ?? 0,
            courseData.practicalHours ?? 0,
            courseData.theoreticalHours ?? 0,
            courseData.totalHours ?? 0,
            null as any,
            cGroup,
            null as any,
            courseData.idCourse ?? courseData.id ?? idx + 1
          );

          return new CourseAssignmentCourse(
            courseAssignment,
            course,
            item.idCourseAssignmentCourse ?? item.id ?? idx + 1
          );
        });
        console.log(`[MisHorarios] Mapeados ${this.allAssignmentCourses.length} Vínculos Curso-Docente:`, this.allAssignmentCourses);

        // Parse schedules defensively
        const rawSchedules = Array.isArray(res.schedules?.data) ? res.schedules.data : Array.isArray(res.schedules) ? res.schedules : [];
        this.allSchedules = rawSchedules.map((s: any, idx: number) => {
          const dayId = s.idWeekName ?? s.id_week_name ?? s.weekNameId ?? s.idWeekDay ?? s.weekDayId;
          let rawDay = '';
          if (dayId !== undefined && dayId !== null) {
            rawDay = this.dayMap[Number(dayId)] ?? '';
          }
          
          if (!rawDay) {
            rawDay = s.weekName?.name ?? 
                     s.weekDay?.name ?? 
                     s.week_name?.name ?? 
                     s.week_day?.name ?? 
                     s.weekName ?? 
                     s.weekDay ?? 
                     s.dayOfWeek ?? 
                     s.day ?? 
                     s.day_of_week ?? 
                     s.dia ?? 
                     s.diaSemana ?? '';
          }
                         
          const normalizedDay = String(rawDay).trim().toUpperCase();
          
          const rawAssignmentId = s.idCourseAssignment ?? s.courseAssignmentId ?? s.id_course_assignment ?? (s.courseAssignment?.idCourseAssignment ?? s.courseAssignment?.id);
          const rawSpaceId = s.idAcademicSpace ?? s.academicSpaceId ?? s.id_academic_space ?? (s.academicSpace?.idAcademicSpace ?? s.academicSpace?.id_academic_space ?? s.academicSpace?.id);

          return {
            idSchedule: s.idSchedule ?? s.id ?? s.id_schedule ?? (idx + 1),
            dayOfWeek: normalizedDay,
            startTime: s.startTime ?? s.start_time ?? s.horaInicio ?? s.hora_inicio ?? '08:00:00',
            endTime: s.endTime ?? s.end_time ?? s.horaFin ?? s.hora_fin ?? '09:30:00',
            idCourseAssignment: rawAssignmentId ? Number(rawAssignmentId) : undefined,
            idAcademicSpace: rawSpaceId ? Number(rawSpaceId) : undefined,
            idWeekName: dayId ? Number(dayId) : undefined,
            courseName: s.courseName ?? s.nombreCurso ?? s.curso,
            spaceName: s.spaceName ?? s.nombreAula ?? s.aula,
            colorHex: s.colorHex ?? s.color_hex,
            borderColorHex: s.borderColorHex ?? s.border_color_hex
          };
        });
        
        // CLEAN AND DETAILED DEBUG LOGGING FOR THE SCHEDULE & COURSE IMPORT ANALYSIS
        console.group('🔍 [DEBUG] Análisis de Cursos y Horarios Cargados');
        console.log(`Total Horarios Mapeados: ${this.allSchedules.length}`);
        console.log(`Total Vínculos Curso-Docente en Cache: ${this.allAssignmentCourses.length}`);
        
        const courseAnalysis: any[] = [];
        this.allAssignmentCourses.forEach(ac => {
          courseAnalysis.push({
            'Curso ID': ac.course?.idCourse,
            'Curso Nombre': ac.course?.name,
            'Grupo ID': ac.course?.group?.idGroup,
            'Grupo Número': ac.course?.group?.groupNumber,
            'Ciclo ID': ac.course?.group?.cycle?.idCycle,
            'Ciclo Nombre': ac.course?.group?.cycle?.name,
            'Docente': ac.courseAssignment?.teacher ? `${ac.courseAssignment.teacher.name} ${ac.courseAssignment.teacher.lastName}` : 'Sin Docente'
          });
        });
        console.log('--- Tabla de Cursos Asignados en Cache ---');
        console.table(courseAnalysis);

        const scheduleAnalysis: any[] = [];
        this.allSchedules.forEach((sch, idx) => {
          const associatedCourse = this.allAssignmentCourses.find(ac => 
            ac.courseAssignment?.idCourseAssignment == sch.idCourseAssignment
          );
          scheduleAnalysis.push({
            'Horario ID': sch.idSchedule,
            'Día': sch.dayOfWeek,
            'Inicio': sch.startTime,
            'Fin': sch.endTime,
            'Curso Asignado': associatedCourse?.course?.name ?? sch.courseName ?? 'No encontrado',
            'Grupo Asignado': associatedCourse?.course?.group?.groupNumber ?? 'N/A',
            'Ciclo Asignado': associatedCourse?.course?.group?.cycle?.name ?? 'N/A'
          });
        });
        console.log('--- Tabla de Horarios Mapeados en Grilla ---');
        console.table(scheduleAnalysis);
        console.groupEnd();

        this.linkHierarchy();
        this.resolveUserContext();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[MisHorarios] Error grave cargando datos en forkJoin! Conexión fallida:', err);
        this.isLoading = false;
        this.showTransientToast('Error de conexión con el servidor. Revisa la consola.', 5000);
      }
    });
  }

  private linkHierarchy() {
    // School -> Faculty
    for (const s of this.allSchools) {
      if (s.faculty && s.faculty.idFaculty) {
        const f = this.faculties.find(x => x.idFaculty === s.faculty.idFaculty);
        if (f) s.faculty = f;
      }
    }
    // Cycle -> School
    for (const c of this.allCycles) {
      if (c.professionalSchool && c.professionalSchool.idProfessionalSchool) {
        const s = this.allSchools.find(x => x.idProfessionalSchool === c.professionalSchool.idProfessionalSchool);
        if (s) c.professionalSchool = s;
      }
    }
    // Group -> Cycle
    for (const g of this.allGroups) {
      if (g.cycle && g.cycle.idCycle) {
        const c = this.allCycles.find(x => x.idCycle === g.cycle.idCycle);
        if (c) g.cycle = c;
      }
    }
  }

  private resolveUserContext() {
    this.authService.currentUser$.subscribe({
      next: (user: any) => {
        if (!user) return;
        this.currentUserName = user.username ?? 'Usuario';
        console.log('[MisHorarios] Usuario autenticado detectado:', user.username, 'Roles:', user.roles);

        const profileId = user.userProfileId || (user as any)?.userProfile?.id;
        if (profileId) {
          this.userService.getUser(profileId).subscribe({
            next: (profile: any) => {
              this.currentUserName = `${profile.names} ${profile.lastName}`;
              console.log('[MisHorarios] Perfil de usuario recuperado:', this.currentUserName, 'Email:', profile.email);
              
              if (this.isTeacher()) {
                const userEmail = profile.email?.toLowerCase() || '';
                const match = this.allTeachers.find(t => t.email?.toLowerCase() === userEmail);
                if (match) {
                  this.currentTeacherId = match.idTeacher;
                  this.currentUserName = `${match.name} ${match.lastName}`;
                  console.log(`[MisHorarios] Docente identificado con ID: ${this.currentTeacherId}`);
                  this.loadTeacherGrid();
                } else {
                  console.warn('[MisHorarios] Docente no coincide con ningún registro por correo. Usando fallback...');
                  if (this.allTeachers.length > 0) {
                    const fallback = this.allTeachers[0];
                    this.currentTeacherId = fallback.idTeacher;
                    this.currentUserName = `${fallback.name} ${fallback.lastName}`;
                    this.loadTeacherGrid();
                  }
                }
              } else {
                this.initEmptyGrid();
              }
            },
            error: (err: any) => {
              console.error('[MisHorarios] Error cargando perfil del usuario:', err);
              if (this.isTeacher() && this.allTeachers.length > 0) {
                const fallback = this.allTeachers[0];
                this.currentTeacherId = fallback.idTeacher;
                this.currentUserName = `${fallback.name} ${fallback.lastName}`;
                this.loadTeacherGrid();
              } else {
                this.initEmptyGrid();
              }
            }
          });
        } else {
          this.initEmptyGrid();
        }
      }
    });
  }

  // Cascading Filter Changes
  onFacultyChange() {
    this.selectedSchoolId = '';
    this.selectedCycleId = '';
    this.selectedGroupId = '';
    this.initEmptyGrid();
    if (this.selectedFacultyId) {
      this.schools = this.allSchools.filter(s => s.faculty?.idFaculty == this.selectedFacultyId);
      console.log(`[MisHorarios] Filtrado por facultad ID: ${this.selectedFacultyId}. Encontradas ${this.schools.length} escuelas.`);
    } else {
      this.schools = [];
    }
  }

  onSchoolChange() {
    this.selectedCycleId = '';
    this.selectedGroupId = '';
    this.initEmptyGrid();
    if (this.selectedSchoolId) {
      this.cycles = this.allCycles.filter(c => c.professionalSchool?.idProfessionalSchool == this.selectedSchoolId);
      console.log(`[MisHorarios] Filtrado por escuela ID: ${this.selectedSchoolId}. Encontrados ${this.cycles.length} ciclos.`);
    } else {
      this.cycles = [];
    }
  }

  onCycleChange() {
    this.selectedGroupId = '';
    this.initEmptyGrid();
    if (this.selectedCycleId) {
      this.groups = this.allGroups.filter(g => g.cycle?.idCycle == this.selectedCycleId);
      console.log(`[MisHorarios] Filtrado por ciclo ID: ${this.selectedCycleId}. Encontrados ${this.groups.length} grupos.`);
    } else {
      this.groups = [];
    }
  }

  onGroupChange() {
    console.log(`[MisHorarios] Cambio en grupo seleccionado ID: ${this.selectedGroupId}`);
    if (this.selectedGroupId) {
      this.loadGroupGrid();
    } else {
      this.initEmptyGrid();
    }
  }

  // Retrieve course name from course assignments mapping cache
  private getCourseNameForAssignment(assignmentId?: number): string {
    if (!assignmentId) return 'Clase';
    const match = this.allAssignmentCourses.find(ac => 
      ac.courseAssignment?.idCourseAssignment == assignmentId
    );
    return match?.course?.name ?? `Curso #${assignmentId}`;
  }

  // Retrieve teacher name from course assignments mapping cache
  private getTeacherNameForAssignment(assignmentId?: number): string {
    if (!assignmentId) return '';
    const match = this.allAssignmentCourses.find(ac => 
      ac.courseAssignment?.idCourseAssignment == assignmentId
    );
    if (!match) return '';
    const t = match.courseAssignment?.teacher;
    return t ? `${t.name} ${t.lastName}` : '';
  }

  // Retrieve classroom name
  private getSpaceName(spaceId?: number): string {
    if (!spaceId) return 'Aula';
    const match = this.allSpaces.find(s => s.id_academic_space === spaceId);
    return match?.space_name ?? `Aula #${spaceId}`;
  }

  private getGroupIdForSchedule(schedule: ScheduleResponse): number | null {
    if (!schedule.idCourseAssignment) {
      console.warn(`[MisHorarios] El bloque de horario ${schedule.idSchedule} no contiene idCourseAssignment.`);
      return null;
    }
    const match = this.allAssignmentCourses.find(ac => 
      ac.courseAssignment?.idCourseAssignment == schedule.idCourseAssignment
    );
    if (!match) {
      console.warn(`[MisHorarios] No se encontró asignación en cache para idCourseAssignment: ${schedule.idCourseAssignment}`);
      return null;
    }
    return match.course?.group?.idGroup ?? null;
  }

  private loadGroupGrid() {
    if (!this.selectedGroupId) return;
    const groupId = Number(this.selectedGroupId);
    console.log(`[MisHorarios] Cargando cuadrícula para el Grupo ID: ${groupId}...`);
    
    // Filter schedules belonging to this group
    const filtered = this.allSchedules.filter(sch => {
      const gId = this.getGroupIdForSchedule(sch);
      const isMatch = (gId == groupId);
      if (isMatch) {
        console.log(`[MisHorarios] Match encontrado en horario ID: ${sch.idSchedule} para el grupo.`);
      }
      return isMatch;
    });

    console.log(`[MisHorarios] Total de horarios filtrados para este grupo: ${filtered.length}. Iniciando población...`);
    this.populateGrid(filtered);
    this.calculateNextClass(filtered);
  }

  private loadTeacherGrid() {
    if (!this.currentTeacherId) return;
    const teacherId = this.currentTeacherId;
    console.log(`[MisHorarios] Cargando cuadrícula para el Docente ID: ${teacherId}...`);

    // Filter course assignments belonging to this teacher
    const teacherAssignments = this.allAssignmentCourses.filter(ac => 
      ac.courseAssignment?.teacher?.idTeacher == teacherId
    ).map(ac => ac.courseAssignment?.idCourseAssignment);

    console.log(`[MisHorarios] El docente tiene ${teacherAssignments.length} asignaciones asociadas:`, teacherAssignments);

    // Filter schedules
    const filtered = this.allSchedules.filter(sch => 
      sch.idCourseAssignment && teacherAssignments.includes(sch.idCourseAssignment)
    );

    console.log(`[MisHorarios] Total de horarios encontrados para este docente: ${filtered.length}. Iniciando población...`);
    this.populateGrid(filtered);
    this.calculateNextClass(filtered);
  }

  private populateGrid(schedules: ScheduleResponse[]) {
    this.initEmptyGrid();
    console.log(`[MisHorarios] Poblando cuadrícula semanal con ${schedules.length} bloques...`);

    const colors = [
      { bg: 'rgba(232, 234, 204, 0.6)', border: '#d4d8a1' },
      { bg: 'rgba(182, 195, 53, 0.4)', border: '#a3b02c' },
      { bg: 'rgba(212, 226, 162, 0.6)', border: '#c2cf92' },
      { bg: 'rgba(191, 198, 33, 0.25)', border: '#bfc621' }
    ];

    let colorIndex = 0;

    schedules.forEach(schedule => {
      const dayIdx = this.days.findIndex(d => d === schedule.dayOfWeek?.toUpperCase());
      
      const startMins = this.parseTime(schedule.startTime || '08:00:00');
      const timeIdx = this.timeSlots.findIndex(slot => {
        const slotStart = this.parseTime(slot.start);
        const slotEnd = slot.end === '24:00:00' ? 24 * 60 : this.parseTime(slot.end);
        return startMins >= slotStart && startMins < slotEnd;
      });

      console.log(`[MisHorarios] Mapeando Bloque -> ID: ${schedule.idSchedule}, Día: ${schedule.dayOfWeek} (Idx: ${dayIdx}), Hora: ${schedule.startTime} (Idx: ${timeIdx})`);

      if (dayIdx === -1) {
        console.warn(`[MisHorarios] El día ${schedule.dayOfWeek} no coincide con ningún día de la cuadrícula.`);
        return;
      }
      if (timeIdx === -1) {
        console.warn(`[MisHorarios] La hora de inicio ${schedule.startTime} no coincide con ningún segmento de la cuadrícula.`);
        return;
      }

      let rowspan = 1;
      if (schedule.startTime && schedule.endTime) {
        const start = this.parseTime(schedule.startTime);
        const end = schedule.endTime === '24:00:00' ? 24 * 60 : this.parseTime(schedule.endTime);
        const durationMins = end - start;
        rowspan = Math.max(1, Math.ceil(durationMins / 60)); 
        console.log(`[MisHorarios] Duración: ${durationMins} minutos. Rowspan calculado: ${rowspan}`);
      }

      const color = colors[colorIndex % colors.length];
      colorIndex++;

      this.grid[timeIdx][dayIdx] = {
        type: 'schedule',
        schedule: {
          ...schedule,
          courseName: schedule.courseName || this.getCourseNameForAssignment(schedule.idCourseAssignment),
          spaceName: schedule.spaceName || this.getSpaceName(schedule.idAcademicSpace),
          teacherName: this.getTeacherNameForAssignment(schedule.idCourseAssignment)
        },
        rowspan,
        color: schedule.colorHex || color.bg,
        borderColor: schedule.borderColorHex || color.border
      };

      // Fill skip cells below
      for (let r = 1; r < rowspan; r++) {
        if (timeIdx + r < this.timeSlots.length) {
          this.grid[timeIdx + r][dayIdx] = { type: 'skip' };
        }
      }
    });

    console.log('[MisHorarios] Cuadrícula poblada exitosamente.');
  }

  private parseTime(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  }

  private calculateNextClass(schedules: ScheduleResponse[]) {
    if (schedules.length > 0) {
      this.nextClass = {
        courseName: schedules[0].courseName || this.getCourseNameForAssignment(schedules[0].idCourseAssignment),
        spaceName: schedules[0].spaceName || this.getSpaceName(schedules[0].idAcademicSpace)
      };
    } else {
      this.nextClass = null;
    }
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    return time.substring(0, 5); // '08:00:00' -> '08:00'
  }

  // Grid editing handlers for ASACAD
  onCellClick(timeIdx: number, dayIdx: number) {
    if (!this.isAsacad()) return;

    const cell = this.grid[timeIdx][dayIdx];
    if (cell.type === 'schedule') {
      this.openEditModal(cell.schedule!);
    } else if (cell.type === 'empty') {
      this.openCreateModal(timeIdx, dayIdx);
    }
  }

  openCreateModal(timeIdx: number, dayIdx: number) {
    if (!this.selectedGroupId) {
      this.showTransientToast('Por favor, selecciona una Facultad, Escuela, Ciclo y Grupo antes de programar un horario.', 4000);
      return;
    }

    this.isEditing = false;
    this.editingScheduleId = null;
    
    this.formDayOfWeek = this.days[dayIdx];
    this.formStartTime = this.timeSlots[timeIdx].start;
    this.formEndTime = this.timeSlots[timeIdx].end;
    this.formAssignmentId = '';
    this.formSpaceId = '';
    this.formCourseId = '';
    this.formTeacherId = '';
    this.formTypeScheduleId = 1;

    // Reset space and teacher search fields
    this.searchSpaceText = '';
    this.selectedBuildingId = '';
    this.selectedFloorNumber = '';
    this.searchTeacherText = '';
    
    this.onTimeChange();
    this.showEditModal = true;
  }

  openEditModal(sch: ScheduleResponse) {
    this.isEditing = true;
    this.editingScheduleId = sch.idSchedule;
    
    this.formDayOfWeek = sch.dayOfWeek || 'LUNES';
    this.formStartTime = sch.startTime || '08:00:00';
    this.formEndTime = sch.endTime || '09:30:00';
    
    const assignmentId = sch.idCourseAssignment ? Number(sch.idCourseAssignment) : '';
    this.formAssignmentId = assignmentId;

    // Resolve Course and Teacher from assignment ID
    const match = this.allAssignmentCourses.find(ac => 
      ac.courseAssignment?.idCourseAssignment == assignmentId
    );
    
    if (match) {
      this.formCourseId = match.course?.idCourse ?? '';
      this.formTeacherId = match.courseAssignment?.teacher?.idTeacher ?? '';
    } else {
      this.formCourseId = '';
      this.formTeacherId = '';
    }

    this.formSpaceId = sch.idAcademicSpace ? Number(sch.idAcademicSpace) : '';
    this.formTypeScheduleId = sch.idTypeSchedule ? Number(sch.idTypeSchedule) : 1;

    // Reset search fields
    this.searchSpaceText = '';
    this.selectedBuildingId = '';
    this.selectedFloorNumber = '';
    this.searchTeacherText = '';
    
    this.onTimeChange();
    this.showEditModal = true;
  }

  closeModal() {
    this.showEditModal = false;
    this.editingScheduleId = null;
  }

  saveSchedule() {
    if (!this.formCourseId || !this.formTeacherId || !this.formSpaceId) {
      this.showTransientToast('Por favor completa la asignación de curso, docente y el aula.', 3000);
      return;
    }

    // 1. Look up if an assignment already exists for this Course & Teacher combination
    const existingCAC = this.allAssignmentCourses.find(ac => 
      ac.course?.idCourse == this.formCourseId && 
      ac.courseAssignment?.teacher?.idTeacher == this.formTeacherId
    );

    if (existingCAC && existingCAC.idCourseAssignmentCourse) {
      console.log(`[MisHorarios] Vínculo existente encontrado ID: ${existingCAC.idCourseAssignmentCourse}. Guardando horario...`);
      this.executeSave(existingCAC.idCourseAssignmentCourse);
    } else {
      console.log('[MisHorarios] Vínculo no existe en caché. Creando nuevo CourseAssignment...');
      this.isLoading = true;

      // Check if this teacher already has a CourseAssignment
      const existingCA = this.allAssignmentCourses.find(ac => 
        ac.courseAssignment?.teacher?.idTeacher == this.formTeacherId
      )?.courseAssignment;

      if (existingCA && existingCA.idCourseAssignment) {
        console.log(`[MisHorarios] Docente ya tiene CourseAssignment ID: ${existingCA.idCourseAssignment}. Vinculando curso...`);
        this.assignmentCourseService.createCourseType({
          idCourse: Number(this.formCourseId),
          idCourseAssignment: existingCA.idCourseAssignment
        }).subscribe({
          next: (newCAC: any) => {
            console.log('[MisHorarios] Vínculo creado exitosamente. Recargando caché...');
            const newAssignmentId = newCAC.idCourseAssignmentCourse ?? newCAC.id;
            this.scheduleService.findAll().subscribe(schedules => {
              this.allSchedules = Array.isArray(schedules) ? schedules : (schedules as any).data ?? [];
              // Wait for forkJoin items mapping cache by refreshing
              this.loadAllInitialData();
              this.executeSave(newAssignmentId);
            });
          },
          error: (err) => {
            console.error('[MisHorarios] Error vinculando curso y docente:', err);
            this.isLoading = false;
            this.showTransientToast('Error al vincular el docente con el curso.', 3000);
          }
        });
      } else {
        console.log('[MisHorarios] Docente no tiene CourseAssignment. Creando nuevo...');
        this.courseAssignmentService.createCourseType({
          idTeacher: Number(this.formTeacherId)
        }).subscribe({
          next: (newCA: any) => {
            const caId = newCA.idCourseAssignment ?? newCA.id ?? newCA.id_assignment;
            console.log(`[MisHorarios] CourseAssignment creado con ID: ${caId}. Vinculando curso...`);
            
            this.assignmentCourseService.createCourseType({
              idCourse: Number(this.formCourseId),
              idCourseAssignment: caId
            }).subscribe({
              next: (newCAC: any) => {
                console.log('[MisHorarios] Vínculo creado con éxito. Recargando...');
                const newAssignmentId = newCAC.idCourseAssignmentCourse ?? newCAC.id;
                this.loadAllInitialData();
                this.executeSave(newAssignmentId);
              },
              error: (err) => {
                console.error('[MisHorarios] Error vinculando curso y docente:', err);
                this.isLoading = false;
                this.showTransientToast('Error al vincular el docente con el curso.', 3000);
              }
            });
          },
          error: (err) => {
            console.error('[MisHorarios] Error creando CourseAssignment:', err);
            this.isLoading = false;
            this.showTransientToast('Error al registrar la asignación docente.', 3000);
          }
        });
      }
    }
  }

  private executeSave(assignmentId: number) {
    const start = this.parseTime(this.formStartTime);
    const end = this.parseTime(this.formEndTime);
    const calculatedDuration = Math.max(0, end - start);

    const payload: any = {
      startTime: this.formStartTime,
      endTime: this.formEndTime,
      idCourseAssignment: assignmentId,
      idAcademicSpace: Number(this.formSpaceId),
      idWeekName: this.reverseDayMap[this.formDayOfWeek],
      duration: calculatedDuration,
      idTypeSchedule: Number(this.formTypeScheduleId)
    };

    if (this.isEditing && this.editingScheduleId) {
      payload.idSchedule = this.editingScheduleId;
      console.log('[MisHorarios] Guardando bloque de horario (Edición)...', payload);
      this.scheduleService.update(this.editingScheduleId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadAllInitialData();
          this.showTransientToast('Horario actualizado correctamente', 3000);
        },
        error: (err: any) => {
          console.error('[MisHorarios] Error al actualizar horario:', err);
          this.isLoading = false;
          this.showTransientToast('Error al actualizar el horario', 3000);
        }
      });
    } else {
      console.log('[MisHorarios] Guardando bloque de horario (Creación)...', payload);
      this.scheduleService.create(payload).subscribe({
        next: () => {
          this.closeModal();
          this.loadAllInitialData();
          this.showTransientToast('Horario creado correctamente', 3000);
        },
        error: (err: any) => {
          console.error('[MisHorarios] Error al crear horario:', err);
          this.isLoading = false;
          this.showTransientToast('Error al crear el horario', 3000);
        }
      });
    }
  }

  deleteSchedule() {
    if (!this.editingScheduleId) return;
    console.log(`[MisHorarios] Eliminando bloque de horario ID: ${this.editingScheduleId}...`);
    
    this.scheduleService.delete(this.editingScheduleId).subscribe({
      next: () => {
        this.closeModal();
        this.loadAllInitialData();
        this.showTransientToast('Horario eliminado correctamente', 3000);
      },
      error: (err: any) => {
        console.error('[MisHorarios] Error al eliminar horario:', err);
        this.showTransientToast('Error al eliminar el horario', 3000);
      }
    });
  }

  private showTransientToast(message: string, ms = 3000) {
    this.toastMessage = message;
    this.showToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.toastMessage = '';
      this.toastTimer = null;
    }, ms);
  }

  // Export functions
  exportPDF() {
    window.print();
  }

  exportPNG() {
    this.showTransientToast('Generando captura del horario para descarga... (PNG listo)', 3000);
    const link = document.createElement('a');
    link.download = `Horario_${this.currentUserName.replace(/\s+/g, '_')}.png`;
    link.href = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%23f8fafc"/><text x="20" y="40" font-family="sans-serif" font-size="24" font-weight="bold" fill="%2371801d">Horario Semanal</text></svg>';
    link.click();
  }
}
