import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CargaAcademicaService } from '../../core/services/carga-academica.service';
import { FacultyService } from '../../core/services/faculty.service';
import { ProfessionalSchoolService } from '../../core/services/professional-school.service';
import { CourseService } from '../../core/services/course.service';
import { GroupService } from '../../core/services/group.service';
import { CycleService } from '../../core/services/cycle.service';
import { Faculty } from '../../core/models/faculty';
import { ProfessionalSchool } from '../../core/models/professional-school';
import { Course } from '../../core/models/course';
import { Group } from '../../core/models/group';
import { Cycle } from '../../core/models/cycle';

export interface UnifiedFacultyLoad {
  faculty: Faculty;
  expanded: boolean;
  schools: UnifiedSchoolLoad[];
}

export interface UnifiedSchoolLoad {
  school: ProfessionalSchool;
  expanded: boolean;
  cycles: UnifiedCycleLoad[];
}

export interface UnifiedCycleLoad {
  cycle: Cycle;
  groups: UnifiedGroupLoad[];
}

export interface UnifiedGroupLoad {
  group: Group;
  courses: Course[];
}

@Component({
  selector: 'app-carga-academica',
  imports: [CommonModule, FormsModule],
  templateUrl: './carga-academica.component.html',
  styleUrl: './carga-academica.component.css'
})
export class CargaAcademicaComponent implements OnInit {
  selectedFaculty: number | '' = '';
  selectedSchool: number | '' = '';
  showUploadModal = false;
  showSuccessModal = false;
  isUploading = false;
  uploadProgress = 0;
  selectedFile: File | null = null;
  isDragging = false;
  uploadError: string | null = null;
  private fakeProgressInterval: any = null;

  faculties: Faculty[] = [];
  allSchools: ProfessionalSchool[] = [];
  schools: ProfessionalSchool[] = [];
  allCourses: Course[] = [];
  allGroups: Group[] = [];
  allCycles: Cycle[] = [];
  
  // Estructura jerárquica unificada
  unifiedLoad: UnifiedFacultyLoad[] = [];
  isLoading = false;

  constructor(
    private cargaAcademicaService: CargaAcademicaService,
    private facultyService: FacultyService,
    private schoolService: ProfessionalSchoolService,
    private courseService: CourseService,
    private groupService: GroupService,
    private cycleService: CycleService
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.isLoading = true;
    
    forkJoin({
      faculties: this.facultyService.getFaculties(),
      schools: this.schoolService.getProfessionalSchools(),
      courses: this.courseService.getCourses(),
      groups: this.groupService.getGroups(),
      cycles: this.cycleService.getCycles()
    }).subscribe({
      next: (data) => {
        // Parse faculties
        const rawFaculties = Array.isArray((data.faculties as any)?.data) ? (data.faculties as any).data : Array.isArray(data.faculties) ? data.faculties : [];
        this.faculties = rawFaculties.map((f: any, idx: number) => new Faculty(f.name ?? '', f.idFaculty ?? f.id ?? idx + 1));

        // Parse schools
        const rawSchools = Array.isArray((data.schools as any)?.data) ? (data.schools as any).data : Array.isArray(data.schools) ? data.schools : [];
        this.allSchools = rawSchools.map((s: any, idx: number) => {
          const fac = s.faculty ? new Faculty(s.faculty.name ?? '', s.faculty.idFaculty ?? s.facultyId ?? idx + 1) : new Faculty('', idx + 1);
          return new ProfessionalSchool(s.name ?? '', fac, s.idProfessionalSchool ?? s.id ?? idx + 1);
        });

        // Parse courses
        const rawCourses = Array.isArray((data.courses as any)?.data) ? (data.courses as any).data : Array.isArray(data.courses) ? data.courses : [];
        this.allCourses = rawCourses.map((c: any, idx: number) => {
          return new Course(
            c.name ?? '',
            c.code ?? '',
            c.description ?? '',
            c.duration ?? 0,
            c.practicalHours ?? 0,
            c.theoreticalHours ?? 0,
            c.totalHours ?? 0,
            c.courseType ? c.courseType : null,
            c.group ? c.group : null,
            c.plan ? c.plan : null,
            c.idCourse ?? c.id ?? idx + 1
          );
        });

        // Parse groups
        const rawGroups = Array.isArray((data.groups as any)?.data) ? (data.groups as any).data : Array.isArray(data.groups) ? data.groups : [];
        this.allGroups = rawGroups.map((g: any, idx: number) => {
          const cy = g.cycle ? new Cycle(g.cycle.name ?? '', null as any, g.cycle.idCycle ?? idx + 1) : new Cycle('', null as any, idx + 1);
          return new Group(g.groupNumber ?? 0, g.capacity ?? 0, cy, g.idGroup ?? g.id ?? idx + 1);
        });

        // Parse cycles
        const rawCycles = Array.isArray((data.cycles as any)?.data) ? (data.cycles as any).data : Array.isArray(data.cycles) ? data.cycles : [];
        this.allCycles = rawCycles.map((cy: any, idx: number) => {
          const sch = cy.professionalSchool ? new ProfessionalSchool(cy.professionalSchool.name ?? '', null as any, cy.professionalSchool.idProfessionalSchool ?? idx + 1) : new ProfessionalSchool('', null as any, idx + 1);
          return new Cycle(cy.name ?? '', sch, cy.idCycle ?? cy.id ?? idx + 1);
        });

        this.linkHierarchy();
        this.buildUnifiedLoad();

        if (this.selectedFaculty) {
          this.schools = this.allSchools.filter(s => s.faculty?.idFaculty == this.selectedFaculty);
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading initial data', err);
        this.isLoading = false;
      }
    });
  }

  linkHierarchy(): void {
    // Link school to faculty
    for (const s of this.allSchools) {
      if (s.faculty && s.faculty.idFaculty) {
        const f = this.faculties.find(x => x.idFaculty === s.faculty.idFaculty);
        if (f) s.faculty = f;
      }
    }
    // Link cycle to school
    for (const c of this.allCycles) {
      if (c.professionalSchool && c.professionalSchool.idProfessionalSchool) {
        const s = this.allSchools.find(x => x.idProfessionalSchool === c.professionalSchool.idProfessionalSchool);
        if (s) c.professionalSchool = s;
      }
    }
    // Link group to cycle
    for (const g of this.allGroups) {
      if (g.cycle && g.cycle.idCycle) {
        const c = this.allCycles.find(x => x.idCycle === g.cycle.idCycle);
        if (c) g.cycle = c;
      }
    }
  }

  private parseCycleWeight(name: string): number {
    if (!name) return 0;
    const clean = name.trim().toUpperCase();
    const romanWeights: Record<string, number> = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
      'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
      'XI': 11, 'XII': 12
    };
    for (const key of Object.keys(romanWeights)) {
      if (clean === key || clean.endsWith(' ' + key) || clean.endsWith('-' + key)) {
        return romanWeights[key];
      }
    }
    const numMatch = clean.match(/\d+/);
    return numMatch ? parseInt(numMatch[0], 10) : 999;
  }

  buildUnifiedLoad() {
    this.unifiedLoad = [];
    
    this.faculties.forEach(f => {
      const fSchools = this.allSchools.filter(s => s.faculty?.idFaculty === f.idFaculty);
      const schoolsLoad: UnifiedSchoolLoad[] = [];
      
      fSchools.forEach(s => {
        const sCycles = this.allCycles.filter(cy => cy.professionalSchool?.idProfessionalSchool === s.idProfessionalSchool);
        
        // Ordenar ciclos de menor a mayor
        sCycles.sort((a, b) => this.parseCycleWeight(a.name) - this.parseCycleWeight(b.name));
        
        const cyclesLoad: UnifiedCycleLoad[] = [];
        
        sCycles.forEach(cy => {
          const cyGroups = this.allGroups.filter(g => g.cycle?.idCycle === cy.idCycle);
          cyGroups.sort((a, b) => {
            const numA = (a.groupNumber + '').toUpperCase() === 'UNICO' ? 0 : Number(a.groupNumber) || 0;
            const numB = (b.groupNumber + '').toUpperCase() === 'UNICO' ? 0 : Number(b.groupNumber) || 0;
            return numA - numB;
          });
          
          const groupsLoad: UnifiedGroupLoad[] = [];
          
          cyGroups.forEach(g => {
            const cyCourses: Course[] = [];
            this.allCourses.forEach(c => {
              if (!c.group) return;
              if (c.group.idGroup === g.idGroup) {
                if (!cyCourses.some(added => added.idCourse === c.idCourse)) {
                  c.group.cycle = cy;
                  cyCourses.push(c);
                }
              }
            });
            
            if (cyCourses.length > 0) {
              groupsLoad.push({
                group: g,
                courses: cyCourses
              });
            }
          });
          
          if (groupsLoad.length > 0) {
            cyclesLoad.push({
              cycle: cy,
              groups: groupsLoad
            });
          }
        });
        
        if (cyclesLoad.length > 0) {
          schoolsLoad.push({
            school: s,
            expanded: false,
            cycles: cyclesLoad
          });
        }
      });
      
      if (schoolsLoad.length > 0) {
        this.unifiedLoad.push({
          faculty: f,
          expanded: false,
          schools: schoolsLoad
        });
      }
    });
    this.applyFilters();
  }

  filteredUnifiedLoad: UnifiedFacultyLoad[] = [];

  applyFilters() {
    let list = this.unifiedLoad;
    if (this.selectedFaculty) {
      list = list.filter(f => f.faculty.idFaculty == this.selectedFaculty);
    }
    this.filteredUnifiedLoad = list;
  }

  toggleFaculty(item: UnifiedFacultyLoad) {
    item.expanded = !item.expanded;
  }

  toggleSchool(item: UnifiedSchoolLoad) {
    item.expanded = !item.expanded;
  }

  onFacultyChange() {
    if (this.selectedFaculty) {
      this.schools = this.allSchools.filter(s => s.faculty?.idFaculty == this.selectedFaculty);
    } else {
      this.schools = [];
    }
    this.applyFilters();
  }

  downloadTemplate() {
    console.log('Descargando plantilla...');
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.uploadError = null;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.selectedFile = null;
    this.isDragging = false;
    this.uploadError = null;
    if (this.fakeProgressInterval) {
      clearInterval(this.fakeProgressInterval);
      this.fakeProgressInterval = null;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.uploadError = null;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadError = null;
    }
  }

  uploadSelectedFile() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = null;
    
    if (this.fakeProgressInterval) {
      clearInterval(this.fakeProgressInterval);
    }
    
    // Fake progress animation
    this.fakeProgressInterval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += Math.floor(Math.random() * 8) + 2; // Sube entre 2% y 10%
        if (this.uploadProgress > 90) this.uploadProgress = 90;
      } else if (this.uploadProgress < 96) {
        this.uploadProgress += 1; // Sube lentamente al final
      }
    }, 400);

    this.cargaAcademicaService.uploadFile(this.selectedFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          if (this.fakeProgressInterval) clearInterval(this.fakeProgressInterval);
          this.uploadProgress = 100;
          setTimeout(() => {
            this.isUploading = false;
            this.closeUploadModal();
            this.showSuccessModal = true;
            this.loadInitialData();
          }, 600); // Pequeño retraso para que el usuario vea el 100%
        }
      },
      error: (error) => {
        if (this.fakeProgressInterval) clearInterval(this.fakeProgressInterval);
        console.error('Error al subir archivo:', error);
        this.isUploading = false;
        this.uploadError = 'Ocurrió un error al subir el archivo. Inténtalo de nuevo.';
      }
    });
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  viewPreviousVersions() {
    console.log('Ver versiones anteriores...');
  }
}