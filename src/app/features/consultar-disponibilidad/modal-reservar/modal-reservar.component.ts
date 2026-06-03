import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicSpace } from '../../../core/models/academic-space';

export interface ReservationRequest {
  ambiente: AcademicSpace;
  solicitante: string;
  motivo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  observaciones: string;
}

@Component({
  selector: 'app-modal-reservar',
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
            <p class="mt-0.5 text-sm text-slate-500">
              {{ ambiente.space_name }} • Cap. {{ ambiente.capacity }}
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

        <!-- ── Formulario ── -->
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <form #reservaForm="ngForm" class="flex flex-col gap-5">
            
            <!-- Solicitante -->
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-slate-700">
                Nombre del solicitante <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="formData.solicitante"
                name="solicitante"
                required
                placeholder="Ej: Juan Pérez García"
                class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <!-- Motivo -->
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-slate-700">
                Motivo de la reserva <span class="text-red-500">*</span>
              </label>
              <select
                [(ngModel)]="formData.motivo"
                name="motivo"
                required
                class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Selecciona un motivo</option>
                <option value="Clase">Clase</option>
                <option value="Examen">Examen</option>
                <option value="Reunión">Reunión</option>
                <option value="Taller">Taller</option>
                <option value="Conferencia">Conferencia</option>
                <option value="Evento">Evento</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <!-- Fecha -->
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-slate-700">
                Fecha <span class="text-red-500">*</span>
              </label>
              <input
                type="date"
                [(ngModel)]="formData.fecha"
                name="fecha"
                required
                [min]="minDate"
                class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <!-- Horario -->
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-semibold text-slate-700">
                  Hora inicio <span class="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  [(ngModel)]="formData.horaInicio"
                  name="horaInicio"
                  required
                  class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-semibold text-slate-700">
                  Hora fin <span class="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  [(ngModel)]="formData.horaFin"
                  name="horaFin"
                  required
                  class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <!-- Observaciones -->
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-slate-700">
                Observaciones (opcional)
              </label>
              <textarea
                [(ngModel)]="formData.observaciones"
                name="observaciones"
                rows="3"
                placeholder="Información adicional sobre la reserva..."
                class="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              ></textarea>
            </div>

            <!-- Advertencia de validación -->
            <div *ngIf="showValidationWarning" class="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div class="flex gap-3">
                <svg class="h-5 w-5 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div class="text-sm text-amber-800">
                  <p class="font-medium">Completa todos los campos requeridos</p>
                  <p class="mt-1 text-amber-700">Por favor, llena todos los campos marcados con (*) antes de enviar la solicitud.</p>
                </div>
              </div>
            </div>

            <!-- Info -->
            <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div class="flex gap-3">
                <svg class="h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div class="text-sm text-blue-800">
                  <p class="font-medium">Solicitud de reserva</p>
                  <p class="mt-1 text-blue-700">
                    Tu solicitud será enviada para aprobación. Recibirás una confirmación una vez que sea procesada.
                  </p>
                </div>
              </div>
            </div>

          </form>
        </div>

        <!-- ── Footer ── -->
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            (click)="close()"
            [disabled]="isSubmitting"
            class="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            (click)="submit()"
            [disabled]="!isFormValid() || isSubmitting"
            class="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-95"
            style="background-color: #BFC621;"
          >
            <svg *ngIf="isSubmitting" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {{ isSubmitting ? 'Enviando...' : 'Enviar Solicitud' }}
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
export class ModalReservarComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() ambiente: AcademicSpace | null = null;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<ReservationRequest>();

  formData = {
    solicitante: '',
    motivo: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    observaciones: '',
  };

  isSubmitting = false;
  showValidationWarning = false;
  minDate = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetForm();
      this.setMinDate();
    }
  }

  private resetForm(): void {
    this.formData = {
      solicitante: '',
      motivo: '',
      fecha: '',
      horaInicio: '',
      horaFin: '',
      observaciones: '',
    };
    this.showValidationWarning = false;
    this.isSubmitting = false;
  }

  private setMinDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}`;
  }

  isFormValid(): boolean {
    return !!(
      this.formData.solicitante.trim() &&
      this.formData.motivo &&
      this.formData.fecha &&
      this.formData.horaInicio &&
      this.formData.horaFin &&
      this.formData.horaInicio < this.formData.horaFin
    );
  }

  close(): void {
    if (!this.isSubmitting) {
      this.onClose.emit();
    }
  }

  submit(): void {
    if (!this.isFormValid()) {
      this.showValidationWarning = true;
      return;
    }

    if (!this.ambiente) return;

    this.isSubmitting = true;
    this.showValidationWarning = false;

    const request: ReservationRequest = {
      ambiente: this.ambiente,
      solicitante: this.formData.solicitante.trim(),
      motivo: this.formData.motivo,
      fecha: this.formData.fecha,
      horaInicio: this.formData.horaInicio,
      horaFin: this.formData.horaFin,
      observaciones: this.formData.observaciones.trim(),
    };

    this.onSubmit.emit(request);
  }
}
