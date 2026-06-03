import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicSpace } from '../../../core/models/academic-space';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ResourceService } from '../../../core/services/resource.service';
import { UserProfileDTO } from '../../../core/models/user.model';
import { Resource } from '../../../core/models/resource.model';

export interface ReservationData {
  ambiente: AcademicSpace;
  fecha: string;
  fechaFin?: string; // Para reservas de múltiples días
  horaInicio: string;
  horaFin: string;
  motivo: string;
  solicitante: string;
  cantidadPersonas: number; // Nuevo campo según diagrama
  equipamientoRequerido?: string; // Opcional
  id_user_profile?: number; // ID del solicitante real
  members?: number[];       // IDs de los acompañantes/miembros de la reserva
}

@Component({
  selector: 'app-modal-reservar-ambiente',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
        style="animation: slideUp 0.25s ease"
      >

        <!-- ── Header ── -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Reservar Ambiente</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Completa los datos para solicitar la reserva
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
        <div class="flex-1 overflow-y-auto px-6 py-5">

          <!-- Información del ambiente seleccionado -->
          <div class="mb-6 rounded-xl border border-lime-200 bg-lime-50 p-4">
            <div class="flex items-start gap-4">
              <div class="rounded-lg bg-lime-200 p-2.5">
                <svg class="h-6 w-6 text-lime-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-lime-900">{{ ambiente.space_name }}</h3>
                <p class="mt-0.5 text-xs text-lime-700">
                  {{ ambiente.type_academic_space?.name }} · Capacidad: {{ ambiente.capacity }} personas
                </p>
                <p class="mt-1 text-xs text-lime-600">
                  {{ ambiente.location }} · {{ ambiente.floor?.building?.name }}
                </p>
              </div>
            </div>
          </div>

          <!-- Formulario -->
          <form class="space-y-5">

            <!-- Solicitante -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre del Solicitante *
              </label>
              <div class="relative">
                <select
                  [(ngModel)]="formData.solicitante"
                  (ngModelChange)="onSolicitanteChange($event)"
                  name="solicitante"
                  required
                  class="w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-3 pr-8 text-sm text-slate-800 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                >
                  <option value="">Seleccione un solicitante...</option>
                  <option *ngFor="let u of usuarios" [value]="u.names + ' ' + u.lastName">
                    {{ u.names }} {{ u.lastName }} ({{ u.email }})
                  </option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.11l3.71-3.88a.75.75 0 011.08 1.04l-4.25 4.44a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Fecha -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fecha de Reserva *
              </label>
              <div class="relative">
                <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <input
                  type="date"
                  [(ngModel)]="formData.fecha"
                  name="fecha"
                  [min]="minDate"
                  required
                  class="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                />
              </div>
            </div>

            <!-- Horario -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Hora inicio -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hora de Inicio *
                </label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <input
                    type="time"
                    [(ngModel)]="formData.horaInicio"
                    name="horaInicio"
                    required
                    class="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                  />
                </div>
              </div>

              <!-- Hora fin -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Hora de Fin *
                </label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <input
                    type="time"
                    [(ngModel)]="formData.horaFin"
                    name="horaFin"
                    required
                    class="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                  />
                </div>
              </div>
            </div>

            <!-- Tipo de Solicitante y Capacidad -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de Reserva *
                </label>
                <div class="flex rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    (click)="setTipoReserva('docente')"
                    class="flex-1 py-2 text-xs font-semibold transition-colors"
                    [ngClass]="tipoReserva === 'docente' ? 'bg-[#5d6a17] text-white' : 'text-slate-600 hover:bg-slate-100'"
                  >
                    Docente
                  </button>
                  <button
                    type="button"
                    (click)="setTipoReserva('estudiante')"
                    class="flex-1 py-2 text-xs font-semibold transition-colors"
                    [ngClass]="tipoReserva === 'estudiante' ? 'bg-[#5d6a17] text-white' : 'text-slate-600 hover:bg-slate-100'"
                  >
                    Estudiante
                  </button>
                </div>
              </div>

              <!-- Capacidad / Cantidad Personas -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Asistentes *
                </label>
                
                <!-- Si es Docente, herramienta de ajuste con botones +/- -->
                <div *ngIf="tipoReserva === 'docente'" class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="decrementCap()"
                    [disabled]="formData.cantidadPersonas <= 1"
                    class="rounded-lg border border-slate-300 bg-white h-10 w-10 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    [(ngModel)]="formData.cantidadPersonas"
                    (ngModelChange)="onCantidadPersonasChange($event)"
                    name="cantidadPersonas"
                    [max]="ambiente?.capacity || 999"
                    min="1"
                    class="w-16 text-center rounded-lg border border-slate-300 bg-white py-2.5 text-sm text-slate-800 font-bold outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                  />
                  <button
                    type="button"
                    (click)="incrementCap()"
                    [disabled]="formData.cantidadPersonas >= (ambiente?.capacity || 999)"
                    class="rounded-lg border border-slate-300 bg-white h-10 w-10 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <!-- Si es Estudiante, solo lectura autocalculada -->
                <div *ngIf="tipoReserva === 'estudiante'" class="relative">
                  <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                  <input
                    type="number"
                    [ngModel]="formData.cantidadPersonas"
                    name="cantidadPersonas"
                    readonly
                    class="w-full rounded-lg border border-slate-300 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-700 font-semibold outline-none"
                  />
                </div>
              </div>
            </div>

            <!-- Buscador de Estudiantes y Acompañantes si es "estudiante" -->
            <div *ngIf="tipoReserva === 'estudiante'" class="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <span class="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Acompañantes del Estudiante
              </span>

              <!-- Input de Búsqueda -->
              <div class="relative">
                <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="searchAcompananteQuery"
                  name="searchAcompanante"
                  (focus)="mostrarAcompanantesDropdown = true"
                  (ngModelChange)="filterAcompanantes()"
                  placeholder="Buscar estudiante por nombre, carrera o correo..."
                  class="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                />

                <!-- Dropdown de resultados -->
                <div
                  *ngIf="mostrarAcompanantesDropdown && acompanantesFiltrados.length > 0"
                  class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                >
                  <div
                    *ngFor="let u of acompanantesFiltrados"
                    (click)="addAcompanante(u)"
                    class="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <!-- Foto / Iniciales -->
                    <div class="h-8 w-8 rounded-full overflow-hidden bg-slate-200 shrink-0">
                      <img
                        *ngIf="u.profilePicture"
                        [src]="u.profilePicture"
                        [alt]="u.names"
                        class="h-full w-full object-cover"
                      />
                      <div *ngIf="!u.profilePicture" class="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold text-slate-500">
                        {{ u.names[0] }}{{ u.lastName[0] }}
                      </div>
                    </div>
                    <div>
                      <div class="text-xs font-bold text-slate-800">{{ u.names }} {{ u.lastName }}</div>
                      <div class="text-[10px] text-slate-500">{{ getCarreraMock(u) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Lista de acompañantes seleccionados -->
              <div *ngIf="acompanantesSeleccionados.length > 0" class="flex flex-wrap gap-2 pt-2">
                <span
                  *ngFor="let ac of acompanantesSeleccionados; let idx = index"
                  class="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-slate-300"
                >
                  <span class="h-4 w-4 rounded-full overflow-hidden bg-slate-300 shrink-0 text-[8px] flex items-center justify-center font-bold">
                    {{ ac.names[0] }}{{ ac.lastName[0] }}
                  </span>
                  {{ ac.names }} {{ ac.lastName }}
                  <button
                    type="button"
                    (click)="removeAcompanante(idx)"
                    class="text-slate-450 hover:text-red-500 font-bold ml-1 text-[10px] leading-none shrink-0"
                  >
                    ✕
                  </button>
                </span>
              </div>

              <!-- Nota informativa de límite -->
              <p class="text-[11px] text-slate-500">
                Capacidad máxima del ambiente: <strong>{{ ambiente?.capacity }} personas</strong>. Total actual: <strong>{{ formData.cantidadPersonas }}</strong>.
              </p>
            </div>

            <!-- Equipamiento de Inventario Real conectado con Inventory Service -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Equipamiento Requerido (Inventario)
              </label>
              
              <div *ngIf="cargandoInventario" class="flex items-center justify-center py-4 text-slate-400 text-xs">
                <svg class="h-4 w-4 animate-spin mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Cargando inventario de equipos...
              </div>

              <div *ngIf="!cargandoInventario && recursosInventario.length === 0" class="text-xs text-slate-450 italic py-2">
                No hay equipamiento disponible en el inventario.
              </div>

              <div *ngIf="!cargandoInventario && recursosInventario.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label
                  *ngFor="let res of recursosInventario"
                  class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50 cursor-pointer shadow-sm"
                >
                  <input
                    type="checkbox"
                    [checked]="isRecursoSeleccionado(res)"
                    (change)="toggleRecurso(res)"
                    class="h-4 w-4 rounded border-slate-300 text-[#5d6a17] focus:ring-[#5d6a17]"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-slate-800 truncate">{{ res.resourceType?.name || 'Recurso' }}</div>
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-550">
                      <span>Cód: {{ res.code }}</span>
                      <span>•</span>
                      <span [ngClass]="(res.stock || 0) > 0 ? 'text-green-600 font-semibold' : 'text-red-500'">Stock: {{ res.stock || 0 }}</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Motivo -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Motivo de la Reserva *
              </label>
              <textarea
                [(ngModel)]="formData.motivo"
                name="motivo"
                rows="3"
                placeholder="Describe brevemente el motivo de tu reserva (ej: clase de programación, reunión de proyecto, taller, etc.)"
                required
                class="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20 resize-none"
              ></textarea>
            </div>

            <!-- Validación de errores -->
            <div *ngIf="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3">
              <div class="flex items-start gap-2">
                <svg class="h-5 w-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <p class="text-xs font-medium text-red-700">{{ errorMessage }}</p>
              </div>
            </div>

            <!-- Nota informativa -->
            <div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div class="flex items-start gap-2">
                <svg class="h-5 w-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <p class="text-xs text-blue-700">
                  Tu solicitud será revisada por el área de gestión de ambientes. Recibirás una confirmación por correo electrónico.
                </p>
              </div>
            </div>

          </form>

        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            (click)="close()"
            [disabled]="isSubmitting"
            class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            (click)="submitReservation()"
            [disabled]="!isFormValid() || isSubmitting"
            class="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-95"
            style="background-color: #BFC621;"
          >
            <svg *ngIf="isSubmitting" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ isSubmitting ? 'Enviando...' : 'Confirmar Reserva' }}
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
export class ModalReservarAmbienteComponent implements OnChanges {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private resourceService = inject(ResourceService);

  @Input() isOpen = false;
  @Input() ambiente: AcademicSpace | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<ReservationData>();

  formData = {
    solicitante: '',
    fecha: '',
    fechaFin: '',
    horaInicio: '',
    horaFin: '',
    motivo: '',
    cantidadPersonas: 1,
    equipamientoRequerido: '',
  };

  // Listado de usuarios
  usuarios: UserProfileDTO[] = [];
  recursosInventario: Resource[] = [];
  cargandoInventario = false;

  // Selección de Estudiantes
  tipoReserva: 'docente' | 'estudiante' = 'docente';
  searchAcompananteQuery = '';
  mostrarAcompanantesDropdown = false;
  acompanantesFiltrados: UserProfileDTO[] = [];
  acompanantesSeleccionados: UserProfileDTO[] = [];

  // Equipamiento seleccionado
  recursosSeleccionados: Resource[] = [];

  isSubmitting = false;
  errorMessage = '';
  minDate = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetForm();
      this.setMinDate();
      this.loadFormOptions();
    }
  }

  private resetForm(): void {
    this.formData = {
      solicitante: '',
      fecha: '',
      fechaFin: '',
      horaInicio: '',
      horaFin: '',
      motivo: '',
      cantidadPersonas: 1,
      equipamientoRequerido: '',
    };
    this.tipoReserva = 'docente';
    this.searchAcompananteQuery = '';
    this.mostrarAcompanantesDropdown = false;
    this.acompanantesSeleccionados = [];
    this.recursosSeleccionados = [];
    this.errorMessage = '';
    this.isSubmitting = false;
  }

  private setMinDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}`;
  }

  private loadFormOptions(): void {
    this.cargandoInventario = true;
    
    // Obtener todos los usuarios del backend
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.usuarios = users || [];
        this.selectDefaultUser();
        this.filterAcompanantes();
      },
      error: () => {
        this.usuarios = [];
      }
    });

    // Obtener equipamiento del inventario
    this.resourceService.getResources().subscribe({
      next: (resources) => {
        // Filtrar recursos que estén en estado "Disponible" o activo
        this.recursosInventario = (resources || []).filter(
          r => r.state?.name?.toLowerCase() === 'disponible' || r.stock && r.stock > 0
        );
        this.cargandoInventario = false;
      },
      error: () => {
        this.recursosInventario = [];
        this.cargandoInventario = false;
      }
    });
  }

  private selectDefaultUser(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && this.usuarios.length > 0) {
      const match = this.usuarios.find(u => u.id === currentUser.userProfileId);
      if (match) {
        this.formData.solicitante = `${match.names} ${match.lastName}`;
      } else {
        // Fallback al nombre del objeto
        this.formData.solicitante = currentUser.username;
      }
    }
  }

  // Acompañantes y estudiantes
  getCarreraMock(user: UserProfileDTO): string {
    const careers = [
      'Ingeniería de Sistemas',
      'Medicina Humana',
      'Enfermería',
      'Contabilidad',
      'Administración de Empresas',
      'Ingeniería Civil',
      'Psicología',
      'Arquitectura'
    ];
    const index = user.id % careers.length;
    return careers[index];
  }

  setTipoReserva(tipo: 'docente' | 'estudiante'): void {
    this.tipoReserva = tipo;
    if (tipo === 'docente') {
      this.acompanantesSeleccionados = [];
      this.formData.cantidadPersonas = 1;
    } else {
      this.formData.cantidadPersonas = 1 + this.acompanantesSeleccionados.length;
    }
    this.errorMessage = '';
  }

  decrementCap(): void {
    if (this.formData.cantidadPersonas > 1) {
      this.formData.cantidadPersonas--;
    }
  }

  incrementCap(): void {
    if (this.ambiente && this.formData.cantidadPersonas < this.ambiente.capacity) {
      this.formData.cantidadPersonas++;
    }
  }

  filterAcompanantes(): void {
    const query = this.searchAcompananteQuery.toLowerCase().trim();
    this.acompanantesFiltrados = this.usuarios.filter(u => {
      const isApplicant = `${u.names} ${u.lastName}` === this.formData.solicitante;
      const isAlreadyCompanion = this.acompanantesSeleccionados.some(ac => ac.id === u.id);
      
      const matchesQuery = !query ||
        u.names.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);

      return !isApplicant && !isAlreadyCompanion && matchesQuery;
    });
  }

  addAcompanante(u: UserProfileDTO): void {
    if (this.ambiente && this.formData.cantidadPersonas >= this.ambiente.capacity) {
      this.errorMessage = `No puedes agregar más personas. Has alcanzado el límite de capacidad (${this.ambiente.capacity}) del ambiente.`;
      return;
    }

    this.acompanantesSeleccionados.push(u);
    this.formData.cantidadPersonas = 1 + this.acompanantesSeleccionados.length;
    this.searchAcompananteQuery = '';
    this.mostrarAcompanantesDropdown = false;
    this.errorMessage = '';
    this.filterAcompanantes();
  }

  removeAcompanante(idx: number): void {
    this.acompanantesSeleccionados.splice(idx, 1);
    this.formData.cantidadPersonas = 1 + this.acompanantesSeleccionados.length;
    this.errorMessage = '';
    this.filterAcompanantes();
  }

  onSolicitanteChange(newVal: any): void {
    // Si cambia el solicitante, recalcular lista de estudiantes elegibles para acompañamiento
    this.filterAcompanantes();
  }

  onCantidadPersonasChange(val: number): void {
    if (val === null || val === undefined || val < 1) {
      // Dejar que el usuario borre para escribir, pero validar al perder foco o al enviar
      this.errorMessage = '';
      return;
    }
    if (this.ambiente && val > this.ambiente.capacity) {
      this.formData.cantidadPersonas = this.ambiente.capacity;
      this.errorMessage = `La cantidad de asistentes se ha ajustado al límite máximo del ambiente (${this.ambiente.capacity}).`;
    } else {
      this.errorMessage = '';
    }
  }

  // Inventario
  isRecursoSeleccionado(res: Resource): boolean {
    return this.recursosSeleccionados.some(r => r.idResource === res.idResource);
  }

  toggleRecurso(res: Resource): void {
    const idx = this.recursosSeleccionados.findIndex(r => r.idResource === res.idResource);
    if (idx === -1) {
      this.recursosSeleccionados.push(res);
    } else {
      this.recursosSeleccionados.splice(idx, 1);
    }
    this.updateEquipamientoText();
  }

  private updateEquipamientoText(): void {
    if (this.recursosSeleccionados.length === 0) {
      this.formData.equipamientoRequerido = '';
    } else {
      this.formData.equipamientoRequerido = this.recursosSeleccionados
        .map(r => `${r.resourceType?.name || 'Recurso'} (${r.code})`)
        .join(', ');
    }
  }

  isFormValid(): boolean {
    return !!(
      this.formData.solicitante &&
      this.formData.fecha &&
      this.formData.horaInicio &&
      this.formData.horaFin &&
      this.formData.motivo.trim() &&
      this.formData.cantidadPersonas > 0
    );
  }

  validateForm(): boolean {
    if (!this.isFormValid()) {
      this.errorMessage = 'Por favor completa todos los campos requeridos.';
      return false;
    }

    if (this.ambiente && this.formData.cantidadPersonas > this.ambiente.capacity) {
      this.errorMessage = `La cantidad de personas (${this.formData.cantidadPersonas}) excede la capacidad del ambiente (${this.ambiente.capacity}).`;
      return false;
    }

    if (this.formData.horaInicio >= this.formData.horaFin) {
      this.errorMessage = 'La hora de fin debe ser posterior a la hora de inicio.';
      return false;
    }

    const selectedDate = new Date(this.formData.fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      this.errorMessage = 'No puedes reservar en una fecha pasada.';
      return false;
    }

    this.errorMessage = '';
    return true;
  }

  submitReservation(): void {
    if (!this.validateForm() || !this.ambiente || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    // Buscar el ID del perfil correspondiente al solicitante seleccionado
    const selectedProfile = this.usuarios.find(u => `${u.names} ${u.lastName}` === this.formData.solicitante);
    const idUserProfile = selectedProfile ? selectedProfile.id : undefined;

    // Obtener la lista de IDs de los acompañantes
    const memberIds = this.tipoReserva === 'estudiante' 
      ? this.acompanantesSeleccionados.map(ac => ac.id)
      : [];

    const reservationData: ReservationData = {
      ambiente: this.ambiente,
      fecha: this.formData.fecha,
      fechaFin: this.formData.fecha, // Fecha de fin ahora es idéntica a la de inicio
      horaInicio: this.formData.horaInicio,
      horaFin: this.formData.horaFin,
      motivo: this.formData.motivo,
      solicitante: this.formData.solicitante,
      cantidadPersonas: this.formData.cantidadPersonas,
      equipamientoRequerido: this.formData.equipamientoRequerido,
      id_user_profile: idUserProfile,
      members: memberIds
    };

    setTimeout(() => {
      this.onConfirm.emit(reservationData);
      this.isSubmitting = false;
    }, 500);
  }

  close(): void {
    if (!this.isSubmitting) {
      this.onClose.emit();
    }
  }
}
