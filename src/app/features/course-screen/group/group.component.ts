import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Group } from '../../../core/models/group';
import { GroupService } from '../../../core/services/group.service';
import { CycleService } from '../../../core/services/cycle.service';
import { Cycle } from '../../../core/models/cycle';
import { Router } from '@angular/router';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.component.html',
})
export class GroupComponent implements OnInit {
  @Input() hideBack = false;
  private service = inject(GroupService);
  private cycleService = inject(CycleService);
  private router = inject(Router);

  groups: Group[] = [];
  cycles: Cycle[] = [];

  groupNumber?: number | null = null;
  capacity?: number | null = null;
  selectedCycleId?: number | null = null;

  editingId?: number | null = null;
  editingGroupNumber?: number | null = null;
  editingCapacity?: number | null = null;
  editingCycleId?: number | null = null;

  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: Group | null = null;
  popupStyle: { [k: string]: string } | null = null;

  showToast = false;
  toastMessage = '';
  toastTimer: any = null;
  toastHasUndo = false;

  ngOnInit(): void {
    this.load();
    this.loadCycles();
  }

  load(): void {
    this.service.getGroups().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.groups = items.map((item: any, idx: number) => {
          const cycle = item.cycle
            ? new Cycle(
                item.cycle.name ?? '',
                null as any,
                item.cycle.idCycle ?? idx + 1
              )
            : new Cycle('', null as any, idx + 1);
          return new Group(
            item.groupNumber ?? 0,
            item.capacity ?? 0,
            cycle,
            item.idGroup ?? item.id ?? idx + 1
          );
        });
      },
      error: () => {
        this.groups = [];
      },
    });
  }

  loadCycles(): void {
    this.cycleService.getCycles().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.cycles = items.map(
          (item: any, idx: number) =>
            new Cycle(
              item.name ?? '',
              null as any,
              item.idCycle ?? item.id ?? idx + 1
            )
        );
      },
      error: () => {
        this.cycles = [];
      },
    });
  }

  create(): void {
    if (!this.groupNumber || !this.capacity || !this.selectedCycleId) return;
    console.log('Creating group with:', {
      groupNumber: this.groupNumber,
      capacity: this.capacity,
      cycleId: this.selectedCycleId,
    });
    this.service
      .createGroup({
        groupNumber: this.groupNumber,
        capacity: this.capacity,
        idCycle: this.selectedCycleId,
      })
      .subscribe({
        next: () => {
          this.groupNumber = null;
          this.capacity = null;
          this.selectedCycleId = null;
          this.load();
        },
        error: () => {
          this.showTransientToast('Error al crear grupo', 3000, false);
        },
      });
  }

  edit(g: Group): void {
    this.editingId = g.idGroup;
    this.editingGroupNumber = g.groupNumber;
    this.editingCapacity = g.capacity;
    this.editingCycleId = g.cycle?.idCycle ?? null;
  }

  cancel(): void {
    this.editingId = null;
    this.editingGroupNumber = null;
    this.editingCapacity = null;
    this.editingCycleId = null;
  }

  save(): void {
    if (this.editingId == null) return;
    if (
      !this.editingGroupNumber ||
      !this.editingCapacity ||
      !this.editingCycleId
    )
      return;
    this.service
      .updateGroup(this.editingId, {
        groupNumber: this.editingGroupNumber,
        capacity: this.editingCapacity,
        idCycle: this.editingCycleId,
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

  confirmRemove(g: Group, ev?: MouseEvent): void {
    this.pendingDeleteId = g.idGroup ?? null;
    this.pendingDeleteName = `Grupo ${g.groupNumber}`;
    this.lastDeleted = new Group(g.groupNumber, g.capacity, g.cycle, g.idGroup);

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
    this.service.deleteGroup(id).subscribe({
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
      groupNumber: this.lastDeleted.groupNumber,
      capacity: this.lastDeleted.capacity,
      idCycle: this.lastDeleted.cycle?.idCycle!,
    };
    if (!payload.idCycle) {
      this.showTransientToast(
        'No se puede restaurar: falta ciclo',
        3000,
        false
      );
      return;
    }
    this.service.createGroup(payload).subscribe({
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
