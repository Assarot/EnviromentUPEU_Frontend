import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BuildingService } from '../../../core/services/building.service';
import { Building } from '../../../core/models/building';
import { FloorService } from '../../../core/services/floor.service';
import { Floor } from '../../../core/models/floor';

@Component({
  selector: 'app-building',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './building.component.html',
  styleUrls: ['./building.component.css'],
})
export class BuildingComponent implements OnInit {
  private env = inject(BuildingService);
  private floorService = inject(FloorService);
  private router = inject(Router);

  buildings: Building[] = [];
  name = '';
  editingId?: number | null = null;
  editingName = '';
  editingIsActive = '';
  // para confirmar eliminación (flotante)
  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: Building | null = null;
  popupStyle: { [k: string]: string } | null = null;
  // toast
  showToast = false;
  toastMessage = '';
  private toastTimer: any = null;
  toastHasUndo = false;
  // Para gestionar pisos en esta pantalla
  selectedBuildingIdForFloors?: number | null = null;
  // Selección separada para el formulario "Crear Piso" (no debe afectar al selector de ver pisos)
  selectedBuildingIdForCreateFloor?: number | null = null;
  floorsForSelected: Floor[] = [];
  // Edición inline de pisos
  editingFloorId?: number | null = null;
  editingFloorNumber: number | null = null;
  // confirmación eliminación de piso
  pendingDeleteFloorId?: number | null = null;
  pendingDeleteFloorName = '';
  // selector para ver pabellón desde abajo
  viewBuildingId?: number | null = null;
  // toggle para mostrar/ocultar lista de buildings
  showBuildingsList = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.env.getBuildings().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.buildings = items.map(
          (it: any, idx: number) =>
            new Building(
              it.name ?? '—',
              it.is_active ?? 'A',
              it.id ?? it.id_building ?? idx + 1
            )
        );
      },
      error: () => {
        this.buildings = [];
      },
    });
  }

  // Cargar pisos para el pabellón seleccionado
  loadFloorsForBuilding(id?: number | null): void {
    if (id == null) {
      this.floorsForSelected = [];
      return;
    }
    this.env.getFloorByBuilding(Number(id)).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        const b = this.buildings.find((x) => x.id_building === Number(id));
        this.floorsForSelected = items
          .map((it: any, idx: number) => {
            const id_floor = it.id ?? it.id_floor ?? idx + 1;
            const floor_number = Number(it.floor_number ?? 0);
            const buildingObj =
              b ??
              new Building(
                it.building?.name ?? '',
                it.building?.is_active ?? 'A',
                it.building?.id_building ?? Number(id)
              );
            return new Floor(
              floor_number,
              it.is_active ?? 'A',
              buildingObj,
              id_floor
            );
          })
          .sort((a: Floor, b: Floor) => a.floor_number - b.floor_number);
      },
      error: () => {
        this.floorsForSelected = [];
      },
    });
  }

  removeLastFloor(): void {
    if (!this.selectedBuildingIdForFloors || this.floorsForSelected.length === 0)
      return;

    const lastFloor = this.floorsForSelected.reduce((prev, current) =>
      Number(current.floor_number ?? 0) > Number(prev.floor_number ?? 0)
        ? current
        : prev
    );

    if (!lastFloor?.id_floor) return;

    this.floorService.deleteFloor(lastFloor.id_floor).subscribe({
      next: () => {
        this.loadFloorsForBuilding(this.selectedBuildingIdForFloors);
        this.showTransientToast(
          `Piso ${lastFloor.floor_number} eliminado`,
          5000,
          true
        );
      },
      error: () => {
        this.showTransientToast('Error al eliminar piso', 3000, false);
      },
    });
  }

  onViewBuildingChange(id?: number | null): void {
    this.viewBuildingId = id ?? null;
    // también sincronizamos la vista de pisos con el pabellón elegido
    this.selectedBuildingIdForFloors = id ?? null;
    this.loadFloorsForBuilding(id ?? null);
  }

  // Edición inline de pisos
  editFloors(f: Floor): void {
    this.editingFloorId = f.id_floor ?? null;
    this.editingFloorNumber = f.floor_number;
  }

  cancelFloorEdit(): void {
    this.editingFloorId = null;
    this.editingFloorNumber = null;
  }

  saveFloor(): void {
    if (!this.editingFloorId) return;
    const n = Number(this.editingFloorNumber ?? 0);
    if (!n && n !== 0) return;
    // buscar el piso actual para obtener id_building e is_active
    const current = this.floorsForSelected.find(
      (fl) => fl.id_floor === this.editingFloorId
    );
    const id_building = current
      ? current.building.id_building
      : this.selectedBuildingIdForFloors ??
        this.selectedBuildingIdForCreateFloor ??
        0;
    const is_active = current ? current.is_active : 'A';
    this.floorService
      .updateFloor(this.editingFloorId, {
        floor_number: n,
        id_building: Number(id_building),
        is_active,
      })
      .subscribe({
        next: () => {
          this.cancelFloorEdit();
          // recargar
          this.loadFloorsForBuilding(this.selectedBuildingIdForFloors ?? null);
        },
        error: () => {},
      });
  }

  get viewBuildingName(): string {
    if (this.viewBuildingId == null) return '';
    return (
      this.buildings.find((b) => b.id_building === this.viewBuildingId)?.name ??
      ''
    );
  }

  private getNextFloorNumberForBuilding(floors: Floor[]): number {
    const numbers = floors
      .map((fl) => Number(fl.floor_number ?? 0))
      .filter((n) => !isNaN(n) && n > 0);
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  }

  createFloorForBuilding(): void {
    if (this.selectedBuildingIdForCreateFloor == null) return;
    const buildingId = Number(this.selectedBuildingIdForCreateFloor);

    const createFloor = (floorNumber: number): void => {
      this.floorService
        .createFloor({
          floor_number: floorNumber,
          id_building: buildingId,
          is_active: 'A',
        })
        .subscribe({
          next: () => {
            // Si el usuario está viendo la lista de pisos del pabellón creado, recargarla
            if (
              this.selectedBuildingIdForFloors ===
              this.selectedBuildingIdForCreateFloor
            ) {
              this.loadFloorsForBuilding(this.selectedBuildingIdForFloors);
            }
          },
          error: () => {},
        });
    };

    if (
      this.selectedBuildingIdForFloors === buildingId &&
      this.floorsForSelected.length > 0
    ) {
      createFloor(this.getNextFloorNumberForBuilding(this.floorsForSelected));
    } else {
      this.env.getFloorByBuilding(buildingId).subscribe({
        next: (res: any) => {
          const items = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];
          const floors = items.map(
            (it: any) =>
              new Floor(
                Number(it.floor_number ?? 0),
                it.is_active ?? 'A',
                new Building(
                  it.building?.name ?? '',
                  it.building?.is_active ?? 'A',
                  it.building?.id_building ?? buildingId
                ),
                it.id ?? it.id_floor
              )
          );
          createFloor(this.getNextFloorNumberForBuilding(floors));
        },
        error: () => {},
      });
    }
  }

  create(): void {
    const n = this.name.trim();
    if (!n) return;
    this.env.createBuilding({ name: n, is_active: 'A' }).subscribe({
      next: () => {
        this.name = '';
        this.load();
      },
      error: () => {},
    });
  }

  edit(b: Building): void {
    this.editingId = b.id_building;
    this.editingName = b.name;
    this.editingIsActive = b.is_active;
  }

  cancel(): void {
    this.editingId = null;
    this.editingName = '';
  }

  /** Alterna is_active para un pabellón y guarda en backend */
  toggleBuildingActive(b: Building): void {
    if (!b || b.id_building == null) return;
    const newStatus = b.is_active === 'A' ? 'I' : 'A';
    this.env
      .updateBuilding(b.id_building, { name: b.name, is_active: newStatus })
      .subscribe({
        next: () => {
          b.is_active = newStatus;
          // No mostrar toast para acciones de edición; solo mostrar notificaciones en eliminación según petición
        },
        error: () => {},
      });
  }

  toggleFloorActive(f: Floor): void {
    if (!f || f.id_floor == null) return;
    const newStatus = f.is_active === 'A' ? 'I' : 'A';
    this.floorService
      .updateFloor(f.id_floor, {
        floor_number: f.floor_number,
        id_building: f.building.id_building ?? 0,
        is_active: newStatus,
      })
      .subscribe({
        next: () => {
          f.is_active = newStatus;
          // No mostrar toast para acciones de edición; solo mostrar notificaciones en eliminación según petición
        },
        error: () => {},
      });
  }

  estadoChipClasses(is_active: string): string {
    return is_active === 'A'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-200 text-gray-700';
  }

  save(): void {
    if (this.editingId == null) return;
    const n = this.editingName.trim();
    if (!n) return;
    // preservar is_active actual si existe
    const current = this.buildings.find(
      (st) => st.id_building === this.editingId
    );
    const is_active = current ? current.is_active : this.editingIsActive || 'A';
    this.env.updateBuilding(this.editingId, { name: n, is_active }).subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: () => {},
    });
  }

  // confirmación flotante
  confirmRemove(b: Building, ev?: MouseEvent): void {
    this.pendingDeleteId = b.id_building ?? null;
    this.pendingDeleteName = b.name;
    this.lastDeleted = new Building(b.name, b.is_active, b.id_building);
    try {
      const btn = ev?.currentTarget as HTMLElement | undefined;
      const rect = btn ? btn.getBoundingClientRect() : undefined;
      const popupW = 280;
      const popupH = 96;
      let top: number;
      let left: number;
      if (rect) {
        if (rect.top > popupH + 20) top = rect.top - popupH - 8;
        else top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - popupW / 2;
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

  performDeleteConfirmed(): void {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.env.deleteBuilding(id).subscribe({
      next: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.popupStyle = null;
        this.load();
        this.showTransientToast('Eliminado correctamente', 5000, true);
      },
      error: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.popupStyle = null;
        this.showTransientToast('Error al eliminar', 3000, false);
      },
    });
  }

  // Confirmación para eliminar piso
  confirmRemoveFloor(f: Floor, ev?: MouseEvent): void {
    this.pendingDeleteFloorId = f.id_floor ?? null;
    this.pendingDeleteFloorName = `Piso ${f.floor_number}`;
    // calcular misma posición que para edificios
    try {
      const btn = ev?.currentTarget as HTMLElement | undefined;
      const rect = btn ? btn.getBoundingClientRect() : undefined;
      const popupW = 280;
      const popupH = 96;
      let top: number;
      let left: number;
      if (rect) {
        if (rect.top > popupH + 20) top = rect.top - popupH - 8;
        else top = rect.bottom + 8;
        left = rect.left + rect.width / 2 - popupW / 2;
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

  performDeleteFloorConfirmed(): void {
    if (!this.pendingDeleteFloorId) return;
    const id = this.pendingDeleteFloorId;
    this.floorService.deleteFloor(id).subscribe({
      next: () => {
        this.pendingDeleteFloorId = null;
        this.pendingDeleteFloorName = '';
        this.popupStyle = null;
        // recargar lista de pisos
        this.loadFloorsForBuilding(this.selectedBuildingIdForFloors ?? null);
        this.showTransientToast('Piso eliminado', 5000, true);
      },
      error: () => {
        this.pendingDeleteFloorId = null;
        this.pendingDeleteFloorName = '';
        this.popupStyle = null;
        this.showTransientToast('Error al eliminar piso', 3000, false);
      },
    });
  }

  cancelRemove(): void {
    // limpia tanto pending de building como de floor
    this.pendingDeleteId = null;
    this.pendingDeleteName = '';
    this.pendingDeleteFloorId = null;
    this.pendingDeleteFloorName = '';
    this.popupStyle = null;
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
    const payload = {
      name: this.lastDeleted.name,
      is_active: this.lastDeleted.is_active,
    };
    this.env.createBuilding(payload).subscribe({
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
    this.router.navigate(['/main/env-creation']);
  }
}
