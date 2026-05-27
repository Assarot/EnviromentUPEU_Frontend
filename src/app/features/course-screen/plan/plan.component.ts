import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Plan } from '../../../core/models/plan';
import { PlanService } from '../../../core/services/plan.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.css'],
})
export class PlanComponent implements OnInit {
  @Input() hideBack = false;
  private service = inject(PlanService);
  private router = inject(Router);

  items: Plan[] = [];

  name = '';

  editingId?: number | null = null;
  editingName = '';

  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: Plan | null = null;
  popupStyle: { [k: string]: string } | null = null;

  showToast = false;
  toastMessage = '';
  toastTimer: any = null;
  toastHasUndo = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.getPlans().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.items = items.map(
          (item: any, idx: number) =>
            new Plan(item.name ?? '', item.idPlan ?? item.id ?? idx + 1)
        );
      },
      error: () => (this.items = []),
    });
  }

  create(): void {
    const n = this.name.trim();
    if (!n) return;
    this.service.createPlan({ name: n }).subscribe({
      next: () => {
        this.name = '';
        this.load();
      },
      error: () => this.showTransientToast('Error al crear plan', 3000, false),
    });
  }

  edit(p: Plan): void {
    this.editingId = p.idPlan;
    this.editingName = p.name;
  }

  cancel(): void {
    this.editingId = null;
    this.editingName = '';
  }

  save(): void {
    if (this.editingId == null) return;
    const n = this.editingName.trim();
    if (!n) return;
    this.service.updatePlan(this.editingId, { name: n }).subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: () => this.showTransientToast('Error al actualizar', 3000, false),
    });
  }

  confirmRemove(p: Plan, ev?: MouseEvent): void {
    this.pendingDeleteId = p.idPlan ?? null;
    this.pendingDeleteName = p.name;
    this.lastDeleted = new Plan(p.name, p.idPlan);
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
    this.popupStyle = null;
  }

  performDeleteConfirmed(): void {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.service.deletePlan(id).subscribe({
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
    const payload = { name: this.lastDeleted.name };
    this.service.createPlan(payload).subscribe({
      next: () => {
        this.load();
        this.showTransientToast('Restaurado', 3000, false);
        this.lastDeleted = null;
      },
      error: () => this.showTransientToast('Error al restaurar', 3000, false),
    });
  }

  volver(): void {
    this.router.navigate(['/main/course-creation']);
  }
}
