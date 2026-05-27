import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfessionalSchool } from '../../../core/models/professional-school';
import { ProfessionalSchoolService } from '../../../core/services/professional-school.service';
import { FacultyService } from '../../../core/services/faculty.service';
import { Faculty } from '../../../core/models/faculty';
import { Router } from '@angular/router';

@Component({
  selector: 'app-professional-school',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './professional-school.component.html',
  styleUrls: ['./professional-school.component.css'],
})
export class ProfessionalSchoolComponent implements OnInit {
  @Input() hideBack = false;
  private service = inject(ProfessionalSchoolService);
  private facultyService = inject(FacultyService);
  private router = inject(Router);

  schools: ProfessionalSchool[] = [];
  faculties: Faculty[] = [];

  name = '';
  selectedFacultyId?: number | null = null;

  editingId?: number | null = null;
  editingName = '';
  editingFacultyId?: number | null = null;

  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: ProfessionalSchool | null = null;
  popupStyle: { [k: string]: string } | null = null;

  showToast = false;
  toastMessage = '';
  toastTimer: any = null;
  toastHasUndo = false;

  ngOnInit(): void {
    this.load();
    this.loadFaculties();
  }

  load(): void {
    this.service.getProfessionalSchools().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.schools = items.map((item: any, idx: number) => {
          const fac = item.faculty
            ? new Faculty(
                item.faculty.name ?? '',
                item.faculty.idFaculty ?? item.facultyId ?? idx + 1
              )
            : new Faculty('', item.id ?? idx + 1);
          return new ProfessionalSchool(
            item.name ?? '',
            fac,
            item.idProfessionalSchool ?? item.id ?? idx + 1
          );
        });
      },
      error: () => {
        this.schools = [];
      },
    });
  }

  loadFaculties(): void {
    this.facultyService.getFaculties().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.faculties = items.map(
          (item: any, idx: number) =>
            new Faculty(item.name ?? '', item.id ?? item.facultyId ?? idx + 1)
        );
      },
      error: () => {
        this.faculties = [];
      },
    });
  }

  create(): void {
    const n = this.name.trim();
    if (!n || !this.selectedFacultyId) return;
    this.service
      .createProfessionalSchool({ name: n, idFaculty: this.selectedFacultyId })
      .subscribe({
        next: () => {
          this.name = '';
          this.selectedFacultyId = null;
          this.load();
        },
        error: () => {
          this.showTransientToast(
            'Error al crear escuela profesional',
            3000,
            false
          );
        },
      });
  }

  edit(s: ProfessionalSchool): void {
    this.editingId = s.idProfessionalSchool;
    this.editingName = s.name;
    this.editingFacultyId = s.faculty?.idFaculty ?? null;
  }

  cancel(): void {
    this.editingId = null;
    this.editingName = '';
    this.editingFacultyId = null;
  }

  save(): void {
    if (this.editingId == null) return;
    const n = this.editingName.trim();
    if (!n || !this.editingFacultyId) return;
    this.service
      .updateProfessionalSchool(this.editingId, {
        name: n,
        idFaculty: this.editingFacultyId,
      })
      .subscribe({
        next: () => {
          this.cancel();
          this.load();
        },
        error: () => {
          this.showTransientToast('Error al actualizar', 3000, false);
        },
      });
  }

  confirmRemove(s: ProfessionalSchool, ev?: MouseEvent): void {
    this.pendingDeleteId = s.idProfessionalSchool ?? null;
    this.pendingDeleteName = s.name;
    this.lastDeleted = new ProfessionalSchool(
      s.name,
      s.faculty,
      s.idProfessionalSchool
    );

    try {
      const btn = ev?.currentTarget as HTMLElement | undefined;
      const react = btn ? btn.getBoundingClientRect() : undefined;
      const popupW = 224;
      const popupH = 96;
      let top: number;
      let left: number;
      if (react) {
        if (react.top > popupH + 20) {
          top = react.top - popupH - 8;
        } else {
          top = react.bottom + 8;
        }
        left = react.left + react.width / 2 - popupW / 2;

        const minLeft = 8;
        const maxLeft = Math.max(8, window.innerWidth - popupW - 8);
        if (left < minLeft) left = minLeft;
        if (left > maxLeft) left = maxLeft;
      } else {
        top = Math.max(8, window.innerHeight / 2 - popupH / 2);
        left = Math.max(8, window.innerWidth / 2 - popupW / 2);
      }
      this.popupStyle = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      };
    } catch (e) {
      this.popupStyle = null;
    }
  }

  cancelRemove(): void {
    this.pendingDeleteId = null;
    this.pendingDeleteName = '';
  }

  performDeleteConfirmed(): void {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.service.deleteProfessionalSchool(id).subscribe({
      next: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.load();
        this.showTransientToast('Eliminado correctamente', 5000, true);
      },
      error: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.showTransientToast('Error al eliminar', 3000, false);
      },
    });
  }

  private showTransientToast(
    message: string,
    ms = 3000,
    undoable = false
  ): void {
    this.toastMessage = message;
    this.showToast = true;
    this.toastHasUndo = undoable;
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
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
      idFaculty: this.lastDeleted.faculty?.idFaculty!,
    };
    if (!payload.idFaculty) {
      this.showTransientToast(
        'No se puede restaurar: falta facultad',
        3000,
        false
      );
      return;
    }
    this.service.createProfessionalSchool(payload).subscribe({
      next: () => {
        this.load();
        this.showTransientToast('Restaurado', 3000, false);
        this.lastDeleted = null;
      },
      error: () => {
        this.showTransientToast('Error al restaurar', 3000, false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/main/course-creation']);
  }
}
