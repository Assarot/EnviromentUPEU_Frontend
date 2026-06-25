import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicSpace } from '../../../core/models/academic-space';
import { CourseSpaceAssignment } from '../../../core/services/course-space-assignment.service';

@Component({
  selector: 'app-modal-seleccionar-ambiente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Overlay -->
    <div
      *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      (click)="close()"
      style="animation: fadeIn 0.2s ease"
    >
      <!-- Panel -->
      <div
        class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
        style="animation: slideUp 0.25s ease"
      >

        <!-- ── Header ── -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">
              {{ isReasignacion ? 'Reasignar Ambiente' : 'Seleccionar Ambiente' }}
            </h2>
            <p *ngIf="cursoSeleccionado" class="mt-0.5 text-xs text-slate-500">
              Curso: <span class="font-medium text-slate-700">{{ getCursoNombre() }}</span>
            </p>
          </div>
          <button
            (click)="close()"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"/>
            </svg>
          </button>
        </div>

        <!-- ── Filtros ── -->
        <div class="border-b border-slate-100 px-6 py-3">
          <div class="flex flex-wrap gap-3">
            <!-- Búsqueda -->
            <input
              type="text"
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilters()"
              placeholder="Buscar por nombre o ubicación..."
              class="flex-1 min-w-[180px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />

            <!-- Filtro tipo -->
            <div class="relative">
              <select
                [(ngModel)]="selectedTipo"
                (ngModelChange)="applyFilters()"
                class="appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Todos los tipos</option>
                <option *ngFor="let t of tiposUnicos" [value]="t">{{ t }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.11l3.71-3.88a.75.75 0 011.08 1.04l-4.25 4.44a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>

            <!-- Filtro solo disponibles -->
            <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <input
                type="checkbox"
                [(ngModel)]="soloDisponibles"
                (ngModelChange)="applyFilters()"
                class="h-4 w-4 rounded accent-lime-600"
              />
              Solo disponibles
            </label>
          </div>

          <!-- Contador de resultados -->
          <p class="mt-2 text-xs text-slate-400">
            {{ ambientesFiltrados.length }} ambiente(s) encontrado(s)
          </p>
        </div>

        <!-- ── Lista de ambientes ── -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div class="flex flex-col gap-3">

            <!-- Tarjeta de ambiente -->
            <div
              *ngFor="let a of ambientesFiltrados"
              (click)="selectAmbiente(a)"
              class="cursor-pointer rounded-xl border-2 p-4 transition-all"
              [ngClass]="selectedAmbiente?.id_academic_space === a.id_academic_space
                ? 'border-lime-400 bg-lime-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            >
              <div class="flex items-start justify-between gap-3">
                <!-- Info principal -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-semibold text-slate-800">{{ a.space_name }}</h3>
                    <!-- Badge estado -->
                    <span
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                      [ngClass]="getEstadoBadgeClass(a.state.name)"
                    >
                      {{ a.state.name }}
                    </span>
                  </div>

                  <p class="mt-0.5 text-xs text-slate-500">{{ a.type_academic_space.name }}</p>

                  <div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    <!-- Capacidad -->
                    <span class="flex items-center gap-1">
                      <svg class="h-3.5 w-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                      </svg>
                      Capacidad: <strong>{{ a.capacity }}</strong>
                    </span>

                    <!-- Ubicación -->
                    <span class="flex items-center gap-1">
                      <svg class="h-3.5 w-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                      </svg>
                      {{ a.location }}
                    </span>

                    <!-- Recursos -->
                    <span
                      class="flex items-center gap-1"
                      [ngClass]="getRecursosCount(a) > 0 ? 'text-lime-700' : 'text-red-500'"
                    >
                      <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path *ngIf="getRecursosCount(a) > 0" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        <path *ngIf="getRecursosCount(a) === 0" fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      {{ getRecursosCount(a) > 0 ? getRecursosCount(a) + ' recurso(s)' : 'Sin equipamiento' }}
                    </span>
                  </div>

                  <!-- Advertencia de aforo bajo -->
                  <p *ngIf="a.capacity < 10" class="mt-1.5 text-xs font-medium text-red-500">
                    ⚠ Aforo insuficiente (mínimo 10 personas)
                  </p>
                </div>

                <!-- Check de selección -->
                <div
                  *ngIf="selectedAmbiente?.id_academic_space === a.id_academic_space"
                  class="flex-shrink-0 text-lime-600"
                >
                  <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Sin resultados -->
            <div *ngIf="ambientesFiltrados.length === 0"
                 class="flex flex-col items-center gap-2 py-10 text-slate-400">
              <svg class="h-10 w-10" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z"/>
              </svg>
              <p class="text-sm font-medium">No se encontraron ambientes</p>
              <p class="text-xs">Prueba con otros filtros</p>
            </div>
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <!-- Info del seleccionado -->
          <p *ngIf="selectedAmbiente" class="text-xs text-slate-500">
            Seleccionado: <span class="font-semibold text-slate-700">{{ selectedAmbiente.space_name }}</span>
          </p>
          <p *ngIf="!selectedAmbiente" class="text-xs text-slate-400">
            Selecciona un ambiente para continuar
          </p>

          <div class="flex gap-3">
            <button
              (click)="close()"
              class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              (click)="confirm()"
              [disabled]="!selectedAmbiente || isSaving"
              class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-95"
              style="background-color: #BFC621;"
            >
              <svg *ngIf="isSaving" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              {{ isSaving ? 'Guardando...' : (isReasignacion ? 'Confirmar Reasignación' : 'Confirmar Asignación') }}
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Animaciones -->
    <style>
      @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
      @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    </style>
  `,
})
export class ModalSeleccionarAmbienteComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() ambientes: AcademicSpace[] = [];
  @Input() recursosMap: Map<number, number> = new Map();
  @Input() cursoSeleccionado: CourseSpaceAssignment | null = null;
  @Input() isReasignacion = false;
  @Input() isSaving = false;

  @Output() onClose   = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<AcademicSpace>();

  selectedAmbiente: AcademicSpace | null = null;
  ambientesFiltrados: AcademicSpace[]    = [];
  tiposUnicos: string[]                  = [];

  searchTerm      = '';
  selectedTipo    = '';
  soloDisponibles = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetModal();
      this.buildTiposUnicos();
      this.applyFilters();
    }
  }

  private resetModal(): void {
    this.selectedAmbiente = null;
    this.searchTerm       = '';
    this.selectedTipo     = '';
    this.soloDisponibles  = true;
  }

  private buildTiposUnicos(): void {
    const set = new Set(this.ambientes.map((a) => a.type_academic_space?.name ?? ''));
    this.tiposUnicos = [...set].filter(Boolean);
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();

    this.ambientesFiltrados = this.ambientes.filter((a) => {
      const matchSearch =
        !term ||
        a.space_name.toLowerCase().includes(term) ||
        (a.location ?? '').toLowerCase().includes(term);

      const matchTipo =
        !this.selectedTipo || a.type_academic_space?.name === this.selectedTipo;

      const matchDisponible =
        !this.soloDisponibles || a.state?.name === 'Disponible';

      return matchSearch && matchTipo && matchDisponible;
    });
  }

  selectAmbiente(a: AcademicSpace): void {
    this.selectedAmbiente = a;
  }

  close(): void {
    this.onClose.emit();
  }

  confirm(): void {
    if (this.selectedAmbiente && !this.isSaving) {
      this.onConfirm.emit(this.selectedAmbiente);
    }
  }

  getCursoNombre(): string {
    if (!this.cursoSeleccionado) return '';
    return this.cursoSeleccionado.courseAssignmentCourse.course.name;
  }

  getRecursosCount(a: AcademicSpace): number {
    return this.recursosMap.get(a.id_academic_space ?? 0) ?? 0;
  }

  getEstadoBadgeClass(estadoNombre: string | undefined): string {
    const map: Record<string, string> = {
      Disponible: 'bg-lime-100 text-lime-700',
      Ocupado:    'bg-amber-100 text-amber-700',
      Bloqueado:  'bg-red-100 text-red-700',
    };
    return map[estadoNombre ?? ''] ?? 'bg-slate-100 text-slate-600';
  }
}
