import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

import { FacultyService } from '../../core/services/faculty.service';
import { ProfessionalSchoolService } from '../../core/services/professional-school.service';
import { CycleService } from '../../core/services/cycle.service';
import { AcademicSpaceService } from '../../core/services/academic-space.service';
import { TypeAcademicSpaceService } from '../../core/services/type-academic-space.service';
import { BuildingService } from '../../core/services/building.service';
import { CourseSpaceAssignmentService } from '../../core/services/course-space-assignment.service';
import { ToastService } from '../../core/services/toast.service';

import { Faculty } from '../../core/models/faculty';
import { ProfessionalSchool } from '../../core/models/professional-school';
import { Cycle } from '../../core/models/cycle';
import { AcademicSpace } from '../../core/models/academic-space';
import { TypeAcademicSpace } from '../../core/models/type-academic-space';
import { Building } from '../../core/models/building';

interface AsignacionAutomatica {
  facultad: Faculty;
  carrera: ProfessionalSchool;
  ciclo: Cycle;
  ambientesAsignados: AmbienteAsignado[];
  pabellon?: Building;
}

interface AmbienteAsignado {
  ambiente: AcademicSpace;
  tipo: string;
  motivo: string;
}

@Component({
  selector: 'app-asignacion-automatica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignacion-automatica.component.html',
  styleUrl: './asignacion-automatica.component.css'
})
export class AsignacionAutomaticaComponent implements OnInit {
  private facultyService = inject(FacultyService);
  private professionalSchoolService = inject(ProfessionalSchoolService);
  private cycleService = inject(CycleService);
  private academicSpaceService = inject(AcademicSpaceService);
  private typeAcademicSpaceService = inject(TypeAcademicSpaceService);
  private buildingService = inject(BuildingService);
  private courseSpaceAssignmentService = inject(CourseSpaceAssignmentService);
  private toastService = inject(ToastService);

  // Datos del backend
  facultades: Faculty[] = [];
  carreras: ProfessionalSchool[] = [];
  ciclos: Cycle[] = [];
  ambientes: AcademicSpace[] = [];
  tiposAmbiente: TypeAcademicSpace[] = [];
  pabellones: Building[] = [];

  // Filtros de carreras y ciclos según selección
  carrerasFiltradas: ProfessionalSchool[] = [];
  ciclosFiltrados: Cycle[] = [];

  // Selección del formulario
  selectedFacultadId: number | null = null;
  selectedCarreraId: number | null = null;
  selectedCicloId: number | null = null;

  // Resultados de asignación
  asignacionGenerada: AsignacionAutomatica | null = null;
  mostrarResultados = false;

  // Estado UI
  isLoading = false;
  isGenerating = false;

  // Reglas de asignación por carrera
  private reglasAsignacion: Record<string, { tipos: string[], prioridad: string[] }> = {
    'sistemas': {
      tipos: ['laboratorio de cómputo', 'laboratorio', 'aula'],
      prioridad: ['laboratorio de cómputo', 'laboratorio']
    },
    'software': {
      tipos: ['laboratorio de cómputo', 'laboratorio', 'aula'],
      prioridad: ['laboratorio de cómputo', 'laboratorio']
    },
    'civil': {
      tipos: ['taller', 'laboratorio', 'aula'],
      prioridad: ['taller', 'laboratorio']
    },
    'arquitectura': {
      tipos: ['taller', 'aula de dibujo', 'aula'],
      prioridad: ['taller', 'aula de dibujo']
    },
    'industrial': {
      tipos: ['taller', 'laboratorio', 'aula'],
      prioridad: ['taller', 'laboratorio']
    },
    'ambiental': {
      tipos: ['laboratorio', 'aula', 'taller'],
      prioridad: ['laboratorio']
    },
    'enfermería': {
      tipos: ['laboratorio clínico', 'laboratorio', 'aula'],
      prioridad: ['laboratorio clínico', 'laboratorio']
    },
    'medicina': {
      tipos: ['laboratorio clínico', 'aula', 'auditorio'],
      prioridad: ['laboratorio clínico']
    },
    'psicología': {
      tipos: ['aula', 'sala de terapia', 'laboratorio'],
      prioridad: ['sala de terapia', 'aula']
    },
    'contabilidad': {
      tipos: ['aula', 'laboratorio de cómputo', 'auditorio'],
      prioridad: ['aula', 'laboratorio de cómputo']
    },
    'administración': {
      tipos: ['aula', 'sala de reuniones', 'auditorio'],
      prioridad: ['aula', 'sala de reuniones']
    },
    'economía': {
      tipos: ['aula', 'laboratorio de cómputo', 'auditorio'],
      prioridad: ['aula']
    },
    'educación': {
      tipos: ['aula', 'taller', 'laboratorio'],
      prioridad: ['aula', 'taller']
    },
    'teología': {
      tipos: ['aula', 'auditorio', 'sala'],
      prioridad: ['aula', 'auditorio']
    }
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    forkJoin({
      facultades: this.facultyService.getFaculties(),
      carreras: this.professionalSchoolService.getProfessionalSchools(),
      ciclos: this.cycleService.getCycles(),
      ambientes: this.academicSpaceService.getAcademicSpaces(),
      tipos: this.typeAcademicSpaceService.getTypeAcademicSpaces(),
      pabellones: this.buildingService.getBuildings()
    }).subscribe({
      next: ({ facultades, carreras, ciclos, ambientes, tipos, pabellones }) => {
        this.facultades = this._normalizeFacultades(facultades);
        this.carreras = this._normalizeCarreras(carreras);
        this.ciclos = this._normalizeCiclos(ciclos);
        this.ambientes = this._normalizeAmbientes(ambientes);
        this.tiposAmbiente = this._normalizeTipos(tipos);
        this.pabellones = this._normalizePabellones(pabellones);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.toastService.error('Error al cargar los datos del sistema');
        this.isLoading = false;
      }
    });
  }

  private _normalizeFacultades(raw: any[]): Faculty[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((f: any) => new Faculty(f.name ?? '—', f.idFaculty ?? f.id));
  }

  private _normalizeCarreras(raw: any[]): ProfessionalSchool[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((c: any) => {
      const faculty = new Faculty(
        c.faculty?.name ?? '—',
        c.faculty?.idFaculty ?? c.faculty?.id
      );
      return new ProfessionalSchool(
        c.name ?? '—',
        faculty,
        c.idProfessionalSchool ?? c.id
      );
    });
  }

  private _normalizeCiclos(raw: any[]): Cycle[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((c: any) => {
      const faculty = new Faculty(
        c.professionalSchool?.faculty?.name ?? '—',
        c.professionalSchool?.faculty?.idFaculty ?? c.professionalSchool?.faculty?.id
      );
      const professionalSchool = new ProfessionalSchool(
        c.professionalSchool?.name ?? '—',
        faculty,
        c.professionalSchool?.idProfessionalSchool ?? c.professionalSchool?.id
      );
      return new Cycle(
        c.name ?? '—',
        professionalSchool,
        c.idCycle ?? c.id
      );
    });
  }

  private _normalizeAmbientes(raw: any[]): AcademicSpace[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => {
      const space = item?.data ?? item;
      return {
        id_academic_space: space.id_academic_space ?? space.id ?? undefined,
        space_name: space.space_name ?? space.name ?? '—',
        capacity: Number(space.capacity ?? 0),
        location: space.location ?? '',
        observation: space.observation ?? '',
        floor: {
          id_floor: space.floor?.id_floor ?? space.floor?.id ?? undefined,
          floor_number: Number(space.floor?.floor_number ?? 0),
          is_active: space.floor?.is_active ?? '',
          building: {
            id_building: space.floor?.building?.id_building ?? space.floor?.building?.id ?? undefined,
            name: space.floor?.building?.name ?? '',
            is_active: space.floor?.building?.is_active ?? '',
          },
        },
        state: {
          id_state: space.state?.id_state ?? space.state?.id ?? undefined,
          name: space.state?.name ?? '',
          is_active: space.state?.is_active ?? '',
        },
        type_academic_space: {
          id_type_academic_space: space.type_academic_space?.id_type_academic_space ?? space.type_academic_space?.id ?? undefined,
          name: space.type_academic_space?.name ?? '',
          is_active: space.type_academic_space?.is_active ?? '',
        },
      } as AcademicSpace;
    });
  }

  private _normalizeTipos(raw: any[]): TypeAcademicSpace[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      id_type_academic_space: t.id_type_academic_space ?? t.id,
      name: t.name ?? '—',
      is_active: t.is_active ?? '',
    }));
  }

  private _normalizePabellones(raw: any[]): Building[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((b: any) => ({
      id_building: b.id_building ?? b.id,
      name: b.name ?? '—',
      is_active: b.is_active ?? '',
    }));
  }

  onFacultadChange(): void {
    this.selectedCarreraId = null;
    this.selectedCicloId = null;
    this.carrerasFiltradas = [];
    this.ciclosFiltrados = [];
    this.asignacionGenerada = null;
    this.mostrarResultados = false;

    if (this.selectedFacultadId) {
      this.carrerasFiltradas = this.carreras.filter(
        c => c.faculty.idFaculty === this.selectedFacultadId
      );
    }
  }

  onCarreraChange(): void {
    this.selectedCicloId = null;
    this.ciclosFiltrados = [];
    this.asignacionGenerada = null;
    this.mostrarResultados = false;

    if (this.selectedCarreraId) {
      this.ciclosFiltrados = this.ciclos.filter(
        c => c.professionalSchool.idProfessionalSchool === this.selectedCarreraId
      );
    }
  }

  onCicloChange(): void {
    this.asignacionGenerada = null;
    this.mostrarResultados = false;
  }

  generarAsignacionAutomatica(): void {
    if (!this.selectedFacultadId || !this.selectedCarreraId || !this.selectedCicloId) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos Incompletos',
        text: 'Por favor selecciona Facultad, Carrera y Ciclo',
        confirmButtonColor: '#BFC621',
        customClass: { popup: 'rounded-2xl' }
      });
      return;
    }

    this.isGenerating = true;

    // Simular procesamiento
    setTimeout(() => {
      const facultad = this.facultades.find(f => f.idFaculty === this.selectedFacultadId)!;
      const carrera = this.carreras.find(c => c.idProfessionalSchool === this.selectedCarreraId)!;
      const ciclo = this.ciclos.find(c => c.idCycle === this.selectedCicloId)!;

      const ambientesAsignados = this.asignarAmbientesPorCarrera(carrera);
      const pabellon = this.determinarPabellon(facultad, carrera);

      this.asignacionGenerada = {
        facultad,
        carrera,
        ciclo,
        ambientesAsignados,
        pabellon
      };

      this.mostrarResultados = true;
      this.isGenerating = false;

      Swal.fire({
        icon: 'success',
        title: '¡Asignación Generada!',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>Facultad:</strong> ${facultad.name}</p>
            <p><strong>Carrera:</strong> ${carrera.name}</p>
            <p><strong>Ciclo:</strong> ${ciclo.name}</p>
            <p><strong>Ambientes asignados:</strong> ${ambientesAsignados.length}</p>
            ${pabellon ? `<p><strong>Pabellón:</strong> ${pabellon.name}</p>` : ''}
          </div>
        `,
        confirmButtonColor: '#BFC621',
        customClass: { popup: 'rounded-2xl' }
      });
    }, 1500);
  }

  private asignarAmbientesPorCarrera(carrera: ProfessionalSchool): AmbienteAsignado[] {
    const nombreCarrera = carrera.name.toLowerCase();
    const asignados: AmbienteAsignado[] = [];

    // Buscar regla de asignación
    let regla = this.reglasAsignacion['default'] || { tipos: ['aula'], prioridad: ['aula'] };
    
    for (const key of Object.keys(this.reglasAsignacion)) {
      if (nombreCarrera.includes(key)) {
        regla = this.reglasAsignacion[key];
        break;
      }
    }

    // Filtrar ambientes disponibles
    const ambientesDisponibles = this.ambientes.filter(
      a => a.state?.name?.toLowerCase() === 'disponible'
    );

    // Asignar según prioridad
    for (const tipoPrioridad of regla.prioridad) {
      const ambientesTipo = ambientesDisponibles.filter(a => {
        const tipoNombre = (a.type_academic_space?.name ?? '').toLowerCase();
        return tipoNombre.includes(tipoPrioridad.toLowerCase());
      });

      // Tomar hasta 3 ambientes de cada tipo prioritario
      const seleccionados = ambientesTipo.slice(0, 3);
      seleccionados.forEach(ambiente => {
        asignados.push({
          ambiente,
          tipo: tipoPrioridad,
          motivo: `Asignado por ser ${tipoPrioridad} requerido para ${carrera.name}`
        });
      });
    }

    // Si no hay suficientes, agregar aulas genéricas
    if (asignados.length < 5) {
      const aulasGenericas = ambientesDisponibles.filter(a => {
        const tipoNombre = (a.type_academic_space?.name ?? '').toLowerCase();
        return tipoNombre.includes('aula') && 
               !asignados.some(asig => asig.ambiente.id_academic_space === a.id_academic_space);
      });

      const faltantes = 5 - asignados.length;
      aulasGenericas.slice(0, faltantes).forEach(ambiente => {
        asignados.push({
          ambiente,
          tipo: 'aula',
          motivo: `Aula complementaria para ${carrera.name}`
        });
      });
    }

    return asignados;
  }

  private determinarPabellon(facultad: Faculty, carrera: ProfessionalSchool): Building | undefined {
    // Lógica para determinar pabellón según facultad
    const nombreFacultad = facultad.name.toLowerCase();
    
    if (nombreFacultad.includes('fia') || nombreFacultad.includes('ingeniería')) {
      return this.pabellones.find(p => p.name.toLowerCase().includes('a') || p.name.toLowerCase().includes('ingeniería'));
    } else if (nombreFacultad.includes('fcs') || nombreFacultad.includes('salud')) {
      return this.pabellones.find(p => p.name.toLowerCase().includes('b') || p.name.toLowerCase().includes('salud'));
    } else if (nombreFacultad.includes('fce') || nombreFacultad.includes('empresariales')) {
      return this.pabellones.find(p => p.name.toLowerCase().includes('c') || p.name.toLowerCase().includes('empresarial'));
    } else if (nombreFacultad.includes('facihed') || nombreFacultad.includes('educación')) {
      return this.pabellones.find(p => p.name.toLowerCase().includes('d') || p.name.toLowerCase().includes('educación'));
    }

    return this.pabellones[0]; // Pabellón por defecto
  }

  resetForm(): void {
    this.selectedFacultadId = null;
    this.selectedCarreraId = null;
    this.selectedCicloId = null;
    this.carrerasFiltradas = [];
    this.ciclosFiltrados = [];
    this.asignacionGenerada = null;
    this.mostrarResultados = false;
  }

  confirmarAsignacion(): void {
    if (!this.asignacionGenerada) return;

    Swal.fire({
      icon: 'question',
      title: '¿Confirmar Asignación?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p>Se asignarán <strong>${this.asignacionGenerada.ambientesAsignados.length} ambientes</strong> para:</p>
          <p><strong>${this.asignacionGenerada.carrera.name}</strong> - ${this.asignacionGenerada.ciclo.name}</p>
          <p style="margin-top: 12px; color: #64748b; font-size: 14px;">
            Esta acción guardará la asignación en el sistema.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#BFC621',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl' }
    }).then((result) => {
      if (result.isConfirmed) {
        this.guardarAsignacion();
      }
    });
  }

  private guardarAsignacion(): void {
    // TODO: Implementar guardado en backend cuando esté disponible
    // Por ahora, solo mostrar confirmación
    
    Swal.fire({
      icon: 'success',
      title: '¡Asignación Guardada!',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p>La asignación automática ha sido registrada exitosamente.</p>
          <p style="margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 6px; color: #856404; font-size: 12px;">
            ⚠️ Modo simulación: Los datos se muestran pero no se guardan en la base de datos hasta que el endpoint esté disponible.
          </p>
        </div>
      `,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#BFC621',
      customClass: { popup: 'rounded-2xl' }
    }).then(() => {
      this.resetForm();
    });
  }

  getTipoIcon(tipo: string): string {
    const iconMap: Record<string, string> = {
      'laboratorio': '🔬',
      'laboratorio de cómputo': '💻',
      'laboratorio clínico': '🏥',
      'taller': '🔧',
      'aula': '📚',
      'aula de dibujo': '🎨',
      'auditorio': '🎭',
      'sala': '🚪',
      'sala de terapia': '🛋️',
      'sala de reuniones': '👥'
    };

    for (const key of Object.keys(iconMap)) {
      if (tipo.toLowerCase().includes(key)) {
        return iconMap[key];
      }
    }
    return '📍';
  }
}
