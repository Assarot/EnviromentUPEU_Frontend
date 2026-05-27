import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FacultyComponent } from '../faculty/faculty.component';
import { ProfessionalSchoolComponent } from '../professional-school/professional-school.component';
import { CycleComponent } from '../cycle/cycle.component';
import { GroupComponent } from '../group/group.component';
import { FacultyService } from '../../../core/services/faculty.service';
import { ProfessionalSchoolService } from '../../../core/services/professional-school.service';
import { CycleService } from '../../../core/services/cycle.service';
import { GroupService } from '../../../core/services/group.service';
import { Faculty } from '../../../core/models/faculty';
import { ProfessionalSchool } from '../../../core/models/professional-school';
import { Cycle } from '../../../core/models/cycle';
import { Group } from '../../../core/models/group';

@Component({
  selector: 'app-academic-structure',
  standalone: true,
  imports: [
    CommonModule,
    FacultyComponent,
    ProfessionalSchoolComponent,
    CycleComponent,
    GroupComponent
  ],
  templateUrl: './academic-structure.component.html',
  styleUrls: ['./academic-structure.component.css']
})
export class AcademicStructureComponent implements OnInit {
  private router = inject(Router);
  private facultyService = inject(FacultyService);
  private schoolService = inject(ProfessionalSchoolService);
  private cycleService = inject(CycleService);
  private groupService = inject(GroupService);

  activeTab: 'unified' | 'faculty' | 'school' | 'cycle' | 'group' = 'unified';
  readonly brand = '#BFC621';

  faculties: Faculty[] = [];
  schools: ProfessionalSchool[] = [];
  cycles: Cycle[] = [];
  groups: Group[] = [];

  unifiedStructure: {
    faculty: Faculty;
    expanded: boolean;
    schools: {
      school: ProfessionalSchool;
      expanded: boolean;
      cycles: {
        cycle: Cycle;
        groups: Group[];
      }[];
    }[];
  }[] = [];

  isLoading = false;

  ngOnInit(): void {
    this.loadUnifiedData();
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

  loadUnifiedData(): void {
    this.isLoading = true;
    forkJoin({
      faculties: this.facultyService.getFaculties(),
      schools: this.schoolService.getProfessionalSchools(),
      cycles: this.cycleService.getCycles(),
      groups: this.groupService.getGroups()
    }).subscribe({
      next: (res: any) => {
        // Parse faculties
        const rawFaculties = Array.isArray(res.faculties?.data) ? res.faculties.data : Array.isArray(res.faculties) ? res.faculties : [];
        this.faculties = rawFaculties.map((f: any, idx: number) => new Faculty(f.name ?? '', f.idFaculty ?? f.id ?? idx + 1));

        // Parse schools
        const rawSchools = Array.isArray(res.schools?.data) ? res.schools.data : Array.isArray(res.schools) ? res.schools : [];
        this.schools = rawSchools.map((s: any, idx: number) => {
          const fac = s.faculty ? new Faculty(s.faculty.name ?? '', s.faculty.idFaculty ?? s.facultyId ?? idx + 1) : new Faculty('', idx + 1);
          return new ProfessionalSchool(s.name ?? '', fac, s.idProfessionalSchool ?? s.id ?? idx + 1);
        });

        // Parse cycles
        const rawCycles = Array.isArray(res.cycles?.data) ? res.cycles.data : Array.isArray(res.cycles) ? res.cycles : [];
        this.cycles = rawCycles.map((c: any, idx: number) => {
          const school = c.professionalSchool ? new ProfessionalSchool(c.professionalSchool.name ?? '', null as any, c.professionalSchool.idProfessionalSchool ?? idx + 1) : new ProfessionalSchool('', null as any, idx + 1);
          return new Cycle(c.name ?? '', school, c.idCycle ?? c.id ?? idx + 1);
        });

        // Parse groups
        const rawGroups = Array.isArray(res.groups?.data) ? res.groups.data : Array.isArray(res.groups) ? res.groups : [];
        this.groups = rawGroups.map((g: any, idx: number) => {
          const cycle = g.cycle ? new Cycle(g.cycle.name ?? '', null as any, g.cycle.idCycle ?? idx + 1) : new Cycle('', null as any, idx + 1);
          return new Group(g.groupNumber ?? 0, g.capacity ?? 0, cycle, g.idGroup ?? g.id ?? idx + 1);
        });

        // Link parent references
        for (const s of this.schools) {
          if (s.faculty && s.faculty.idFaculty) {
            const f = this.faculties.find(x => x.idFaculty === s.faculty.idFaculty);
            if (f) s.faculty = f;
          }
        }
        for (const c of this.cycles) {
          if (c.professionalSchool && c.professionalSchool.idProfessionalSchool) {
            const s = this.schools.find(x => x.idProfessionalSchool === c.professionalSchool.idProfessionalSchool);
            if (s) c.professionalSchool = s;
          }
        }
        for (const g of this.groups) {
          if (g.cycle && g.cycle.idCycle) {
            const c = this.cycles.find(x => x.idCycle === g.cycle.idCycle);
            if (c) g.cycle = c;
          }
        }

        // Build tree
        this.unifiedStructure = this.faculties.map(f => {
          const fSchools = this.schools.filter(s => s.faculty?.idFaculty === f.idFaculty);
          return {
            faculty: f,
            expanded: true,
            schools: fSchools.map(s => {
              const sCycles = this.cycles.filter(c => c.professionalSchool?.idProfessionalSchool === s.idProfessionalSchool);
              
              // Ordenar ciclos de menor a mayor
              sCycles.sort((a, b) => this.parseCycleWeight(a.name) - this.parseCycleWeight(b.name));

              return {
                school: s,
                expanded: true,
                cycles: sCycles.map(c => {
                  const cGroups = this.groups.filter(g => g.cycle?.idCycle === c.idCycle);
                  
                  // Ordenar grupos de menor a mayor
                  cGroups.sort((a, b) => (a.groupNumber ?? 0) - (b.groupNumber ?? 0));

                  return {
                    cycle: c,
                    groups: cGroups
                  };
                })
              };
            })
          };
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando estructura unificada', err);
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'unified' | 'faculty' | 'school' | 'cycle' | 'group'): void {
    this.activeTab = tab;
    if (tab === 'unified') {
      this.loadUnifiedData();
    }
  }

  toggleFaculty(item: any): void {
    item.expanded = !item.expanded;
  }

  toggleSchool(schoolItem: any): void {
    schoolItem.expanded = !schoolItem.expanded;
  }

  volver(): void {
    this.router.navigate(['/main/course-creation']);
  }
}
