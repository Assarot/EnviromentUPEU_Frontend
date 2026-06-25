import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { AcademicSpaceService } from '../../core/services/academic-space.service';
import { TypeAcademicSpaceService } from '../../core/services/type-academic-space.service';
import { BuildingService } from '../../core/services/building.service';
import { ToastService } from '../../core/services/toast.service';
import { ReservationService, CreateReservationRequest } from '../../core/services/reservation.service';

import { AcademicSpace } from '../../core/models/academic-space';
import { TypeAcademicSpace } from '../../core/models/type-academic-space';
import { Building } from '../../core/models/building';

import { ModalDetallesAmbienteComponent } from './modal-detalles-ambiente/modal-detalles-ambiente.component';
import { ModalReservarAmbienteComponent, ReservationData } from './modal-reservar-ambiente/modal-reservar-ambiente.component';

import { ModalVerDetallesComponent } from './modal-ver-detalles/modal-ver-detalles.component';
import { ModalReservarComponent, ReservationRequest } from './modal-reservar/modal-reservar.component';

// ─── Imágenes de placeholder por tipo de ambiente ────────────────────────────
const TIPO_IMAGES: Record<string, string> = {
  laboratorio:  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
  aula:         'https://images.unsplash.com/photo-1577412647305-991150c7d163?auto=format&fit=crop&w=600&q=80',
  auditorio:    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
  sala:         'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80',
  taller:       'https://images.unsplash.com/photo-1565626423186-0dc065e9275b?auto=format&fit=crop&w=600&q=80',
  default:      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
};

@Component({
  selector: 'app-consultar-disponibilidad',
  standalone: true,
  imports: [ 
    CommonModule,
    FormsModule,
    ModalDetallesAmbienteComponent,
    ModalReservarAmbienteComponent,
  ],
  templateUrl: './consultar-disponibilidad.component.html',
  styleUrls: ['./consultar-disponibilidad.component.css'],
})
export class ConsultarDisponibilidadComponent implements OnInit {
  private academicSpaceService    = inject(AcademicSpaceService);
  private typeAcademicSpaceService = inject(TypeAcademicSpaceService);
  private buildingService          = inject(BuildingService);
  private toastService             = inject(ToastService);
  private reservationService       = inject(ReservationService);

  // ─── Datos crudos del backend ─────────────────────────────────────────────
  todosLosAmbientes: AcademicSpace[]    = [];
  tipos: TypeAcademicSpace[]            = [];
  buildings: Building[]                 = [];

  // ─── Resultados filtrados ─────────────────────────────────────────────────
  ambientesFiltrados: AcademicSpace[]   = [];
  paginaActual                          = 0;
  readonly porPagina                    = 6;

  // ─── Estado UI ────────────────────────────────────────────────────────────
  isLoading    = false;
  errorMessage = '';
  vistaGrid    = true;   // true = grid, false = lista

  // ─── Filtros ──────────────────────────────────────────────────────────────
  searchTerm      = '';
  selectedTipoId  = '';
  selectedEstados: string[] = ['Disponible'];  // chips multi-select
  capacidadMin: number | null = null;
  capacidadMax: number | null = null;
  selectedBuildingId = '';

  readonly estadosDisponibles = ['Disponible', 'Ocupado', 'Mantenimiento'];

  // ─── Modales ──────────────────────────────────────────────────────────────
  modalDetallesOpen = false;
  modalReservarOpen = false;
  ambienteSeleccionado: AcademicSpace | null = null;

  // ─── Mis Reservas ─────────────────────────────────────────────────────────
  misReservas: ReservationData[] = [];
  mostrarMisReservas = false;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadData();
    this.loadMisReservas();
  }

  loadData(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    forkJoin({
      ambientes: this.academicSpaceService.getAcademicSpaces(),
      tipos:     this.typeAcademicSpaceService.getTypeAcademicSpaces(),
      buildings: this.buildingService.getBuildings(),
    }).subscribe({
      next: ({ ambientes, tipos, buildings }) => {
        this.todosLosAmbientes = this._normalizeAmbientes(ambientes);
        this.tipos             = this._normalizeTipos(tipos);
        this.buildings         = this._normalizeBuildings(buildings);
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error al cargar los datos. Verifica que el servidor esté activo.';
        this.toastService.error('No se pudo conectar con el servidor.');
        this.isLoading = false;
      },
    });
  }

  // ─── Normalización defensiva (el backend puede devolver estructuras anidadas) ──

  private _normalizeAmbientes(raw: any[]): AcademicSpace[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => {
      const space = item?.data ?? item;
      return {
        id_academic_space:    space.id_academic_space ?? space.id ?? undefined,
        space_name:           space.space_name ?? space.name ?? '—',
        capacity:             Number(space.capacity ?? 0),
        location:             space.location ?? '',
        observation:          space.observation ?? '',
        floor: {
          id_floor:     space.floor?.id_floor ?? space.floor?.id ?? undefined,
          floor_number: Number(space.floor?.floor_number ?? 0),
          is_active:    space.floor?.is_active ?? '',
          building: {
            id_building: space.floor?.building?.id_building ?? space.floor?.building?.id ?? undefined,
            name:        space.floor?.building?.name ?? '',
            is_active:   space.floor?.building?.is_active ?? '',
          },
        },
        state: {
          id_state:  space.state?.id_state ?? space.state?.id ?? undefined,
          name:      space.state?.name ?? '',
          is_active: space.state?.is_active ?? '',
        },
        type_academic_space: {
          id_type_academic_space: space.type_academic_space?.id_type_academic_space ?? space.type_academic_space?.id ?? undefined,
          name:      space.type_academic_space?.name ?? '',
          is_active: space.type_academic_space?.is_active ?? '',
        },
      } as AcademicSpace;
    });
  }

  private _normalizeTipos(raw: any[]): TypeAcademicSpace[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      id_type_academic_space: t.id_type_academic_space ?? t.id,
      name:      t.name ?? '—',
      is_active: t.is_active ?? '',
    }));
  }

  private _normalizeBuildings(raw: any[]): Building[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((b: any) => ({
      id_building: b.id_building ?? b.id,
      name:        b.name ?? '—',
      is_active:   b.is_active ?? '',
    }));
  }

  // ─── Filtrado ─────────────────────────────────────────────────────────────

  applyFilters(): void {
    this.paginaActual = 0;
    const term = this.searchTerm.toLowerCase().trim();

    this.ambientesFiltrados = this.todosLosAmbientes.filter((a) => {
      // Búsqueda por nombre o ubicación
      const matchSearch =
        !term ||
        a.space_name.toLowerCase().includes(term) ||
        (a.location ?? '').toLowerCase().includes(term);

      // Tipo de ambiente
      const matchTipo =
        !this.selectedTipoId ||
        String(a.type_academic_space?.id_type_academic_space) === this.selectedTipoId;

      // Estado (chips multi-select)
      const matchEstado =
        this.selectedEstados.length === 0 ||
        this.selectedEstados.some(
          (e) => a.state?.name?.toLowerCase() === e.toLowerCase()
        );

      // Capacidad mínima
      const matchCapMin =
        this.capacidadMin == null || a.capacity >= this.capacidadMin;

      // Capacidad máxima
      const matchCapMax =
        this.capacidadMax == null || a.capacity <= this.capacidadMax;

      // Pabellón
      const matchBuilding =
        !this.selectedBuildingId ||
        String(a.floor?.building?.id_building) === this.selectedBuildingId;

      return matchSearch && matchTipo && matchEstado && matchCapMin && matchCapMax && matchBuilding;
    });
  }

  resetFilters(): void {
    this.searchTerm        = '';
    this.selectedTipoId    = '';
    this.selectedEstados   = ['Disponible'];
    this.capacidadMin      = null;
    this.capacidadMax      = null;
    this.selectedBuildingId = '';
    this.applyFilters();
  }

  toggleEstado(estado: string): void {
    const idx = this.selectedEstados.indexOf(estado);
    if (idx === -1) {
      this.selectedEstados = [...this.selectedEstados, estado];
    } else {
      this.selectedEstados = this.selectedEstados.filter((e) => e !== estado);
    }
    this.applyFilters();
  }

  isEstadoSelected(estado: string): boolean {
    return this.selectedEstados.includes(estado);
  }

  // ─── Paginación ───────────────────────────────────────────────────────────

  get ambientesPagina(): AcademicSpace[] {
    const start = this.paginaActual * this.porPagina;
    return this.ambientesFiltrados.slice(start, start + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.ambientesFiltrados.length / this.porPagina);
  }

  get hayMas(): boolean {
    return (this.paginaActual + 1) * this.porPagina < this.ambientesFiltrados.length;
  }

  cargarMas(): void {
    if (this.hayMas) this.paginaActual++;
  }

  get ambientesMostrados(): AcademicSpace[] {
    return this.ambientesFiltrados.slice(0, (this.paginaActual + 1) * this.porPagina);
  }

  // ─── Helpers de UI ────────────────────────────────────────────────────────

  getImagenAmbiente(a: AcademicSpace): string {
    const tipo = (a.type_academic_space?.name ?? '').toLowerCase();
    for (const key of Object.keys(TIPO_IMAGES)) {
      if (tipo.includes(key)) return TIPO_IMAGES[key];
    }
    return TIPO_IMAGES['default'];
  }

  getEstadoConfig(nombre: string | undefined): { label: string; dot: string; badge: string; btn: string } {
    const map: Record<string, { label: string; dot: string; badge: string; btn: string }> = {
      disponible:    { label: 'Disponible',    dot: '#22c55e', badge: 'bg-green-500',  btn: 'disponible' },
      ocupado:       { label: 'Ocupado',       dot: '#f59e0b', badge: 'bg-amber-500',  btn: 'ocupado' },
      mantenimiento: { label: 'Mantenimiento', dot: '#6b7280', badge: 'bg-gray-500',   btn: 'mantenimiento' },
    };
    const key = (nombre ?? '').toLowerCase();
    return map[key] ?? { label: nombre ?? '—', dot: '#94a3b8', badge: 'bg-slate-400', btn: 'otro' };
  }

  isDisponible(a: AcademicSpace): boolean {
    return (a.state?.name ?? '').toLowerCase() === 'disponible';
  }

  getPisoLabel(a: AcademicSpace): string {
    const n = a.floor?.floor_number;
    return n != null ? `Piso ${n}` : '';
  }

  getBuildingLabel(a: AcademicSpace): string {
    return a.floor?.building?.name ?? '';
  }

  getTipoLabel(a: AcademicSpace): string {
    return (a.type_academic_space?.name ?? '').toUpperCase();
  }

  onVerDetalles(a: AcademicSpace): void {
    this.ambienteSeleccionado = a;
    this.modalDetallesOpen = true;
  }

  onReservar(a: AcademicSpace): void {
    if (!this.isDisponible(a)) {
      Swal.fire({
        icon: 'warning',
        title: 'Ambiente No Disponible',
        text: `"${a.space_name}" no está disponible para reservar en este momento.`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#BFC621',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-lg px-4 py-2'
        }
      });
      return;
    }
    this.ambienteSeleccionado = a;
    this.modalReservarOpen = true;
  }

  // ─── Handlers de modales ──────────────────────────────────────────────────

  onCloseModalDetalles(): void {
    this.modalDetallesOpen = false;
    this.ambienteSeleccionado = null;
  }

  onReservarDesdeDetalles(ambiente: AcademicSpace): void {
    this.modalDetallesOpen = false;
    this.ambienteSeleccionado = ambiente;
    this.modalReservarOpen = true;
  }

  onCloseModalReservar(): void {
    this.modalReservarOpen = false;
    // No limpiamos ambienteSeleccionado aquí por si viene del modal de detalles
  }

  onConfirmReservation(data: ReservationData): void {
    // 🔄 MODO SIMULACIÓN: Guardar solo en localStorage hasta que el backend esté listo
    // TODO: Cuando el endpoint /reservations esté disponible, descomentar el código de backend
    
    // ✅ SIMULACIÓN: Guardar en localStorage
    this.misReservas.unshift(data);
    this.saveMisReservas();
    
    // Generar ID simulado
    const simulatedId = Math.floor(Math.random() * 10000);
    
    // Mostrar mensaje de éxito
    const fechaFormateada = this.formatDate(data.fecha);
    const fechaFinFormateada = data.fechaFin && data.fechaFin !== data.fecha 
      ? ` hasta ${this.formatDate(data.fechaFin)}` 
      : '';
    
    const equipamientoHTML = data.equipamientoRequerido 
      ? `<p style="margin: 8px 0;"><strong>Equipamiento:</strong> ${data.equipamientoRequerido}</p>`
      : '';
    
    Swal.fire({
      icon: 'success',
      title: '¡Reserva Confirmada!',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p style="margin: 8px 0;"><strong>ID Reserva:</strong> #${simulatedId}</p>
          <p style="margin: 8px 0;"><strong>Ambiente:</strong> ${data.ambiente.space_name}</p>
          <p style="margin: 8px 0;"><strong>Fecha:</strong> ${fechaFormateada}${fechaFinFormateada}</p>
          <p style="margin: 8px 0;"><strong>Horario:</strong> ${data.horaInicio} - ${data.horaFin}</p>
          <p style="margin: 8px 0;"><strong>Solicitante:</strong> ${data.solicitante}</p>
          <p style="margin: 8px 0;"><strong>Personas:</strong> ${data.cantidadPersonas} de ${data.ambiente.capacity}</p>
          ${equipamientoHTML}
          <p style="margin: 8px 0; color: #64748b;"><em>${data.motivo}</em></p>
          <p style="margin: 12px 0 0 0; padding: 8px; background: #fff3cd; border-radius: 6px; color: #856404; font-size: 12px;">
            ⚠️ Modo simulación: Los datos se guardan solo en tu navegador. Cuando el backend esté listo, se guardarán en la base de datos.
          </p>
        </div>
      `,
      confirmButtonText: 'Ver Mis Reservas',
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#BFC621',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg px-4 py-2',
        cancelButton: 'rounded-lg px-4 py-2'
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.mostrarMisReservas = true;
      }
    });
    
    this.modalReservarOpen = false;
    this.ambienteSeleccionado = null;

    /* 
    // 🔥 CÓDIGO PARA BACKEND (Descomentar cuando esté listo)
    const startDatetime = `${data.fecha}T${data.horaInicio}:00`;
    const endDate = data.fechaFin || data.fecha;
    const endDatetime = `${endDate}T${data.horaFin}:00`;

    const reservationRequest: CreateReservationRequest = {
      id_academic_space: data.ambiente.id_academic_space!,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      reason: data.motivo,
      description: data.equipamientoRequerido 
        ? `Personas: ${data.cantidadPersonas}. Equipamiento: ${data.equipamientoRequerido}`
        : `Personas: ${data.cantidadPersonas}`,
    };

    this.reservationService.createReservation(reservationRequest).subscribe({
      next: (response) => {
        this.misReservas.unshift(data);
        this.saveMisReservas();
        
        Swal.fire({
          icon: 'success',
          title: '¡Reserva Confirmada!',
          html: `<p>ID: ${response.id_reservation}</p>`,
          confirmButtonColor: '#BFC621',
        }).then((result) => {
          if (result.isConfirmed) {
            this.mostrarMisReservas = true;
          }
        });
        
        this.modalReservarOpen = false;
        this.ambienteSeleccionado = null;
      },
      error: (error) => {
        console.error('Error al crear reserva:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al Crear Reserva',
          text: error.error?.message || 'No se pudo guardar la reserva',
          confirmButtonColor: '#ef4444',
        });
      }
    });
    */
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  // ─── Gestión de Mis Reservas ──────────────────────────────────────────────

  private loadMisReservas(): void {
    const stored = localStorage.getItem('misReservas');
    if (stored) {
      try {
        this.misReservas = JSON.parse(stored);
      } catch (e) {
        this.misReservas = [];
      }
    }
  }

  private saveMisReservas(): void {
    localStorage.setItem('misReservas', JSON.stringify(this.misReservas));
  }

  toggleMisReservas(): void {
    this.mostrarMisReservas = !this.mostrarMisReservas;
  }

  cancelarReserva(index: number): void {
    const reserva = this.misReservas[index];
    
    Swal.fire({
      icon: 'warning',
      title: '¿Cancelar Reserva?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p style="margin: 8px 0;">Estás a punto de cancelar la reserva de:</p>
          <p style="margin: 8px 0;"><strong>${reserva.ambiente.space_name}</strong></p>
          <p style="margin: 8px 0; color: #64748b;">Fecha: ${this.formatDate(reserva.fecha)}</p>
          <p style="margin: 8px 0; color: #64748b;">Horario: ${reserva.horaInicio} - ${reserva.horaFin}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, Cancelar',
      cancelButtonText: 'No, Mantener',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg px-4 py-2',
        cancelButton: 'rounded-lg px-4 py-2'
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        // En modo simulación, simplemente eliminar del localStorage
        this.misReservas.splice(index, 1);
        this.saveMisReservas();
        
        Swal.fire({
          icon: 'info',
          title: 'Reserva Cancelada',
          text: 'La reserva simulada ha sido eliminada de tu navegador.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#BFC621',
          timer: 3000,
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-lg px-4 py-2'
          }
        });
        
        /* 
        // 🔥 CÓDIGO PARA BACKEND (Descomentar cuando esté listo)
        if (reserva.id_reservation) {
          // Si tiene ID real, cancelar en el backend a través del endpoint PATCH /cancel
          this.reservationService.cancelReservation(reserva.id_reservation).subscribe({
            next: () => {
              this.misReservas.splice(index, 1);
              this.saveMisReservas();
              
              Swal.fire({
                icon: 'success',
                title: 'Cancelada en el Backend',
                text: 'La reserva ha sido dada de baja del sistema real con éxito.',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#BFC621',
                customClass: {
                  popup: 'rounded-2xl',
                  confirmButton: 'rounded-lg px-4 py-2'
                }
              });
            },
            error: (err) => {
              console.error('Error al cancelar en el backend:', err);
              
              Swal.fire({
                icon: 'warning',
                title: 'Error de Red',
                text: 'No se pudo conectar con el backend para dar de baja la reserva. ¿Deseas eliminarla localmente de tu pantalla?',
                showCancelButton: true,
                confirmButtonText: 'Sí, borrar de pantalla',
                cancelButtonText: 'No, cancelar',
                confirmButtonColor: '#BFC621',
                cancelButtonColor: '#ef4444',
                customClass: {
                  popup: 'rounded-2xl',
                  confirmButton: 'rounded-lg px-4 py-2',
                  cancelButton: 'rounded-lg px-4 py-2'
                }
              }).then((fallbackResult) => {
                if (fallbackResult.isConfirmed) {
                  this.misReservas.splice(index, 1);
                  this.saveMisReservas();
                }
              });
            }
          });
        } else {
          // Si no tiene ID de backend (reserva simulada localmente), borrar del localStorage directamente
          this.misReservas.splice(index, 1);
          this.saveMisReservas();
          
          Swal.fire({
            icon: 'info',
            title: 'Reserva Simulada Removida',
            text: 'La reserva simulada ha sido eliminada de tu navegador.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#BFC621',
            timer: 3000,
            customClass: {
              popup: 'rounded-2xl',
              confirmButton: 'rounded-lg px-4 py-2'
            }
          });
        }
        */
      }
    });
  }

  getEstadoReserva(reserva: ReservationData): 'pasada' | 'hoy' | 'proxima' {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaReserva = new Date(reserva.fecha + 'T00:00:00');
    
    if (fechaReserva < hoy) return 'pasada';
    if (fechaReserva.getTime() === hoy.getTime()) return 'hoy';
    return 'proxima';
  }

  getChipActiveClass(estado: string): string {
    const map: Record<string, string> = {
      Disponible:    'border-green-500 bg-green-500 text-white',
      Ocupado:       'border-amber-500 bg-amber-500 text-white',
      Mantenimiento: 'border-gray-500 bg-gray-500 text-white',
    };
    return map[estado] ?? 'border-slate-500 bg-slate-500 text-white';
  }

  getEstadoBadgeClass(nombre: string | undefined): string {
    const map: Record<string, string> = {
      disponible:    'bg-lime-100 text-lime-700 ring-1 ring-lime-200',
      ocupado:       'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      mantenimiento: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    };
    return map[(nombre ?? '').toLowerCase()] ?? 'bg-slate-100 text-slate-600';
  }
}
