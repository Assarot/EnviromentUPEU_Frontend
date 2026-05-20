import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TypeAcademicSpace } from '../../../core/models/type-academic-space';
import { TypeAcademicSpaceService } from '../../../core/services/type-academic-space.service';

@Component({
  selector: 'app-type-env',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-env.component.html',
  styleUrls: ['./type-env.component.css'],
})
export class TypeEnvComponent implements OnInit {
  constructor(private router: Router) {}

  nuevoNombre = '';
  editandoId?: number | null = null;
  editingName = '';
  search = '';

  // para confirmar eliminación
  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: TypeAcademicSpace | null = null;
  popupStyle: { [k: string]: string } | null = null;

  // toast
  showToast = false;
  toastMessage = '';
  private toastTimer: any = null;
  toastHasUndo = false;

  private env = inject(TypeAcademicSpaceService);

  tipos: TypeAcademicSpace[] = [];

  ngOnInit(): void {
    this.cargarTipos();
  }

  private cargarTipos(): void {
    this.env.getTypeAcademicSpaces().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.tipos = items.map(
          (it: any, idx: number) =>
            new TypeAcademicSpace(
              it.name ?? it.nombre ?? '—',
              it.is_active ?? it.activo ?? 'A',
              it.id ?? it.id_type ?? idx + 1
            )
        );
      },
      error: () => {
        this.tipos = [];
      },
    });
  }

  get tiposFiltrados(): TypeAcademicSpace[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.tipos;
    return this.tipos.filter((t) => t.name.toLowerCase().includes(q));
  }

  crearOActualizar(): void {
    const nombre = this.nuevoNombre.trim();
    if (!nombre) return;

    this.env
      .createTypeAcademicSpace({ name: nombre, is_active: 'A' })
      .subscribe({
        next: () => {
          this.cargarTipos();
          this.resetForm();
          this.showTransientToast(
            'Tipo de ambiente creado correctamente',
            3000,
            false
          );
        },
        error: () => {
          this.showTransientToast(
            'Error al crear tipo de ambiente',
            3000,
            false
          );
        },
      });
  }

  toggleEstado(t: TypeAcademicSpace): void {
    if (!t || t.id_type_academic_space == null) return;
    const newStatus = t.is_active === 'A' ? 'I' : 'A';

    this.env
      .updateTypeAcademicSpace(t.id_type_academic_space, {
        name: t.name,
        is_active: newStatus,
      })
      .subscribe({
        next: () => {
          t.is_active = newStatus;
          this.showTransientToast(
            `Estado cambiado a ${newStatus === 'A' ? 'Activo' : 'Inactivo'}`,
            3000,
            false
          );
        },
        error: () => {
          this.showTransientToast('Error al cambiar el estado', 3000, false);
        },
      });
  }

  editar(t: TypeAcademicSpace): void {
    this.editandoId = t.id_type_academic_space;
    this.editingName = t.name;
  }

  save(): void {
    if (this.editandoId == null) return;
    const nombre = this.editingName.trim();
    if (!nombre) return;

    const tipo = this.tipos.find(
      (t) => t.id_type_academic_space === this.editandoId
    );
    if (!tipo) return;

    this.env
      .updateTypeAcademicSpace(this.editandoId, {
        name: nombre,
        is_active: tipo.is_active,
      })
      .subscribe({
        next: () => {
          this.cargarTipos();
          this.resetForm();
          this.showTransientToast(
            'Cambios guardados correctamente',
            3000,
            false
          );
        },
        error: () => {
          this.showTransientToast('Error al guardar los cambios', 3000, false);
        },
      });
  }

  cancelarEdicion(): void {
    this.resetForm();
  }

  eliminar(t: TypeAcademicSpace): void {
    const ok = confirm(`¿Eliminar "${t.name}"?`);
    if (!ok) return;
    this.env.deleteTypeAcademicSpace(t.id_type_academic_space).subscribe({
      next: () => this.cargarTipos(),
      error: () => {},
    });
  }

  estadoChipClasses(is_active: string): string {
    return is_active === 'A'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-200 text-gray-700';
  }

  private resetForm(): void {
    this.nuevoNombre = '';
    this.editandoId = null;
    this.editingName = '';
  }

  trackById = (_: number, item: TypeAcademicSpace) =>
    item.id_type_academic_space;

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
      if (this.toastTimer == null) {
        this.lastDeleted = null;
      }
      this.toastTimer = null;
    }, ms);
  }

  confirmRemove(t: TypeAcademicSpace, ev?: MouseEvent): void {
    this.pendingDeleteId = t.id_type_academic_space ?? null;
    this.pendingDeleteName = t.name;
    this.lastDeleted = new TypeAcademicSpace(
      t.name,
      t.is_active,
      t.id_type_academic_space
    );

    try {
      const btn = ev?.currentTarget as HTMLElement | undefined;
      const rect = btn ? btn.getBoundingClientRect() : undefined;
      const popupW = 224;
      const popupH = 96;
      let top: number;
      let left: number;
      if (rect) {
        // posicionar cerca del botón que se clickeó
        const viewportH = window.innerHeight;
        top = rect.top + rect.height + 8;
        left = rect.left - popupW / 2;
        // ajustar si se sale de la pantalla
        if (top + popupH > viewportH) {
          top = rect.top - popupH - 8;
        }
      } else {
        // fallback al centro de la pantalla
        top = window.innerHeight / 2 - popupH / 2;
        left = window.innerWidth / 2 - popupW / 2;
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
    this.env.deleteTypeAcademicSpace(id).subscribe({
      next: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.cargarTipos();
        this.showTransientToast('Eliminado correctamente', 5000, true);
      },
      error: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.showTransientToast('Error al eliminar', 3000, false);
      },
    });
  }

  undoDelete(): void {
    if (!this.lastDeleted) return;
    const payload = {
      name: this.lastDeleted.name,
      is_active: this.lastDeleted.is_active,
    };
    this.env.createTypeAcademicSpace(payload).subscribe({
      next: () => {
        this.cargarTipos();
        this.showTransientToast('Restaurado', 3000, false);
        this.lastDeleted = null;
      },
      error: () => {
        this.showTransientToast('Error al restaurar', 3000, false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/main/env-creation']);
  }
}
