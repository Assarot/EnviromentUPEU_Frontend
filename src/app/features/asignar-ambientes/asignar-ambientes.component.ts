import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import {
  CourseSpaceAssignment,
  CourseSpaceAssignmentService,
  SchedulePayload,
} from '../../core/services/course-space-assignment.service';
import { AcademicSpaceService } from '../../core/services/academic-space.service';
import { ResourceAssigmentService } from '../../core/services/resource-assigment.service';
import { AcademicSpace } from '../../core/models/academic-space';
import { ToastService } from '../../core/services/toast.service';
import { ModalSeleccionarAmbienteComponent } from './modal-seleccionar-ambiente/modal-seleccionar-ambiente.component';
import { 
  ModalAsignacionAutomaticaComponent,
  AsignacionAutomaticaConfig 
} from './modal-asignacion-automatica/modal-asignacion-automatica.component';

// ─── Tipos de error de validación ────────────────────────────────────────────

export interface ValidationError {
  type: 'horario' | 'aforo' | 'equipamiento' | 'disponibilidad';
  message: string;
}

// ─── Configuración de horario por defecto ────────────────────────────────────

const DEFAULT_START = '07:00:00';
const DEFAULT_END   = '09:00:00';
const DEFAULT_DURATION = 120;

@Component({
  selector: 'app-asignar-ambientes',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalSeleccionarAmbienteComponent, ModalAsignacionAutomaticaComponent],
  templateUrl: './asignar-ambientes.component.html',
  styleUrls: ['./asignar-ambientes.component.css'],
})
export class AsignarAmbientesComponent implements OnInit {
  private courseSpaceService  = inject(CourseSpaceAssignmentService);
  private academicSpaceService = inject(AcademicSpaceService);
  private resourceService      = inject(ResourceAssigmentService);
  private toastService         = inject(ToastService);

  // ─── Estado de datos ───────────────────────────────────────────────────────
  cursos: CourseSpaceAssignment[]          = [];
  cursosFiltrados: CourseSpaceAssignment[] = [];
  ambientesDisponibles: AcademicSpace[]    = [];
  /** Mapa idAcademicSpace → cantidad de recursos asignados */
  recursosMap: Map<number, number>         = new Map();

  isLoading   = false;
  errorMessage = '';

  // ─── Modal ─────────────────────────────────────────────────────────────────
  isModalOpen        = false;
  cursoSeleccionado: CourseSpaceAssignment | null = null;
  isReasignacion     = false;
  isSaving           = false;

  // Modal de asignación automática
  isModalAutoOpen = false;

  // ─── Filtros ───────────────────────────────────────────────────────────────
  searchTerm       = '';
  selectedCiclo    = 'Ciclo 2026-I';
  selectedFacultad = '';
  selectedEstado   = '';

  // ─── Horario por defecto para nuevas asignaciones ─────────────────────────
  defaultStartTime = DEFAULT_START;
  defaultEndTime   = DEFAULT_END;

  // ─── Estadísticas ──────────────────────────────────────────────────────────
  get totalCursos(): number    { return this.cursos.length; }
  get totalAsignados(): number { return this.cursos.filter(c => c.status === 'Ocupado').length; }
  get totalLibres(): number    { return this.cursos.filter(c => c.status === 'Libre').length; }
  get totalBloqueados(): number{ return this.cursos.filter(c => c.status === 'Bloqueado').length; }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading    = true;
    this.errorMessage = '';

    forkJoin({
      cursos:    this.courseSpaceService.getCourseSpaceAssignments(),
      ambientes: this.academicSpaceService.getAcademicSpaces(),
      recursos:  this.resourceService.getDetails(),
    }).subscribe({
      next: ({ cursos, ambientes, recursos }) => {
        this.cursos               = cursos;
        this.cursosFiltrados      = [...cursos];
        this.ambientesDisponibles = ambientes;

        // Construir mapa de recursos por ambiente
        this.recursosMap = new Map();
        recursos.forEach((r) => {
          if (r.idAcademicSpace != null) {
            const prev = this.recursosMap.get(r.idAcademicSpace) ?? 0;
            this.recursosMap.set(r.idAcademicSpace, prev + 1);
          }
        });

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage =
          'Error al cargar los datos. Verifica que el backend esté activo.';
        this.toastService.error('Error al cargar los datos del servidor');
        this.isLoading = false;
      },
    });
  }

  // ─── Filtrado ──────────────────────────────────────────────────────────────

  filterCursos(): void {
    const term = this.searchTerm.toLowerCase();
    this.cursosFiltrados = this.cursos.filter((c) => {
      const matchSearch =
        !term ||
        this.getCursoNombre(c).toLowerCase().includes(term) ||
        this.getDocenteNombre(c).toLowerCase().includes(term) ||
        this.getGrupoNombre(c).toLowerCase().includes(term);

      const matchEstado =
        !this.selectedEstado || c.status === this.selectedEstado;

      return matchSearch && matchEstado;
    });
  }

  // ─── Validaciones de negocio ───────────────────────────────────────────────

  /**
   * Valida si un ambiente puede asignarse a un curso.
   * Cubre: disponibilidad, choque de horario, aforo y equipamiento.
   */
  validateAsignacion(
    curso: CourseSpaceAssignment,
    ambiente: AcademicSpace
  ): ValidationError | null {
    // 1. Disponibilidad del ambiente
    const estadoNombre = ambiente.state?.name ?? '';
    if (estadoNombre === 'Bloqueado' || estadoNombre === 'Ocupado') {
      return {
        type: 'disponibilidad',
        message: `El ambiente "${ambiente.space_name}" está ${estadoNombre.toLowerCase()} y no está disponible.`,
      };
    }

    // 2. Choque de horario: mismo ambiente ya asignado a otro curso activo
    const ambienteYaAsignado = this.cursos.some(
      (c) =>
        c.academicSpace?.id_academic_space === ambiente.id_academic_space &&
        c.courseAssignmentCourse.idCourseAssignmentCourse !==
          curso.courseAssignmentCourse.idCourseAssignmentCourse &&
        c.status === 'Ocupado'
    );
    if (ambienteYaAsignado) {
      return {
        type: 'horario',
        message: `Choque de horario: "${ambiente.space_name}" ya está asignado a otro curso activo.`,
      };
    }

    // 3. Aforo insuficiente (capacidad mínima de 10 estudiantes por grupo)
    const capacidadMinima = 10;
    if (ambiente.capacity < capacidadMinima) {
      return {
        type: 'aforo',
        message: `Aforo insuficiente: "${ambiente.space_name}" tiene capacidad para ${ambiente.capacity} personas (mínimo ${capacidadMinima}).`,
      };
    }

    // 4. Equipamiento: verificar que el ambiente tenga al menos un recurso asignado
    const idSpace = ambiente.id_academic_space ?? 0;
    const cantRecursos = this.recursosMap.get(idSpace) ?? 0;
    if (cantRecursos === 0) {
      // Solo advertencia, no bloquea — se notifica como warning
      // (retornamos null para permitir la asignación pero el caller puede mostrar aviso)
    }

    return null;
  }

  /**
   * Verifica si el ambiente tiene equipamiento y retorna un aviso (no bloquea).
   */
  getEquipamientoWarning(ambiente: AcademicSpace): string | null {
    const idSpace = ambiente.id_academic_space ?? 0;
    const cantRecursos = this.recursosMap.get(idSpace) ?? 0;
    if (cantRecursos === 0) {
      return `Aviso: "${ambiente.space_name}" no tiene recursos/equipamiento registrado.`;
    }
    return null;
  }

  // ─── Acciones del modal ────────────────────────────────────────────────────

  openModalAsignar(curso: CourseSpaceAssignment): void {
    if (curso.status === 'Bloqueado') {
      this.toastService.warning('Este curso está bloqueado. Desbloquéalo primero.');
      return;
    }
    this.cursoSeleccionado = curso;
    this.isReasignacion    = false;
    this.isModalOpen       = true;
  }

  openModalReasignar(curso: CourseSpaceAssignment): void {
    if (!curso.academicSpace) {
      this.toastService.warning('Este curso no tiene ambiente asignado. Use "Asignar".');
      return;
    }
    if (curso.status === 'Bloqueado') {
      this.toastService.warning('Este curso está bloqueado. Desbloquéalo primero.');
      return;
    }
    this.cursoSeleccionado = curso;
    this.isReasignacion    = true;
    this.isModalOpen       = true;
  }

  closeModal(): void {
    this.isModalOpen       = false;
    this.cursoSeleccionado = null;
    this.isSaving          = false;
  }

  // ─── Confirmar selección del modal ────────────────────────────────────────

  onAmbienteSeleccionado(ambiente: AcademicSpace): void {
    if (!this.cursoSeleccionado || this.isSaving) return;

    const error = this.validateAsignacion(this.cursoSeleccionado, ambiente);
    if (error) {
      this.toastService.error(error.message);
      return;
    }

    // Aviso de equipamiento (no bloquea)
    const warning = this.getEquipamientoWarning(ambiente);
    if (warning) {
      this.toastService.warning(warning);
    }

    this.guardarAsignacion(this.cursoSeleccionado, ambiente);
  }

  // ─── Guardar asignación (asignar o reasignar) ─────────────────────────────

  private guardarAsignacion(
    curso: CourseSpaceAssignment,
    ambiente: AcademicSpace
  ): void {
    this.isSaving = true;

    const payload: SchedulePayload = {
      startTime:          this.defaultStartTime,
      endTime:            this.defaultEndTime,
      duration:           DEFAULT_DURATION,
      idAcademicSpace:    ambiente.id_academic_space!,
      idCourseAssignment: curso.courseAssignmentCourse.courseAssignment?.idCourseAssignment ?? 0,
    };

    const request$ = this.isReasignacion
      ? this.courseSpaceService.updateAssignment(curso, ambiente, payload)
      : this.courseSpaceService.assignSpace(curso, ambiente, payload);

    request$.subscribe({
      next: (updated) => {
        this._updateCursoEnMemoria(updated);
        const accion = this.isReasignacion ? 'reasignado' : 'asignado';
        this.toastService.success(
          `Ambiente "${ambiente.space_name}" ${accion} correctamente.`
        );
        this.closeModal();
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Error al guardar la asignación.';
        this.toastService.error(msg);
        this.isSaving = false;
      },
    });
  }

  // ─── Bloquear / Desbloquear ────────────────────────────────────────────────

  toggleBloqueo(curso: CourseSpaceAssignment): void {
    const id = curso.courseAssignmentCourse.idCourseAssignmentCourse;
    const nuevoEstado: 'Libre' | 'Bloqueado' =
      curso.status === 'Bloqueado' ? 'Libre' : 'Bloqueado';

    this.courseSpaceService.updateStatus(id, nuevoEstado).subscribe({
      next: () => {
        this._updateCursoEnMemoria({ ...curso, status: nuevoEstado });
        const accion = nuevoEstado === 'Bloqueado' ? 'bloqueado' : 'desbloqueado';
        this.toastService.success(`Curso "${this.getCursoNombre(curso)}" ${accion}.`);
      },
      error: () => {
        this.toastService.error('Error al actualizar el estado.');
      },
    });
  }

  // ─── Asignación automática ────────────────────────────────────────────────

  openModalAsignacionAutomatica(): void {
    this.isModalAutoOpen = true;
  }

  closeModalAsignacionAutomatica(): void {
    this.isModalAutoOpen = false;
  }

  onConfirmAsignacionAutomatica(config: AsignacionAutomaticaConfig): void {
    this.closeModalAsignacionAutomatica();
    this.ejecutarAsignacionInteligente(config);
  }

  /**
   * Ejecuta la asignación automática inteligente según la configuración seleccionada.
   * Aplica reglas de negocio:
   * - Sistemas/Software → Laboratorios de Cómputo
   * - Arquitectura/Civil → Talleres
   * - Otras carreras → Aulas
   * Solo usa ambientes de los pabellones seleccionados.
   */
  private ejecutarAsignacionInteligente(config: AsignacionAutomaticaConfig): void {
    const { facultad, carrera, pabellones } = config;

    const cursosObjetivo = this.cursos.filter(
      (curso) => curso.status === 'Libre'
    );

    if (cursosObjetivo.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin Cursos Disponibles',
        text: 'No hay cursos sin asignar en este momento.',
        confirmButtonColor: '#BFC621',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    // Mostrar loading
    Swal.fire({
      title: 'Asignando Ambientes...',
      html: `Procesando <strong>${cursosObjetivo.length}</strong> curso(s) de <strong>${carrera.name}</strong>`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const tipoAmbiente   = this.determinarTipoAmbiente(carrera.name);
    const pabellonIds    = pabellones.map(p => p.id_building);

    let asignados = 0;
    let errores   = 0;
    let pendientes = cursosObjetivo.length;
    const ambientesAsignados: string[] = [];

    cursosObjetivo.forEach((curso) => {
      const compatible = this.buscarAmbienteCompatible(curso, tipoAmbiente, pabellonIds);

      if (!compatible) {
        errores++;
        pendientes--;
        if (pendientes === 0) this._mostrarResumenAutoAsignSwal(asignados, errores, ambientesAsignados, carrera.name, facultad.name, pabellones.map(p => p.name).join(', '));
        return;
      }

      const payload: SchedulePayload = {
        startTime:          this.defaultStartTime,
        endTime:            this.defaultEndTime,
        duration:           DEFAULT_DURATION,
        idAcademicSpace:    compatible.id_academic_space!,
        idCourseAssignment: curso.courseAssignmentCourse.courseAssignment?.idCourseAssignment ?? 0,
      };

      this.courseSpaceService.assignSpace(curso, compatible, payload).subscribe({
        next: (updated) => {
          this._updateCursoEnMemoria(updated);
          asignados++;
          ambientesAsignados.push(`${compatible.space_name} (${compatible.type_academic_space?.name ?? '—'})`);
          pendientes--;
          if (pendientes === 0) this._mostrarResumenAutoAsignSwal(asignados, errores, ambientesAsignados, carrera.name, facultad.name, pabellones.map(p => p.name).join(', '));
        },
        error: () => {
          errores++;
          pendientes--;
          if (pendientes === 0) this._mostrarResumenAutoAsignSwal(asignados, errores, ambientesAsignados, carrera.name, facultad.name, pabellones.map(p => p.name).join(', '));
        },
      });
    });
  }

  /**
   * Determina el tipo de ambiente según el nombre de la carrera.
   */
  private determinarTipoAmbiente(nombreCarrera: string): string {
    const nombre = nombreCarrera.toLowerCase();

    // Sistemas, Software, Informática → Laboratorio de Cómputo
    if (
      nombre.includes('sistema') ||
      nombre.includes('software') ||
      nombre.includes('informática') ||
      nombre.includes('computación')
    ) {
      return 'laboratorio';
    }

    // Arquitectura, Civil, Industrial → Taller
    if (
      nombre.includes('arquitectura') ||
      nombre.includes('civil') ||
      nombre.includes('industrial')
    ) {
      return 'taller';
    }

    // Otras carreras → Aula
    return 'aula';
  }

  /**
   * Busca un ambiente compatible según el tipo, pabellones seleccionados y validaciones de negocio.
   */
  private buscarAmbienteCompatible(
    curso: CourseSpaceAssignment,
    tipoPreferido: string,
    pabellonIds: (number | undefined)[] = []
  ): AcademicSpace | null {
    // Filtrar por pabellones seleccionados si se indicaron
    const pool = pabellonIds.length > 0
      ? this.ambientesDisponibles.filter(a => pabellonIds.includes(a.floor?.building?.id_building))
      : this.ambientesDisponibles;

    // 1. Intentar con el tipo preferido dentro del pabellón
    let compatible = pool.find((a) => {
      const tipoAmbiente = (a.type_academic_space?.name ?? '').toLowerCase();
      return tipoAmbiente.includes(tipoPreferido) && this.validateAsignacion(curso, a) === null;
    });

    // 2. Si no hay del tipo preferido, cualquier ambiente válido del pabellón
    if (!compatible) {
      compatible = pool.find(a => this.validateAsignacion(curso, a) === null);
    }

    return compatible ?? null;
  }

  asignacionAutomatica(): void {
    // Método antiguo - ahora abre el modal
    this.openModalAsignacionAutomatica();
  }

  private _mostrarResumenAutoAsignSwal(asignados: number, errores: number, ambientesAsignados: string[], carrera: string, facultad: string, pabellones: string): void {
    Swal.close();

    if (asignados === 0 && errores > 0) {
      Swal.fire({
        icon: 'error',
        title: 'No se Pudo Asignar',
        html: `
          <div style="text-align:left;padding:10px;">
            <p style="margin:8px 0;">No se encontraron ambientes compatibles para <strong>${carrera}</strong> en los pabellones seleccionados.</p>
            <p style="margin:8px 0;color:#64748b;">Pabellones: ${pabellones}</p>
            <p style="margin:8px 0;color:#64748b;">Verifica que existan ambientes disponibles del tipo requerido.</p>
          </div>`,
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    if (asignados > 0) {
      const listaAmbientes = ambientesAsignados.slice(0, 5)
        .map((a, i) => `<li style="margin:4px 0;">${i + 1}. ${a}</li>`).join('');
      const masAmbientes = ambientesAsignados.length > 5
        ? `<p style="margin:8px 0;color:#64748b;font-size:13px;">... y ${ambientesAsignados.length - 5} más</p>` : '';

      Swal.fire({
        icon: 'success',
        title: '¡Asignación Completada!',
        html: `
          <div style="text-align:left;padding:10px;">
            <p style="margin:6px 0;"><strong>Facultad:</strong> ${facultad}</p>
            <p style="margin:6px 0;"><strong>Carrera:</strong> ${carrera}</p>
            <p style="margin:6px 0;"><strong>Pabellones:</strong> ${pabellones}</p>
            <p style="margin:12px 0;padding:8px;background:#f0fdf4;border-radius:6px;color:#166534;">
              ✅ <strong>${asignados} curso(s)</strong> asignados exitosamente
            </p>
            ${errores > 0 ? `<p style="margin:8px 0;padding:8px;background:#fef3c7;border-radius:6px;color:#92400e;">⚠️ ${errores} curso(s) sin ambiente compatible</p>` : ''}
            <p style="margin:12px 0 4px 0;font-weight:600;color:#1e293b;">Ambientes asignados:</p>
            <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;">${listaAmbientes}</ul>
            ${masAmbientes}
          </div>`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#BFC621',
        customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-lg px-4 py-2' }
      });
    }
  }

  private _mostrarResumenAutoAsign(asignados: number, errores: number): void {
    if (asignados > 0) {
      this.toastService.success(`${asignados} curso(s) asignados automáticamente.`);
    }
    if (errores > 0) {
      this.toastService.warning(`${errores} curso(s) no pudieron asignarse (sin ambiente compatible).`);
    }
  }

  // ─── Helpers de memoria ───────────────────────────────────────────────────

  private _updateCursoEnMemoria(updated: CourseSpaceAssignment): void {
    const id = updated.courseAssignmentCourse.idCourseAssignmentCourse;
    const idx = this.cursos.findIndex(
      (c) => c.courseAssignmentCourse.idCourseAssignmentCourse === id
    );
    if (idx !== -1) {
      this.cursos[idx] = updated;
    }
    this.filterCursos();
  }

  // ─── Helpers para el template ─────────────────────────────────────────────

  getCursoNombre(c: CourseSpaceAssignment): string {
    return c.courseAssignmentCourse.course?.name ?? '—';
  }

  getDocenteNombre(c: CourseSpaceAssignment): string {
    const t = c.courseAssignmentCourse.courseAssignment?.teacher;
    if (!t) return 'Sin docente';
    return `${t.name} ${t.lastName}`;
  }

  getGrupoNombre(c: CourseSpaceAssignment): string {
    const g = c.courseAssignmentCourse.course?.group;
    // El backend devuelve groupNumber, no name
    return g?.groupNumber ?? '—';
  }

  getTipoAmbiente(c: CourseSpaceAssignment): string {
    return c.academicSpace?.type_academic_space?.name ?? '—';
  }

  getAmbienteNombre(c: CourseSpaceAssignment): string | null {
    return c.academicSpace?.space_name ?? null;
  }

  getRecursosCount(c: CourseSpaceAssignment): number {
    const id = c.academicSpace?.id_academic_space ?? 0;
    return this.recursosMap.get(id) ?? 0;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      Libre:     'bg-lime-100 text-lime-700 ring-1 ring-lime-200',
      Ocupado:   'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      Bloqueado: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600';
  }

  getStatusDotColor(status: string): string {
    const map: Record<string, string> = {
      Libre:     '#65a30d',
      Ocupado:   '#d97706',
      Bloqueado: '#dc2626',
    };
    return map[status] ?? '#94a3b8';
  }
}
