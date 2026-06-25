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

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  topPercent?: number;
  heightPercent?: number;
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

  days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

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
    { label: '07:30 - 08:20', start: '07:30:00', end: '08:20:00' },
    { label: '08:25 - 09:15', start: '08:25:00', end: '09:15:00' },
    { label: '09:20 - 10:10', start: '09:20:00', end: '10:10:00' },
    { label: '10:20 - 11:10', start: '10:20:00', end: '11:10:00' },
    { label: '11:15 - 12:05', start: '11:15:00', end: '12:05:00' },
    { label: '12:10 - 13:00', start: '12:10:00', end: '13:00:00' },
    { label: '13:10 - 14:00', start: '13:10:00', end: '14:00:00' },
    { label: '14:05 - 14:55', start: '14:05:00', end: '14:55:00' },
    { label: '15:00 - 15:50', start: '15:00:00', end: '15:50:00' },
    { label: '16:00 - 16:50', start: '16:00:00', end: '16:50:00' },
    { label: '16:55 - 17:45', start: '16:55:00', end: '17:45:00' },
    { label: '17:50 - 18:40', start: '17:50:00', end: '18:40:00' },
    { label: '18:45 - 19:35', start: '18:45:00', end: '19:35:00' },
    { label: '19:40 - 20:30', start: '19:40:00', end: '20:30:00' },
    { label: '20:35 - 21:25', start: '20:35:00', end: '21:25:00' },
    { label: '21:30 - 22:20', start: '21:30:00', end: '22:20:00' }
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

  // Auto Assign Modal
  showAutoAssignModal = false;
  autoAssignDays = [
    { id: 2, label: 'LUNES', selected: true },
    { id: 3, label: 'MARTES', selected: true },
    { id: 4, label: 'MIÉRCOLES', selected: true },
    { id: 5, label: 'JUEVES', selected: true },
    { id: 6, label: 'VIERNES', selected: true },
    { id: 7, label: 'SÁBADO', selected: false }
  ];
  autoAssignShift: 'MANANA' | 'TARDE' | 'AMBOS' = 'TARDE';
  pendingCoursesForAutoAssign: any[] = [];

  // Dynamic Activity Blocks Config for Auto Assign
  autoAssignCulturaDay: number | '' = '';
  autoAssignCulturaStart: string = '';
  autoAssignCulturaEnd: string = '';

  autoAssignActivateDay: number | '' = '';
  autoAssignActivateStart: string = '';
  autoAssignActivateEnd: string = '';

  // Bulk Auto Assign Filters
  autoAssignFacultyId: number | '' = '';
  autoAssignSchoolId: number | '' = '';
  autoAssignBuildingId: number | '' = '';

  get autoAssignSchools() {
    if (!this.autoAssignFacultyId) return [];
    return this.allSchools.filter(s => s.faculty?.idFaculty == this.autoAssignFacultyId);
  }

  onAutoAssignFacultyChange() {
    this.autoAssignSchoolId = '';
    this.updatePendingCoursesForAutoAssign();
  }

  onAutoAssignSchoolChange() {
    this.updatePendingCoursesForAutoAssign();
  }

  updatePendingCoursesForAutoAssign() {
    let targetGroups: number[] = [];
    
    // Find all groups that belong to the selected School or Faculty
    this.allGroups.forEach(g => {
      if (this.autoAssignSchoolId) {
        if (g.cycle?.professionalSchool?.idProfessionalSchool == this.autoAssignSchoolId) {
          if (g.idGroup) targetGroups.push(g.idGroup);
        }
      } else if (this.autoAssignFacultyId) {
        if (g.cycle?.professionalSchool?.faculty?.idFaculty == this.autoAssignFacultyId) {
          if (g.idGroup) targetGroups.push(g.idGroup);
        }
      } else if (this.selectedGroupId) {
        // Fallback to currently selected group if no bulk filter applied
        targetGroups.push(Number(this.selectedGroupId));
      }
    });

    const targetCourses = this.allAssignmentCourses.filter(ac => {
      const gId = ac.course?.group?.idGroup;
      return gId && targetGroups.includes(gId);
    });

    this.pendingCoursesForAutoAssign = targetCourses.map(ac => {
      let hoursRequired = 4;
      const rawTotalHours: any = ac.course?.totalHours;
      if (typeof rawTotalHours === 'number') {
        hoursRequired = rawTotalHours;
      } else if (typeof rawTotalHours === 'string') {
        if (rawTotalHours.startsWith('PT')) {
          const match = rawTotalHours.match(/(\d+)H/);
          if (match) hoursRequired = parseInt(match[1], 10);
        } else {
          const parsed = parseInt(rawTotalHours, 10);
          if (!isNaN(parsed)) hoursRequired = parsed;
        }
      }
      return {
        course: ac.course,
        assignment: ac,
        hoursRequired: hoursRequired,
        priority: 1
      };
    }).filter(pc => pc.assignment?.courseAssignment?.idCourseAssignment);
  }

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

  openAutoAssignModal() {
    // Reset bulk filters to current view if possible
    this.autoAssignFacultyId = this.selectedFacultyId || '';
    this.autoAssignSchoolId = this.selectedSchoolId || '';
    this.autoAssignBuildingId = '';
    
    this.updatePendingCoursesForAutoAssign();

    if (this.pendingCoursesForAutoAssign.length === 0) {
      this.showTransientToast('No hay cursos con asignaciones docentes para los filtros seleccionados.', 4000);
      return;
    }

    this.showAutoAssignModal = true;
  }

  closeAutoAssignModal() {
    this.showAutoAssignModal = false;
  }

  submitAutoAssign() {
    const selectedDays = this.autoAssignDays.filter(d => d.selected).map(d => d.id);
    if (selectedDays.length === 0) {
      this.showTransientToast('Debes seleccionar al menos un día.', 4000);
      return;
    }

    let filteredSpaces = this.allSpaces;
    if (this.autoAssignBuildingId) {
      filteredSpaces = filteredSpaces.filter(s => {
        const bId = s.floor?.building?.id_building;
        return bId == this.autoAssignBuildingId;
      });
    }
    const candidateSpaceIds = filteredSpaces.map(s => s.id_academic_space).filter(id => id !== undefined) as number[];
    const validCourses = this.pendingCoursesForAutoAssign.filter(pc => pc.assignment?.courseAssignment?.idCourseAssignment);

    if (validCourses.length === 0) {
      this.showTransientToast('No hay cursos válidos para asignar.', 4000);
      return;
    }

    const manana = ['07:30:00', '08:25:00', '09:20:00', '10:20:00', '11:15:00', '12:10:00'];
    const tarde = ['13:10:00', '14:05:00', '15:00:00', '16:00:00', '16:55:00', '17:50:00', '18:45:00', '19:40:00', '20:35:00', '21:30:00'];
    let startTimes: string[] = [];
    if (this.autoAssignShift === 'MANANA') startTimes = manana;
    else if (this.autoAssignShift === 'TARDE') startTimes = tarde;
    else startTimes = [...manana, ...tarde];

    const coursesPayload = validCourses.map(pc => ({
      idCourseAssignment: pc.assignment.courseAssignment.idCourseAssignment,
      capacityRequired: pc.course.group?.capacity || 30,
      preferredType: 'Teoría',
      candidateAcademicSpaceIds: candidateSpaceIds,
      idTypeSchedule: 1,
      hoursRequired: pc.hoursRequired || 4,
      idTeacher: pc.assignment.courseAssignment.teacher?.idTeacher,
      idGroup: pc.course.group?.idGroup,
      priority: pc.priority
    }));

    this.isLoading = true;
    this.closeAutoAssignModal();

    const payload: any = {
      courses: coursesPayload,
      startTimes: startTimes,
      durationMinutes: 50,
      weekDayIds: selectedDays
    };

    if (this.autoAssignCulturaDay && this.autoAssignCulturaStart && this.autoAssignCulturaEnd) {
      payload.culturaDayId = this.autoAssignCulturaDay;
      payload.culturaStartTime = this.autoAssignCulturaStart;
      payload.culturaEndTime = this.autoAssignCulturaEnd;
    }

    if (this.autoAssignActivateDay && this.autoAssignActivateStart && this.autoAssignActivateEnd) {
      payload.activateDayId = this.autoAssignActivateDay;
      payload.activateStartTime = this.autoAssignActivateStart;
      payload.activateEndTime = this.autoAssignActivateEnd;
    }

    if (this.autoAssignBuildingId) {
      payload.idBuilding = Number(this.autoAssignBuildingId);
    }

    console.log('[MisHorarios] Payload de Generación Automática:', payload);

    this.scheduleService.autoAssign(payload).subscribe({
      next: (res: any) => {
        console.log('[MisHorarios] Asignación completada:', res);
      },
      error: (err: any) => {
        console.error('[MisHorarios] Error en asignación automática:', err);
        this.isLoading = false;
        this.showTransientToast('Error al generar los horarios. Revisa la consola.', 4000);
      },
      complete: () => {
        this.isLoading = false;
        this.showTransientToast('Proceso de asignación completado.', 4000);
        this.loadAllInitialData();
      }
    });
  }

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
      baseAssignments: this.courseAssignmentService.getCouseAssignment().pipe(catchError(err => { console.error('[MisHorarios - ERROR] CourseAssignmentService falló:', err); return of({ data: [] }); })),
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

        // Build a lookup map for base assignments (to get teacher if missing)
        const rawBaseAssigns = Array.isArray(res.baseAssignments?.data) ? res.baseAssignments.data : Array.isArray(res.baseAssignments) ? res.baseAssignments : [];
        const baseAssignmentMap = new Map<number, any>();
        rawBaseAssigns.forEach((ba: any) => {
          const baId = ba.idCourseAssignment ?? ba.id;
          if (baId) baseAssignmentMap.set(baId, ba);
        });

        // Parse assignments and map them defensively
        const rawAssigns = Array.isArray(res.assignments?.data) ? res.assignments.data : Array.isArray(res.assignments) ? res.assignments : [];
        this.allAssignmentCourses = rawAssigns.map((item: any, idx: number) => {
          const ca = item.courseAssignment || item.course_assignment || {};
          let teacherData = ca.teacher || item.teacher || {};
          const caId = ca.idCourseAssignment ?? ca.id ?? idx + 1;
          
          // Fallback logic: if teacher name is missing, look it up in baseAssignments
          if (!teacherData.name && !teacherData.names) {
            const matchedBa = baseAssignmentMap.get(caId);
            if (matchedBa && matchedBa.teacher) {
              teacherData = matchedBa.teacher;
            } else if (ca.idTeacher || item.idTeacher) { // Fallback 2: look up in allTeachers by idTeacher
              const tId = ca.idTeacher || item.idTeacher;
              const matchedTeacher = this.allTeachers.find(t => t.idTeacher == tId);
              if (matchedTeacher) {
                teacherData = matchedTeacher;
              }
            }
          }

          const teacher = new Teacher(
            teacherData.name || teacherData.names || 'Sin Docente',
            teacherData.lastName || teacherData.surname || '',
            teacherData.email || '',
            teacherData.idTeacher || teacherData.id || undefined
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
            idTypeSchedule: s.idTypeSchedule ?? s.id_type_schedule ?? s.typeScheduleId,
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
                if (this.selectedGroupId) {
                  this.loadGroupGrid();
                } else {
                  this.initEmptyGrid();
                }
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
                if (this.selectedGroupId) {
                  this.loadGroupGrid();
                } else {
                  this.initEmptyGrid();
                }
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
    
    // Filter schedules belonging to this group OR global activities (Type 101 = Cultura, Type 102 = Activate)
    const filtered = this.allSchedules.filter(sch => {
      // Global activities check
      if (sch.idTypeSchedule === 101 || sch.idTypeSchedule === 102) {
        return true;
      }

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
        const endMins = schedule.endTime === '24:00:00' ? 24 * 60 : this.parseTime(schedule.endTime);
        
        // Find end time slot index
        let endTimeIdx = this.timeSlots.findIndex(slot => {
          const slotStart = this.parseTime(slot.start);
          const slotEnd = slot.end === '24:00:00' ? 24 * 60 : this.parseTime(slot.end);
          return endMins > slotStart && endMins <= slotEnd;
        });
        
        if (endTimeIdx === -1) {
          endTimeIdx = this.timeSlots.length - 1;
        }

        rowspan = Math.max(1, (endTimeIdx - timeIdx) + 1);
        console.log(`[MisHorarios] Rowspan calculado por bloques académicos: ${rowspan}`);
      }

      const color = colors[colorIndex % colors.length];
      colorIndex++;

      this.grid[timeIdx][dayIdx] = {
        type: 'schedule',
        schedule: {
          ...schedule,
          courseName: schedule.idTypeSchedule === 101 ? 'CULTURA (Institucional)' :
                      schedule.idTypeSchedule === 102 ? 'ACTÍVATE (Institucional)' :
                      (schedule.courseName || this.getCourseNameForAssignment(schedule.idCourseAssignment)),
          spaceName: schedule.spaceName || this.getSpaceName(schedule.idAcademicSpace),
          teacherName: schedule.idTypeSchedule === 101 || schedule.idTypeSchedule === 102 ? 'Institucional' : this.getTeacherNameForAssignment(schedule.idCourseAssignment)
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
    const isInstitutional = (this.formTypeScheduleId == 101 || this.formTypeScheduleId == 102);

    if (!isInstitutional && (!this.formCourseId || !this.formTeacherId || !this.formSpaceId)) {
      this.showTransientToast('Por favor completa la asignación de curso, docente y el aula.', 3000);
      return;
    }

    if (isInstitutional) {
      this.executeSave(null as any);
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

  private executeSave(assignmentId: number | null) {
    const start = this.parseTime(this.formStartTime);
    const end = this.parseTime(this.formEndTime);
    const calculatedDuration = Math.max(0, end - start);

    const payload: any = {
      startTime: this.formStartTime.length === 5 ? `${this.formStartTime}:00` : this.formStartTime,
      endTime: this.formEndTime.length === 5 ? `${this.formEndTime}:00` : this.formEndTime,
      idCourseAssignment: assignmentId,
      idWeekName: this.reverseDayMap[this.formDayOfWeek],
      duration: calculatedDuration,
      idTypeSchedule: Number(this.formTypeScheduleId)
    };

    if (this.formSpaceId) {
      payload.idAcademicSpace = Number(this.formSpaceId);
    }

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
    this.showTransientToast('Generando PDF del horario...', 3000);
    const element = document.querySelector('.schedule-grid-container') as HTMLElement;
    if (!element) return;

    // Save current style
    const originalStyle = element.style.cssText;
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      // Restore style
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Horario_${this.currentUserName.replace(/\s+/g, '_')}.pdf`);
    }).catch(err => {
      console.error('Error exporting PDF', err);
      element.style.cssText = originalStyle;
    });
  }

  exportPNG() {
    this.showTransientToast('Generando captura del horario...', 3000);
    const element = document.querySelector('.schedule-grid-container') as HTMLElement;
    if (!element) return;

    // Save current style
    const originalStyle = element.style.cssText;
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      // Restore style
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Horario_${this.currentUserName.replace(/\s+/g, '_')}.png`;
      link.href = imgData;
      link.click();
    }).catch(err => {
      console.error('Error exporting PNG', err);
      element.style.cssText = originalStyle;
    });
  }
}
