import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { FacultyService } from '../../../core/services/faculty.service';
import { ProfessionalSchoolService } from '../../../core/services/professional-school.service';
import { BuildingService } from '../../../core/services/building.service';

import { Faculty } from '../../../core/models/faculty';
import { ProfessionalSchool } from '../../../core/models/professional-school';
import { Building } from '../../../core/models/building';

export interface AsignacionAutomaticaConfig {
  facultad: Faculty;
  carrera: ProfessionalSchool;
  pabellones: Building[];   // uno o más pabellones seleccionados
}

@Component({
  selector: 'app-modal-asignacion-automatica',
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
        class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
        style="animation: slideUp 0.25s ease"
      >

        <!-- ── Header ── -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">⚡ Asignación Automática Inteligente</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Selecciona facultad, carrera y los pabellones donde se asignarán los ambientes
            </p>
          </div>
          <button
            (click)="close()"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Cerrar"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- ── Body ── -->
        <div class="flex-1 overflow-y-auto p-6">

          <!-- Estado de carga -->
          <div *ngIf="isLoading" class="flex items-center justify-center py-12">
            <div class="flex flex-col items-center gap-3 text-slate-400">
              <svg class="h-8 w-8 animate-spin" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <p class="text-sm">Cargando datos...</p>
            </div>
          </div>
          <!-- Formulario -->
          <div *ngIf="!isLoading" class="space-y-5">

            <!-- ── Facultad ── -->
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-[#BFC621]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                  Facultad
                </span>
              </label>
              <div class="relative">
                <select
                  [(ngModel)]="selectedFacultadId"
                  (ngModelChange)="onFacultadChange()"
                  class="w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                  [disabled]="facultades.length === 0"
                >
                  <option value="">Selecciona una facultad</option>
                  <option *ngFor="let f of facultades" [value]="f.idFaculty">{{ f.name }}</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.11l3.71-3.88a.75.75 0 011.08 1.04l-4.25 4.44a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
              <p *ngIf="facultades.length === 0" class="mt-1 text-xs text-amber-600">No hay facultades disponibles</p>
            </div>

            <!-- ── Carrera ── -->
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-[#BFC621]" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/>
                    <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                  </svg>
                  Carrera / Escuela Profesional
                </span>
              </label>
              <div class="relative">
                <select
                  [(ngModel)]="selectedCarreraId"
                  class="w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#BFC621] focus:ring-2 focus:ring-[#BFC621]/20"
                  [disabled]="!selectedFacultadId || carrerasFiltradas.length === 0"
                >
                  <option value="">Selecciona una carrera</option>
                  <option *ngFor="let c of carrerasFiltradas" [value]="c.idProfessionalSchool">{{ c.name }}</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.11l3.71-3.88a.75.75 0 011.08 1.04l-4.25 4.44a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
              <p *ngIf="!selectedFacultadId" class="mt-1 text-xs text-slate-500">Primero selecciona una facultad</p>
              <p *ngIf="selectedFacultadId && carrerasFiltradas.length === 0" class="mt-1 text-xs text-amber-600">No hay carreras para esta facultad</p>
            </div>
            <!-- ── Pabellones (checkboxes) ── -->
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">
                <span class="flex items-center gap-2">
                  <svg class="h-4 w-4 text-[#BFC621]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline stroke-linecap="round" stroke-linejoin="round" points="9,22 9,12 15,12 15,22"/>
                  </svg>
                  Pabellones donde asignar
                  <span class="ml-auto text-xs font-normal text-slate-400">({{ selectedPabellonIds.length }} seleccionado(s))</span>
                </span>
              </label>

              <div *ngIf="pabellones.length === 0" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                No hay pabellones disponibles en el sistema
              </div>

              <div *ngIf="pabellones.length > 0" class="grid grid-cols-2 gap-2">
                <label
                  *ngFor="let p of pabellones"
                  class="flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all"
                  [class.border-[#BFC621]]="isPabellonSelected(p)"
                  [class.bg-lime-50]="isPabellonSelected(p)"
                  [class.border-slate-200]="!isPabellonSelected(p)"
                  [class.bg-white]="!isPabellonSelected(p)"
                >
                  <input
                    type="checkbox"
                    [checked]="isPabellonSelected(p)"
                    (change)="togglePabellon(p)"
                    class="h-4 w-4 rounded accent-[#BFC621]"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{{ p.name }}</p>
                    <p class="text-xs text-slate-400">Pabellón</p>
                  </div>
                  <svg *ngIf="isPabellonSelected(p)" class="h-4 w-4 shrink-0 text-[#BFC621]" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                </label>
              </div>
            </div>

            <!-- ── Info de reglas ── -->
            <div class="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div class="flex items-start gap-3">
                <svg class="h-5 w-5 shrink-0 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div class="flex-1">
                  <p class="text-xs font-bold text-blue-800 mb-1">Reglas de Asignación:</p>
                  <ul class="space-y-1 text-xs text-blue-700">
                    <li>• <strong>Sistemas / Software:</strong> Laboratorios de Cómputo</li>
                    <li>• <strong>Arquitectura / Civil:</strong> Talleres</li>
                    <li>• <strong>Otras carreras:</strong> Aulas disponibles</li>
                    <li>• Solo se usarán ambientes de los pabellones seleccionados</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
        <!-- ── Footer ── -->
        <div class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            (click)="close()"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            (click)="confirmar()"
            [disabled]="!isFormValid()"
            class="rounded-lg px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:brightness-95 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style="background-color: #BFC621;"
          >
            <span class="flex items-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Iniciar Asignación Automática
            </span>
          </button>
        </div>

      </div>
    </div>

    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>
  `,
  styles: [],
})
export class ModalAsignacionAutomaticaComponent implements OnInit {
  @Input() isOpen = false;
  @Output() onClose  = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<AsignacionAutomaticaConfig>();

  private facultyService            = inject(FacultyService);
  private professionalSchoolService = inject(ProfessionalSchoolService);
  private buildingService           = inject(BuildingService);

  facultades: Faculty[]            = [];
  carreras: ProfessionalSchool[]   = [];
  pabellones: Building[]           = [];
  carrerasFiltradas: ProfessionalSchool[] = [];

  selectedFacultadId: number | string = '';
  selectedCarreraId:  number | string = '';
  selectedPabellonIds: number[]       = [];   // IDs de pabellones marcados

  isLoading = false;
  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    forkJoin({
      facultades: this.facultyService.getFaculties(),
      carreras:   this.professionalSchoolService.getProfessionalSchools(),
      pabellones: this.buildingService.getBuildings(),
    }).subscribe({
      next: ({ facultades, carreras, pabellones }) => {
        this.facultades  = facultades  ?? [];
        this.carreras    = carreras    ?? [];
        this.pabellones  = pabellones  ?? [];
        this.isLoading   = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  onFacultadChange(): void {
    this.selectedCarreraId = '';
    this.carrerasFiltradas = !this.selectedFacultadId ? [] :
      this.carreras.filter(c => c.faculty?.idFaculty === Number(this.selectedFacultadId));
  }

  isPabellonSelected(p: Building): boolean {
    return this.selectedPabellonIds.includes(p.id_building!);
  }

  togglePabellon(p: Building): void {
    const id = p.id_building!;
    if (this.isPabellonSelected(p)) {
      this.selectedPabellonIds = this.selectedPabellonIds.filter(x => x !== id);
    } else {
      this.selectedPabellonIds = [...this.selectedPabellonIds, id];
    }
  }

  isFormValid(): boolean {
    return !!(this.selectedFacultadId && this.selectedCarreraId && this.selectedPabellonIds.length > 0);
  }

  confirmar(): void {
    if (!this.isFormValid()) return;

    const facultad = this.facultades.find(f => f.idFaculty === Number(this.selectedFacultadId))!;
    const carrera  = this.carreras.find(c => c.idProfessionalSchool === Number(this.selectedCarreraId))!;
    const pabellones = this.pabellones.filter(p => this.selectedPabellonIds.includes(p.id_building!));

    this.onConfirm.emit({ facultad, carrera, pabellones });
  }

  close(): void {
    this.onClose.emit();
  }
}