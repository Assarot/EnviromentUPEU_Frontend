import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Course } from '../../../core/models/course';
import { CourseType } from '../../../core/models/course-type';
import { Group } from '../../../core/models/group';
import { Plan } from '../../../core/models/plan';
import { Faculty } from '../../../core/models/faculty';
import { ProfessionalSchool } from '../../../core/models/professional-school';
import { Cycle } from '../../../core/models/cycle';

import { CourseService } from '../../../core/services/course.service';
import { CourseTypeService } from '../../../core/services/course-type.service';
import { GroupService } from '../../../core/services/group.service';
import { PlanService } from '../../../core/services/plan.service';
import { FacultyService } from '../../../core/services/faculty.service';
import { ProfessionalSchoolService } from '../../../core/services/professional-school.service';
import { CycleService } from '../../../core/services/cycle.service';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-course',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course.component.html',
  styleUrls: ['./course.component.css'],
})
export class CourseComponent implements OnInit {
  @Input() hideBack = false;

  private service = inject(CourseService);
  private typeService = inject(CourseTypeService);
  private groupService = inject(GroupService);
  private planService = inject(PlanService);
  private facultyService = inject(FacultyService);
  private schoolService = inject(ProfessionalSchoolService);
  private cycleService = inject(CycleService);
  private router = inject(Router);
  sidebarService = inject(SidebarService);

  items: Course[] = [];
  types: CourseType[] = [];
  groups: Group[] = [];
  plans: Plan[] = [];
  faculties: Faculty[] = [];
  schools: ProfessionalSchool[] = [];
  cycles: Cycle[] = [];

  // Modal Control
  showFormModal = false;
  isEditing = false;
  editingId?: number | null = null;

  // Unified Form Bindings
  name = '';
  code = '';
  description = '';
  durationHoursInput = 0;
  durationMinutesInput = 0;
  practicalHoursInput = 0;
  practicalMinutesInput = 0;
  theoreticalHoursInput = 0;
  theoreticalMinutesInput = 0;
  totalHoursInput = 0;
  totalMinutesInput = 0;

  selectedTypeId?: number | null = null;
  selectedPlanId?: number | null = null;
  selectedFacultyId?: number | null = null;
  selectedSchoolId?: number | null = null;
  selectedCycleId?: number | null = null;
  selectedGroupId?: number | null = null;

  // Deletion
  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: Course | null = null;

  // Toast
  showToast = false;
  toastMessage = '';
  toastTimer: any = null;
  toastHasUndo = false;

  ngOnInit(): void {
    this.load();
    this.loadRelations();
  }

  // Helper to format minutes as "Xh Ym"
  formatMinutes(mins?: number | null): string {
    const m = Number(mins ?? 0) || 0;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  }

  load(): void {
    this.service.getCourses().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.items = items.map((item: any, idx: number) => {
          const parseDur = (v: any) => {
            if (typeof v === 'string') return this.isoDurationToMinutes(v);
            if (typeof v === 'number') return Number(v);
            return 0;
          };
          const durationM = parseDur(item.duration ?? item.durationISO ?? item.durationString);
          const practicalM = parseDur(item.practicalHours ?? item.practicalHoursISO ?? item.practicalHoursString);
          const theoreticalM = parseDur(item.theoreticalHours ?? item.theoreticalHoursISO ?? item.theoreticalHoursString);
          const totalM = parseDur(item.totalHours ?? item.totalHoursISO ?? item.totalHoursString);

          const courseType = new CourseType(
            item.courseType?.name ?? '',
            item.courseType?.idCourseType ?? item.courseType?.id ?? idx + 1
          );
          const group = new Group(
            item.group?.groupNumber ?? 0,
            item.group?.capacity ?? 0,
            null as any,
            item.group?.idGroup ?? item.group?.id ?? idx + 1
          );
          const plan = new Plan(
            item.plan?.name ?? '',
            item.plan?.idPlan ?? item.plan?.id ?? idx + 1
          );

          return new Course(
            item.name ?? '',
            item.code ?? '',
            item.description ?? '',
            durationM,
            practicalM,
            theoreticalM,
            totalM,
            courseType,
            group,
            plan,
            item.idCourse ?? item.id ?? idx + 1
          );
        });
      },
      error: () => (this.items = []),
    });
  }

  loadRelations(): void {
    forkJoin({
      types: this.typeService.getCourseTypes(),
      plans: this.planService.getPlans(),
      faculties: this.facultyService.getFaculties(),
      schools: this.schoolService.getProfessionalSchools(),
      cycles: this.cycleService.getCycles(),
      groups: this.groupService.getGroups()
    }).subscribe({
      next: (res: any) => {
        const rawTypes = Array.isArray(res.types?.data) ? res.types.data : Array.isArray(res.types) ? res.types : [];
        this.types = rawTypes.map((item: any, idx: number) => new CourseType(item.name ?? '', item.idCourseType ?? item.id ?? idx + 1));

        const rawPlans = Array.isArray(res.plans?.data) ? res.plans.data : Array.isArray(res.plans) ? res.plans : [];
        this.plans = rawPlans.map((item: any, idx: number) => new Plan(item.name ?? '', item.idPlan ?? item.id ?? idx + 1));

        const rawFaculties = Array.isArray(res.faculties?.data) ? res.faculties.data : Array.isArray(res.faculties) ? res.faculties : [];
        this.faculties = rawFaculties.map((item: any, idx: number) => new Faculty(item.name ?? '', item.idFaculty ?? item.id ?? idx + 1));

        const rawSchools = Array.isArray(res.schools?.data) ? res.schools.data : Array.isArray(res.schools) ? res.schools : [];
        this.schools = rawSchools.map((item: any, idx: number) => {
          const fac = item.faculty ? new Faculty(item.faculty.name ?? '', item.faculty.idFaculty ?? item.facultyId ?? idx + 1) : new Faculty('', idx + 1);
          return new ProfessionalSchool(item.name ?? '', fac, item.idProfessionalSchool ?? item.id ?? idx + 1);
        });

        const rawCycles = Array.isArray(res.cycles?.data) ? res.cycles.data : Array.isArray(res.cycles) ? res.cycles : [];
        this.cycles = rawCycles.map((item: any, idx: number) => {
          const school = item.professionalSchool ? new ProfessionalSchool(item.professionalSchool.name ?? '', null as any, item.professionalSchool.idProfessionalSchool ?? idx + 1) : new ProfessionalSchool('', null as any, idx + 1);
          return new Cycle(item.name ?? '', school, item.idCycle ?? item.id ?? idx + 1);
        });

        const rawGroups = Array.isArray(res.groups?.data) ? res.groups.data : Array.isArray(res.groups) ? res.groups : [];
        this.groups = rawGroups.map((item: any, idx: number) => {
          const cycle = item.cycle ? new Cycle(item.cycle.name ?? '', null as any, item.cycle.idCycle ?? idx + 1) : new Cycle('', null as any, idx + 1);
          return new Group(item.groupNumber ?? 0, item.capacity ?? 0, cycle, item.idGroup ?? item.id ?? idx + 1);
        });

        this.linkHierarchy();
      },
      error: () => {
        this.types = [];
        this.plans = [];
        this.faculties = [];
        this.schools = [];
        this.cycles = [];
        this.groups = [];
      }
    });
  }

  linkHierarchy(): void {
    // 1. Link School to Faculty
    for (const s of this.schools) {
      if (s.faculty && s.faculty.idFaculty) {
        const f = this.faculties.find(x => x.idFaculty === s.faculty.idFaculty);
        if (f) s.faculty = f;
      }
    }
    // 2. Link Cycle to School
    for (const c of this.cycles) {
      if (c.professionalSchool && c.professionalSchool.idProfessionalSchool) {
        const s = this.schools.find(x => x.idProfessionalSchool === c.professionalSchool.idProfessionalSchool);
        if (s) c.professionalSchool = s;
      }
    }
    // 3. Link Group to Cycle
    for (const g of this.groups) {
      if (g.cycle && g.cycle.idCycle) {
        const c = this.cycles.find(x => x.idCycle === g.cycle.idCycle);
        if (c) g.cycle = c;
      }
    }
  }

  getSchoolNameForCourse(course: Course): string {
    const g = this.groups.find(x => x.idGroup === course.group?.idGroup);
    return g?.cycle?.professionalSchool?.name ?? 'S/D';
  }

  getCycleNameForCourse(course: Course): string {
    const g = this.groups.find(x => x.idGroup === course.group?.idGroup);
    return g?.cycle?.name ?? 'S/D';
  }

  // Cascading Getters
  getFilteredSchools(): ProfessionalSchool[] {
    if (!this.selectedFacultyId) return [];
    return this.schools.filter(s => s.faculty?.idFaculty == this.selectedFacultyId);
  }

  getFilteredCycles(): Cycle[] {
    if (!this.selectedSchoolId) return [];
    return this.cycles.filter(c => c.professionalSchool?.idProfessionalSchool == this.selectedSchoolId);
  }

  getFilteredGroups(): Group[] {
    if (!this.selectedCycleId) return [];
    return this.groups.filter(g => g.cycle?.idCycle == this.selectedCycleId);
  }

  // Cascading Change Handlers
  onFacultyChange(): void {
    this.selectedSchoolId = null;
    this.selectedCycleId = null;
    this.selectedGroupId = null;
  }

  onSchoolChange(): void {
    this.selectedCycleId = null;
    this.selectedGroupId = null;
  }

  onCycleChange(): void {
    this.selectedGroupId = null;
  }

  // Modal Open Handlers
  openCreateModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.showFormModal = true;
    this.sidebarService.modalOpen.set(true);

    // Reset Form fields
    this.name = '';
    this.code = '';
    this.description = '';
    this.durationHoursInput = 0;
    this.durationMinutesInput = 0;
    this.practicalHoursInput = 0;
    this.practicalMinutesInput = 0;
    this.theoreticalHoursInput = 0;
    this.theoreticalMinutesInput = 0;
    this.totalHoursInput = 0;
    this.totalMinutesInput = 0;

    this.selectedTypeId = null;
    this.selectedPlanId = null;
    this.selectedFacultyId = null;
    this.selectedSchoolId = null;
    this.selectedCycleId = null;
    this.selectedGroupId = null;
  }

  openEditModal(it: Course): void {
    this.isEditing = true;
    this.editingId = it.idCourse;
    this.showFormModal = true;
    this.sidebarService.modalOpen.set(true);

    this.name = it.name;
    this.code = it.code;
    this.description = it.description;

    // Split minutes into Hours / Minutes inputs
    const parseM = (v: any) => Number(v ?? 0) || 0;
    const durM = parseM(it.duration);
    this.durationHoursInput = Math.floor(durM / 60);
    this.durationMinutesInput = durM % 60;

    const pracM = parseM(it.practicalHours);
    this.practicalHoursInput = Math.floor(pracM / 60);
    this.practicalMinutesInput = pracM % 60;

    const theoM = parseM(it.theoreticalHours);
    this.theoreticalHoursInput = Math.floor(theoM / 60);
    this.theoreticalMinutesInput = theoM % 60;

    const totM = parseM(it.totalHours);
    this.totalHoursInput = Math.floor(totM / 60);
    this.totalMinutesInput = totM % 60;

    this.selectedTypeId = it.courseType?.idCourseType ?? null;
    this.selectedPlanId = it.plan?.idPlan ?? null;

    // Cascade resolution
    const group = this.groups.find(g => g.idGroup === it.group.idGroup);
    if (group) {
      this.selectedGroupId = group.idGroup ?? null;
      this.selectedCycleId = group.cycle?.idCycle ?? null;
      this.selectedSchoolId = group.cycle?.professionalSchool?.idProfessionalSchool ?? null;
      this.selectedFacultyId = group.cycle?.professionalSchool?.faculty?.idFaculty ?? null;
    } else {
      this.selectedGroupId = null;
      this.selectedCycleId = null;
      this.selectedSchoolId = null;
      this.selectedFacultyId = null;
    }
  }

  closeModal(): void {
    this.showFormModal = false;
    this.isEditing = false;
    this.editingId = null;
    this.sidebarService.modalOpen.set(false);
  }

  saveCourse(): void {
    const n = this.name.trim();
    if (!n || !this.selectedTypeId || !this.selectedGroupId || !this.selectedPlanId) {
      this.showTransientToast('Por favor, completa todos los campos requeridos', 3000, false);
      return;
    }

    const durationTotal = Number(this.durationHoursInput || 0) * 60 + Number(this.durationMinutesInput || 0);
    const practicalTotal = Number(this.practicalHoursInput || 0) * 60 + Number(this.practicalMinutesInput || 0);
    const theoreticalTotal = Number(this.theoreticalHoursInput || 0) * 60 + Number(this.theoreticalMinutesInput || 0);
    const totalTotal = Number(this.totalHoursInput || 0) * 60 + Number(this.totalMinutesInput || 0);

    const payload = {
      name: n,
      code: this.code,
      description: this.description,
      duration: durationTotal,
      practicalHours: practicalTotal,
      theoreticalHours: theoreticalTotal,
      totalHours: totalTotal,
      idCourseType: this.selectedTypeId,
      idGroup: this.selectedGroupId,
      idPlan: this.selectedPlanId,
    };

    if (this.isEditing && this.editingId) {
      this.service.updateCourse(this.editingId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.load();
          this.showTransientToast('Curso actualizado correctamente', 3000, true);
        },
        error: () => this.showTransientToast('Error al actualizar curso', 3000, false),
      });
    } else {
      this.service.createCourse(payload).subscribe({
        next: () => {
          this.closeModal();
          this.load();
          this.showTransientToast('Curso creado correctamente', 3000, true);
        },
        error: () => this.showTransientToast('Error al crear curso', 3000, false),
      });
    }
  }

  confirmRemove(it: Course, ev?: MouseEvent): void {
    this.pendingDeleteId = it.idCourse ?? null;
    this.pendingDeleteName = it.name;
    this.lastDeleted = new Course(
      it.name,
      it.code,
      it.description,
      it.duration,
      it.practicalHours,
      it.theoreticalHours,
      it.totalHours,
      it.courseType,
      it.group,
      it.plan,
      it.idCourse
    );
  }

  cancelRemove(): void {
    this.pendingDeleteId = null;
    this.pendingDeleteName = '';
  }

  performDeleteConfirmed(): void {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.service.deleteCourse(id).subscribe({
      next: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.load();
        this.showTransientToast('Curso eliminado correctamente', 5000, true);
      },
      error: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.showTransientToast('Error al eliminar el curso', 3000, false);
      },
    });
  }

  private showTransientToast(message: string, ms = 3000, undoable = false): void {
    this.toastMessage = message;
    this.showToast = true;
    this.toastHasUndo = undoable;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.toastMessage = '';
      this.toastHasUndo = false;
      this.toastTimer = null;
    }, ms);
  }

  undoDelete(): void {
    if (!this.lastDeleted) return;
    const payload = {
      name: this.lastDeleted.name,
      code: this.lastDeleted.code,
      description: this.lastDeleted.description,
      duration: Number(this.lastDeleted.duration ?? 0),
      practicalHours: Number(this.lastDeleted.practicalHours ?? 0),
      theoreticalHours: Number(this.lastDeleted.theoreticalHours ?? 0),
      totalHours: Number(this.lastDeleted.totalHours ?? 0),
      idCourseType: this.lastDeleted.courseType?.idCourseType!,
      idGroup: this.lastDeleted.group?.idGroup!,
      idPlan: this.lastDeleted.plan?.idPlan!,
    };
    if (!payload.idCourseType || !payload.idGroup || !payload.idPlan) {
      this.showTransientToast('No se puede restaurar: faltan referencias', 3000, false);
      return;
    }
    this.service.createCourse(payload).subscribe({
      next: () => {
        this.load();
        this.showTransientToast('Curso restaurado', 3000, false);
        this.lastDeleted = null;
      },
      error: () => this.showTransientToast('Error al restaurar curso', 3000, false),
    });
  }

  volver(): void {
    this.router.navigate(['/main/course-creation']);
  }

  // Convert ISO 8601 duration string (e.g. PT4H30M) to total minutes
  private isoDurationToMinutes(iso?: string | null): number {
    if (!iso || typeof iso !== 'string') return 0;
    const m = iso.match(/P(?:T)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    const hours = parseInt(m[1] ?? '0', 10) || 0;
    const minutes = parseInt(m[2] ?? '0', 10) || 0;
    const seconds = parseInt(m[3] ?? '0', 10) || 0;
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  // Convert total minutes to ISO 8601 duration string
  private minutesToIsoDuration(totalMinutes: number): string {
    if (!totalMinutes || totalMinutes <= 0) return 'PT0S';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    let s = 'PT';
    if (h) s += `${h}H`;
    if (m) s += `${m}M`;
    return s;
  }
}
