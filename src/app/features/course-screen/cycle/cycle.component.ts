import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Cycle } from '../../../core/models/cycle';
import { CycleService } from '../../../core/services/cycle.service';
import { ProfessionalSchoolService } from '../../../core/services/professional-school.service';
import { ProfessionalSchool } from '../../../core/models/professional-school';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cycle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cycle.component.html',
  styleUrls: ['./cycle.component.css'],
})
export class CycleComponent implements OnInit {
  @Input() hideBack = false;
  private service = inject(CycleService);
  private schoolService = inject(ProfessionalSchoolService);
  private router = inject(Router);

  cycles: Cycle[] = [];
  schools: ProfessionalSchool[] = [];

  name = '';
  selectedSchoolId?: number | null = null;

  editingId?: number | null = null;
  editingName = '';
  editingSchoolId?: number | null = null;

  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: Cycle | null = null;
  popupStyle: { [k: string]: string } | null = null;

  showToast = false;
  toastMessage = '';
  toastTimer: any = null;
  toastHasUndo = false;

  ngOnInit(): void {
    this.load();
    this.loadSchools();
  }

  load(): void {
    this.service.getCycles().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.cycles = items.map((item: any, idx: number) => {
          const school = item.professionalSchool
            ? new ProfessionalSchool(
                item.professionalSchool.name ?? '',
                null as any,
                item.professionalSchool.idProfessionalSchool ?? idx + 1
              )
            : new ProfessionalSchool('', null as any, idx + 1);
          return new Cycle(
            item.name ?? '',
            school,
            item.idCycle ?? item.id ?? idx + 1
          );
        });
      },
      error: () => {
        this.cycles = [];
      },
    });
  }

  loadSchools(): void {
    this.schoolService.getProfessionalSchools().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.schools = items.map(
          (item: any, idx: number) =>
            new ProfessionalSchool(
              item.name ?? '',
              null as any,
              item.idProfessionalSchool ?? item.id ?? idx + 1
            )
        );
      },
      error: () => {
        this.schools = [];
      },
    });
  }

  create(): void {
    const n = this.name.trim();
    if (!n || !this.selectedSchoolId) return;
    this.service
      .createCycle({ name: n, idProfessionalSchool: this.selectedSchoolId })
      .subscribe({
        next: () => {
          this.name = '';
          this.selectedSchoolId = null;
          this.load();
        },
        error: () => {
          this.showTransientToast('Error al crear ciclo', 3000, false);
        },
      });
  }

  edit(c: Cycle): void {
    this.editingId = c.idCycle;
    this.editingName = c.name;
    this.editingSchoolId = c.professionalSchool?.idProfessionalSchool ?? null;
  }

  cancel(): void {
    this.editingId = null;
    this.editingName = '';
    this.editingSchoolId = null;
  }

  save(): void {
    if (this.editingId == null) return;
    const n = this.editingName.trim();
    if (!n || !this.editingSchoolId) return;
    this.service
      .updateCycle(this.editingId, {
        name: n,
        idProfessionalSchool: this.editingSchoolId,
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

  confirmRemove(c: Cycle, ev?: MouseEvent): void {
    this.pendingDeleteId = c.idCycle ?? null;
    this.pendingDeleteName = c.name;
    this.lastDeleted = new Cycle(c.name, c.professionalSchool, c.idCycle);

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
    this.service.deleteCycle(id).subscribe({
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
      idProfessionalSchool:
        this.lastDeleted.professionalSchool?.idProfessionalSchool!,
    };
    if (!payload.idProfessionalSchool) {
      this.showTransientToast(
        'No se puede restaurar: falta escuela profesional',
        3000,
        false
      );
      return;
    }
    this.service.createCycle(payload).subscribe({
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
