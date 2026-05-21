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

interface GroupedCourses {
  cycleName: string;
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

  faculties: Faculty[] = [];
  allSchools: ProfessionalSchool[] = [];
  schools: ProfessionalSchool[] = [];
  allCourses: Course[] = [];
  allGroups: Group[] = [];
  allCycles: Cycle[] = [];
  groupedCourses: GroupedCourses[] = [];
  
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
        this.faculties = data.faculties;
        this.allSchools = data.schools;
        this.allCourses = data.courses;
        this.allGroups = data.groups;
        this.allCycles = data.cycles;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading initial data', err);
        this.isLoading = false;
      }
    });
  }

  onFacultyChange() {
    this.selectedSchool = '';
    this.groupedCourses = [];
    if (this.selectedFaculty) {
      this.schools = this.allSchools.filter(s => s.faculty?.idFaculty == this.selectedFaculty);
    } else {
      this.schools = [];
    }
  }

  onSchoolChange() {
    if (this.selectedSchool) {
      this.loadCoursesForSchool(Number(this.selectedSchool));
    } else {
      this.groupedCourses = [];
    }
  }

  loadCoursesForSchool(schoolId: number) {
    const grouped = new Map<string, Course[]>();
    
    this.allCourses.forEach(c => {
      if (!c.group) return;
      const group = this.allGroups.find(g => g.idGroup === c.group.idGroup);
      if (!group) return;

      const cycle = this.allCycles.find(cy => cy.idCycle === group.cycle?.idCycle);
      if (!cycle) return;

      if (cycle.professionalSchool?.idProfessionalSchool === schoolId) {
        const cycleName = cycle.name || 'Sin Ciclo';
        
        if (!grouped.has(cycleName)) {
          grouped.set(cycleName, []);
        }
        
        // Re-assign the populated objects so the template can read them easily
        c.group.cycle = cycle;
        grouped.get(cycleName)!.push(c);
      }
    });

    this.groupedCourses = Array.from(grouped.keys())
      .sort() // Simple alphabetical sort
      .map(cycleName => ({
        cycleName,
        courses: grouped.get(cycleName)!
      }));
  }

  getCourseRowClass(course: Course): string {
    return '';
  }

  downloadTemplate() {
    // Simulate template download
    console.log('Descargando plantilla...');
    // Here you would implement actual file download
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
    
    this.cargaAcademicaService.uploadFile(this.selectedFile).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * event.loaded / (event.total || 1));
        } else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          this.closeUploadModal();
          this.showSuccessModal = true;
        }
      },
      error: (error) => {
        console.error('Error al subir archivo:', error);
        this.isUploading = false;
        this.uploadError = 'Ocurrió un error al subir el archivo. Inténtalo de nuevo.';
      }
    });
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    // Here you could redirect or refresh the data
  }

  viewPreviousVersions() {
    console.log('Ver versiones anteriores...');
    // Here you would implement the previous versions functionality
  }
}