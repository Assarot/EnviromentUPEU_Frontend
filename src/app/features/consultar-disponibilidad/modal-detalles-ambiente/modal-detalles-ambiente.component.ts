import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicSpace } from '../../../core/models/academic-space';

@Component({
  selector: 'app-modal-detalles-ambiente',
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
        class="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
        (click)="$event.stopPropagation()"
        style="animation: slideUp 0.25s ease"
      >

        <!-- ── Header con imagen ── -->
        <div class="relative h-56 bg-slate-200">
          <img
            [src]="getImagenAmbiente()"
            [alt]="ambiente.space_name"
            class="h-full w-full object-cover"
          />
          <!-- Overlay gradient -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          <!-- Título sobre la imagen -->
          <div class="absolute bottom-0 left-0 right-0 p-6">
            <div class="flex items-end justify-between">
              <div>
                <span class="inline-block rounded-full px-3 py-1 text-xs font-bold text-white mb-2"
                      [ngClass]="getEstadoBadgeClass()">
                  {{ ambiente.state?.name ?? 'Desconocido' }}
                </span>
                <h2 class="text-2xl font-bold text-white">{{ ambiente.space_name }}</h2>
                <p class="mt-1 text-sm text-white/90">{{ ambiente.type_academic_space?.name }}</p>
              </div>
              <button
                (click)="close()"
                class="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30"
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Contenido ── -->
        <div class="flex-1 overflow-y-auto p-6">
          
          <!-- Grid de información principal -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- Capacidad -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-lime-100 p-2.5">
                  <svg class="h-5 w-5 text-lime-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Capacidad</p>
                  <p class="text-xl font-bold text-slate-800">{{ ambiente.capacity }} personas</p>
                </div>
              </div>
            </div>

            <!-- Ubicación -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-blue-100 p-2.5">
                  <svg class="h-5 w-5 text-blue-700" fill="currentColor" viewBox="0 0 20 20">
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
                  <svg class="h-5 w-5 text-purple-700" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Pabellón</p>
                  <p class="text-sm font-semibold text-slate-800">{{ ambiente.floor?.building?.name || 'No especificado' }}</p>
                </div>
              </div>
            </div>

            <!-- Piso -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="flex items-center gap-3">
                <div class="rounded-lg bg-amber-100 p-2.5">
                  <svg class="h-5 w-5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-medium text-slate-500">Piso</p>
                  <p class="text-sm font-semibold text-slate-800">
                    {{ ambiente.floor?.floor_number != null ? 'Piso ' + ambiente.floor.floor_number : 'No especificado' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Descripción / Observaciones -->
          <div class="mb-6">
            <h3 class="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Descripción</h3>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-sm leading-relaxed text-slate-700">
                {{ ambiente.observation || 'Sin observaciones adicionales.' }}
              </p>
            </div>
          </div>

          <!-- Estado y disponibilidad -->
          <div class="mb-6">
            <h3 class="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Estado Actual</h3>
            <div class="rounded-xl border p-4"
                 [ngClass]="isDisponible() ? 'border-lime-200 bg-lime-50' : 'border-amber-200 bg-amber-50'">
              <div class="flex items-center gap-3">
                <div class="rounded-full p-2"
                     [ngClass]="isDisponible() ? 'bg-lime-200' : 'bg-amber-200'">
                  <svg class="h-5 w-5"
                       [ngClass]="isDisponible() ? 'text-lime-700' : 'text-amber-700'"
                       fill="currentColor" viewBox="0 0 20 20">
                    <path *ngIf="isDisponible()" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    <path *ngIf="!isDisponible()" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold"
                     [ngClass]="isDisponible() ? 'text-lime-800' : 'text-amber-800'">
                    {{ isDisponible() ? 'Disponible para reservar' : 'No disponible actualmente' }}
                  </p>
                  <p class="text-xs"
                     [ngClass]="isDisponible() ? 'text-lime-600' : 'text-amber-600'">
                    Estado: {{ ambiente.state?.name ?? 'Desconocido' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Información adicional -->
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Información Adicional</h3>
            <div class="space-y-2 text-xs text-slate-600">
              <div class="flex items-center justify-between">
                <span>ID del Espacio:</span>
                <span class="font-mono font-semibold text-slate-800">{{ ambiente.id_academic_space ?? 'N/A' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Tipo de Espacio:</span>
                <span class="font-semibold text-slate-800">{{ ambiente.type_academic_space?.name ?? 'N/A' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Estado del Pabellón:</span>
                <span class="font-semibold text-slate-800">{{ ambiente.floor?.building?.is_active || 'N/A' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Estado del Piso:</span>
                <span class="font-semibold text-slate-800">{{ ambiente.floor?.is_active || 'N/A' }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- ── Footer con acciones ── -->
        <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            (click)="close()"
            class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            *ngIf="isDisponible()"
            (click)="onReservar()"
            class="rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:brightness-90"
            style="background-color: #5d6a17;"
          >
            Reservar Este Ambiente
          </button>
          <span
            *ngIf="!isDisponible()"
            class="text-sm font-medium text-slate-400"
          >
            No disponible para reservar
          </span>
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
export class ModalDetallesAmbienteComponent {
  @Input() isOpen = false;
  @Input() ambiente: AcademicSpace | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onReservarClick = new EventEmitter<AcademicSpace>();

  private readonly TIPO_IMAGES: Record<string, string> = {
    laboratorio: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    aula: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?auto=format&fit=crop&w=800&q=80',
    auditorio: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
    sala: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    taller: 'https://images.unsplash.com/photo-1565626423186-0dc065e9275b?auto=format&fit=crop&w=800&q=80',
    default: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80',
  };

  close(): void {
    this.onClose.emit();
  }

  onReservar(): void {
    if (this.ambiente && this.isDisponible()) {
      this.onReservarClick.emit(this.ambiente);
    }
  }

  isDisponible(): boolean {
    return (this.ambiente?.state?.name ?? '').toLowerCase() === 'disponible';
  }

  getImagenAmbiente(): string {
    if (!this.ambiente) return this.TIPO_IMAGES['default'];
    const tipo = (this.ambiente.type_academic_space?.name ?? '').toLowerCase();
    for (const key of Object.keys(this.TIPO_IMAGES)) {
      if (tipo.includes(key)) return this.TIPO_IMAGES[key];
    }
    return this.TIPO_IMAGES['default'];
  }

  getEstadoBadgeClass(): string {
    const map: Record<string, string> = {
      disponible: 'bg-lime-500',
      ocupado: 'bg-amber-500',
      mantenimiento: 'bg-slate-500',
    };
    const key = (this.ambiente?.state?.name ?? '').toLowerCase();
    return map[key] ?? 'bg-slate-400';
  }
}
