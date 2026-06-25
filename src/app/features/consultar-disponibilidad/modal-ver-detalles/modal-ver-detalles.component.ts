import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicSpace } from '../../../core/models/academic-space';

@Component({
  selector: 'app-modal-ver-detalles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Overlay -->
    <div
      *ngIf="isOpen && ambiente"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      (click)="close()"
      style="animation: fadeIn 0.2s ease"
    >
      <!-- Panel -->
      <div
        class="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
        style="animation: slideUp 0.25s ease"
      >
        <!-- ── Header ── -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 class="text-xl font-bold text-slate-800">{{ ambiente.space_name }}</h2>
            <p class="mt-0.5 text-sm text-slate-500">
              {{ ambiente.type_academic_space.name }}
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

        <!-- ── Contenido ── -->
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <!-- Imagen del ambiente -->
          <div class="mb-6 overflow-hidden rounded-xl">
            <img
              [src]="imagenUrl"
              [alt]="ambiente.space_name"
              class="h-64 w-full object-cover"
            />
          </div>

          <!-- Estado -->
          <div class="mb-6">
            <div class="flex items-center gap-3">
              <span
                class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                [ngClass]="getEstadoBadgeClass()"
              >
                <span
                  class="h-2 w-2 rounded-full"
                  [style.background-color]="getEstadoDotColor()"
                ></span>
                {{ ambiente.state.name }}
              </span>
            </div>
          </div>

          <!-- Grid de información -->
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Capacidad -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-blue-100 p-2.5">
                  <svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Capacidad</p>
                  <p class="text-lg font-bold text-slate-800">{{ ambiente.capacity }} personas</p>
                </div>
              </div>
            </div>

            <!-- Ubicación -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-green-100 p-2.5">
                  <svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Ubicación</p>
                  <p class="text-sm font-semibold text-slate-800">{{ ambiente.location || 'No especificada' }}</p>
                </div>
              </div>
            </div>

            <!-- Pabellón -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-purple-100 p-2.5">
                  <svg class="h-5 w-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Pabellón</p>
                  <p class="text-sm font-semibold text-slate-800">{{ ambiente.floor.building.name || 'No especificado' }}</p>
                </div>
              </div>
            </div>

            <!-- Piso -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-amber-100 p-2.5">
                  <svg class="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Piso</p>
                  <p class="text-sm font-semibold text-slate-800">
                    {{ ambiente.floor.floor_number != null ? 'Piso ' + ambiente.floor.floor_number : 'No especificado' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Observaciones -->
          <div *ngIf="ambiente.observation" class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <svg class="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              Observaciones
            </h3>
            <p class="text-sm text-slate-600">{{ ambiente.observation }}</p>
          </div>

          <!-- Información adicional -->
          <div class="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div class="flex gap-3">
              <svg class="h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              <div class="text-sm text-blue-800">
                <p class="font-medium">Información importante</p>
                <p class="mt-1 text-blue-700">
                  Para reservar este ambiente, verifica la disponibilidad horaria y confirma que cumple con los requisitos de tu actividad.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            (click)="close()"
            class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            *ngIf="isDisponible()"
            (click)="onReservarClick()"
            class="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 hover:brightness-95"
            style="background-color: #BFC621;"
          >
            Reservar Ambiente
          </button>
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
export class ModalVerDetallesComponent {
  @Input() isOpen = false;
  @Input() ambiente: AcademicSpace | null = null;
  @Input() imagenUrl = '';

  @Output() onClose = new EventEmitter<void>();
  @Output() onReservar = new EventEmitter<AcademicSpace>();

  close(): void {
    this.onClose.emit();
  }

  onReservarClick(): void {
    if (this.ambiente) {
      this.onReservar.emit(this.ambiente);
    }
  }

  isDisponible(): boolean {
    return (this.ambiente?.state?.name ?? '').toLowerCase() === 'disponible';
  }

  getEstadoBadgeClass(): string {
    const estado = (this.ambiente?.state?.name ?? '').toLowerCase();
    const map: Record<string, string> = {
      disponible:    'bg-lime-100 text-lime-700 ring-1 ring-lime-200',
      ocupado:       'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      mantenimiento: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    };
    return map[estado] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  }

  getEstadoDotColor(): string {
    const estado = (this.ambiente?.state?.name ?? '').toLowerCase();
    const map: Record<string, string> = {
      disponible:    '#22c55e',
      ocupado:       '#f59e0b',
      mantenimiento: '#6b7280',
    };
    return map[estado] ?? '#94a3b8';
  }
}
