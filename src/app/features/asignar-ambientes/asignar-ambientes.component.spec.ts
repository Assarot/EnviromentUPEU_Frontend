import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AsignarAmbientesComponent } from './asignar-ambientes.component';
import {
  CourseSpaceAssignment,
  CourseSpaceAssignmentService,
} from '../../core/services/course-space-assignment.service';
import { AcademicSpaceService } from '../../core/services/academic-space.service';
import { ResourceAssigmentService } from '../../core/services/resource-assigment.service';
import { ToastService } from '../../core/services/toast.service';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AcademicSpace } from '../../core/models/academic-space';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockAmbienteDisponible: AcademicSpace = {
  id_academic_space: 1,
  space_name: 'Lab 101',
  capacity: 40,
  location: 'Pabellón A, Piso 1',
  observation: '',
  floor: { id_floor: 1, floor_number: 1, is_active: 'A', building: { id_building: 1, name: 'Pabellón A', is_active: 'A' } },
  state: { id_state: 1, name: 'Disponible', is_active: 'A' },
  type_academic_space: { id_type_academic_space: 1, name: 'Laboratorio', is_active: 'A' },
};

const mockAmbienteBloqueado: AcademicSpace = {
  ...mockAmbienteDisponible,
  id_academic_space: 2,
  space_name: 'Aula 202',
  state: { id_state: 2, name: 'Bloqueado', is_active: 'A' },
};

const mockAmbienteOcupado: AcademicSpace = {
  ...mockAmbienteDisponible,
  id_academic_space: 3,
  space_name: 'Aula 303',
  state: { id_state: 3, name: 'Ocupado', is_active: 'A' },
};

const mockAmbienteAforoInsuficiente: AcademicSpace = {
  ...mockAmbienteDisponible,
  id_academic_space: 4,
  space_name: 'Cubículo 1',
  capacity: 5,
};

const mockCursoLibre: CourseSpaceAssignment = {
  courseAssignmentCourse: {
    idCourseAssignmentCourse: 1,
    course: {
      idCourse: 1,
      name: 'Redes I',
      code: 'RED101',
      courseType: { idCourseType: 1, name: 'Laboratorio' },
      group: { idGroup: 1, groupNumber: 'A' },   // ← groupNumber, no name
    },
    courseAssignment: {
      idCourseAssignment: 10,
      teacher: { idTeacher: 1, name: 'Juan', lastName: 'Pérez', email: 'j@upeu.edu.pe' },
    },
  },
  academicSpace: undefined,
  status: 'Libre',
};

const mockCursoOcupado: CourseSpaceAssignment = {
  ...mockCursoLibre,
  courseAssignmentCourse: {
    ...mockCursoLibre.courseAssignmentCourse,
    idCourseAssignmentCourse: 2,
  },
  academicSpace: { ...mockAmbienteDisponible, id_academic_space: 50, space_name: 'Aula Ocupada' },
  status: 'Ocupado',
};

const mockCursoBloqueado: CourseSpaceAssignment = {
  ...mockCursoLibre,
  courseAssignmentCourse: {
    ...mockCursoLibre.courseAssignmentCourse,
    idCourseAssignmentCourse: 3,
  },
  status: 'Bloqueado',
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AsignarAmbientesComponent', () => {
  let component: AsignarAmbientesComponent;
  let fixture: ComponentFixture<AsignarAmbientesComponent>;
  let courseSpaceService: jasmine.SpyObj<CourseSpaceAssignmentService>;
  let academicSpaceService: jasmine.SpyObj<AcademicSpaceService>;
  let resourceService: jasmine.SpyObj<ResourceAssigmentService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    courseSpaceService = jasmine.createSpyObj('CourseSpaceAssignmentService', [
      'getCourseSpaceAssignments',
      'assignSpace',
      'updateAssignment',
      'updateStatus',
      'removeAssignment',
    ]);
    academicSpaceService = jasmine.createSpyObj('AcademicSpaceService', [
      'getAcademicSpaces',
    ]);
    resourceService = jasmine.createSpyObj('ResourceAssigmentService', [
      'getDetails',
    ]);
    toastService = jasmine.createSpyObj('ToastService', [
      'success', 'error', 'warning', 'info',
    ]);

    // Defaults
    courseSpaceService.getCourseSpaceAssignments.and.returnValue(
      of([mockCursoLibre, mockCursoOcupado, mockCursoBloqueado])
    );
    academicSpaceService.getAcademicSpaces.and.returnValue(
      of([mockAmbienteDisponible, mockAmbienteBloqueado, mockAmbienteOcupado, mockAmbienteAforoInsuficiente])
    );
    resourceService.getDetails.and.returnValue(
      of([{ idResourceAssignment: 1, idAcademicSpace: 1 } as any])
    );

    await TestBed.configureTestingModule({
      imports: [AsignarAmbientesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CourseSpaceAssignmentService, useValue: courseSpaceService },
        { provide: AcademicSpaceService,         useValue: academicSpaceService },
        { provide: ResourceAssigmentService,     useValue: resourceService },
        { provide: ToastService,                 useValue: toastService },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(AsignarAmbientesComponent);
    component = fixture.componentInstance;
  });

  // ─── Creación ─────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── loadData ─────────────────────────────────────────────────────────────

  describe('loadData()', () => {
    it('carga cursos, ambientes y recursos correctamente', fakeAsync(() => {
      component.loadData();
      tick();

      expect(component.cursos.length).toBe(3);
      expect(component.ambientesDisponibles.length).toBe(4);
      expect(component.recursosMap.get(1)).toBe(1);
      expect(component.isLoading).toBeFalse();
      expect(component.errorMessage).toBe('');
    }));

    it('muestra error cuando el backend falla', fakeAsync(() => {
      courseSpaceService.getCourseSpaceAssignments.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      component.loadData();
      tick();

      expect(component.errorMessage).toBeTruthy();
      expect(toastService.error).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
    }));
  });

  // ─── Estadísticas ─────────────────────────────────────────────────────────

  describe('Estadísticas', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('calcula totalCursos correctamente', () => {
      expect(component.totalCursos).toBe(3);
    });

    it('calcula totalAsignados correctamente', () => {
      expect(component.totalAsignados).toBe(1);
    });

    it('calcula totalLibres correctamente', () => {
      expect(component.totalLibres).toBe(1);
    });

    it('calcula totalBloqueados correctamente', () => {
      expect(component.totalBloqueados).toBe(1);
    });
  });

  // ─── filterCursos ─────────────────────────────────────────────────────────

  describe('filterCursos()', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('filtra por nombre de curso', () => {
      component.searchTerm = 'Redes';
      component.filterCursos();
      expect(component.cursosFiltrados.length).toBeGreaterThan(0);
      expect(component.cursosFiltrados.every(c => c.courseAssignmentCourse.course.name.includes('Redes'))).toBeTrue();
    });

    it('filtra por nombre de docente', () => {
      component.searchTerm = 'Pérez';
      component.filterCursos();
      expect(component.cursosFiltrados.length).toBeGreaterThan(0);
    });

    it('retorna todos cuando el término está vacío', () => {
      component.searchTerm = '';
      component.filterCursos();
      expect(component.cursosFiltrados.length).toBe(3);
    });

    it('retorna vacío cuando no hay coincidencias', () => {
      component.searchTerm = 'XYZ_NO_EXISTE';
      component.filterCursos();
      expect(component.cursosFiltrados.length).toBe(0);
    });

    it('filtra por estado', () => {
      component.selectedEstado = 'Bloqueado';
      component.filterCursos();
      expect(component.cursosFiltrados.every(c => c.status === 'Bloqueado')).toBeTrue();
    });
  });

  // ─── validateAsignacion ───────────────────────────────────────────────────

  describe('validateAsignacion()', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('retorna null para una asignación válida', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteDisponible);
      expect(error).toBeNull();
    });

    it('retorna error "disponibilidad" para ambiente bloqueado', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteBloqueado);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('disponibilidad');
    });

    it('retorna error "disponibilidad" para ambiente ocupado', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteOcupado);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('disponibilidad');
    });

    it('retorna error "horario" cuando el ambiente ya está asignado a otro curso activo', () => {
      // Añadimos un curso activo con el ambiente 1 asignado
      const ambienteConflicto: AcademicSpace = { ...mockAmbienteDisponible, id_academic_space: 1 };
      const cursoConAmbiente: CourseSpaceAssignment = {
        ...mockCursoLibre,
        courseAssignmentCourse: {
          ...mockCursoLibre.courseAssignmentCourse,
          idCourseAssignmentCourse: 77,
        },
        academicSpace: ambienteConflicto,
        status: 'Ocupado',
      };
      component.cursos = [...component.cursos, cursoConAmbiente];

      const otroCurso: CourseSpaceAssignment = {
        ...mockCursoLibre,
        courseAssignmentCourse: {
          ...mockCursoLibre.courseAssignmentCourse,
          idCourseAssignmentCourse: 99,
        },
      };
      const error = component.validateAsignacion(otroCurso, ambienteConflicto);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('horario');
    });

    it('retorna error "aforo" para ambiente con capacidad insuficiente', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteAforoInsuficiente);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('aforo');
    });
  });

  // ─── getEquipamientoWarning ────────────────────────────────────────────────

  describe('getEquipamientoWarning()', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('retorna null cuando el ambiente tiene recursos', () => {
      const warning = component.getEquipamientoWarning(mockAmbienteDisponible);
      expect(warning).toBeNull();
    });

    it('retorna aviso cuando el ambiente no tiene recursos', () => {
      const ambienteSinRecursos: AcademicSpace = { ...mockAmbienteDisponible, id_academic_space: 99 };
      const warning = component.getEquipamientoWarning(ambienteSinRecursos);
      expect(warning).not.toBeNull();
      expect(warning).toContain('no tiene recursos');
    });
  });

  // ─── openModalAsignar ─────────────────────────────────────────────────────

  describe('openModalAsignar()', () => {
    it('abre el modal para un curso libre', () => {
      component.openModalAsignar(mockCursoLibre);
      expect(component.isModalOpen).toBeTrue();
      expect(component.isReasignacion).toBeFalse();
      expect(component.cursoSeleccionado).toBe(mockCursoLibre);
    });

    it('muestra warning si el curso está bloqueado', () => {
      component.openModalAsignar(mockCursoBloqueado);
      expect(component.isModalOpen).toBeFalse();
      expect(toastService.warning).toHaveBeenCalled();
    });
  });

  // ─── openModalReasignar ───────────────────────────────────────────────────

  describe('openModalReasignar()', () => {
    it('abre el modal en modo reasignación para un curso con ambiente', () => {
      component.openModalReasignar(mockCursoOcupado);
      expect(component.isModalOpen).toBeTrue();
      expect(component.isReasignacion).toBeTrue();
    });

    it('muestra warning si el curso no tiene ambiente asignado', () => {
      component.openModalReasignar(mockCursoLibre);
      expect(component.isModalOpen).toBeFalse();
      expect(toastService.warning).toHaveBeenCalled();
    });

    it('muestra warning si el curso está bloqueado', () => {
      component.openModalReasignar(mockCursoBloqueado);
      expect(component.isModalOpen).toBeFalse();
      expect(toastService.warning).toHaveBeenCalled();
    });
  });

  // ─── closeModal ───────────────────────────────────────────────────────────

  describe('closeModal()', () => {
    it('cierra el modal y limpia el estado', () => {
      component.isModalOpen       = true;
      component.cursoSeleccionado = mockCursoLibre;
      component.isSaving          = true;

      component.closeModal();

      expect(component.isModalOpen).toBeFalse();
      expect(component.cursoSeleccionado).toBeNull();
      expect(component.isSaving).toBeFalse();
    });
  });

  // ─── onAmbienteSeleccionado ───────────────────────────────────────────────

  describe('onAmbienteSeleccionado()', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
      component.cursoSeleccionado = mockCursoLibre;
      component.isReasignacion    = false;
    }));

    it('llama a assignSpace y muestra toast de éxito', fakeAsync(() => {
      courseSpaceService.assignSpace.and.returnValue(
        of({ ...mockCursoLibre, academicSpace: mockAmbienteDisponible, status: 'Ocupado' })
      );

      component.onAmbienteSeleccionado(mockAmbienteDisponible);
      tick();

      expect(courseSpaceService.assignSpace).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalled();
      expect(component.isModalOpen).toBeFalse();
    }));

    it('muestra error si la validación falla (ambiente bloqueado)', () => {
      component.onAmbienteSeleccionado(mockAmbienteBloqueado);
      expect(toastService.error).toHaveBeenCalled();
      expect(courseSpaceService.assignSpace).not.toHaveBeenCalled();
    });

    it('muestra error si la validación falla (aforo insuficiente)', () => {
      component.onAmbienteSeleccionado(mockAmbienteAforoInsuficiente);
      expect(toastService.error).toHaveBeenCalled();
      expect(courseSpaceService.assignSpace).not.toHaveBeenCalled();
    });

    it('muestra warning de equipamiento pero permite la asignación', fakeAsync(() => {
      const ambienteSinRecursos: AcademicSpace = {
        ...mockAmbienteDisponible,
        id_academic_space: 99,
        space_name: 'Aula sin recursos',
      };
      courseSpaceService.assignSpace.and.returnValue(
        of({ ...mockCursoLibre, academicSpace: ambienteSinRecursos, status: 'Ocupado' })
      );

      component.onAmbienteSeleccionado(ambienteSinRecursos);
      tick();

      expect(toastService.warning).toHaveBeenCalled();
      expect(courseSpaceService.assignSpace).toHaveBeenCalled();
    }));

    it('no hace nada si cursoSeleccionado es null', () => {
      component.cursoSeleccionado = null;
      component.onAmbienteSeleccionado(mockAmbienteDisponible);
      expect(courseSpaceService.assignSpace).not.toHaveBeenCalled();
    });
  });

  // ─── toggleBloqueo ────────────────────────────────────────────────────────

  describe('toggleBloqueo()', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('bloquea un curso libre', fakeAsync(() => {
      courseSpaceService.updateStatus.and.returnValue(of(undefined));

      component.toggleBloqueo(mockCursoLibre);
      tick();

      expect(courseSpaceService.updateStatus).toHaveBeenCalledWith(
        mockCursoLibre.courseAssignmentCourse.idCourseAssignmentCourse,
        'Bloqueado'
      );
      expect(toastService.success).toHaveBeenCalled();
    }));

    it('desbloquea un curso bloqueado', fakeAsync(() => {
      courseSpaceService.updateStatus.and.returnValue(of(undefined));

      component.toggleBloqueo(mockCursoBloqueado);
      tick();

      expect(courseSpaceService.updateStatus).toHaveBeenCalledWith(
        mockCursoBloqueado.courseAssignmentCourse.idCourseAssignmentCourse,
        'Libre'
      );
      expect(toastService.success).toHaveBeenCalled();
    }));

    it('muestra error si updateStatus falla', fakeAsync(() => {
      courseSpaceService.updateStatus.and.returnValue(
        throwError(() => new Error('Error'))
      );

      component.toggleBloqueo(mockCursoLibre);
      tick();

      expect(toastService.error).toHaveBeenCalled();
    }));
  });

  // ─── asignacionAutomatica ─────────────────────────────────────────────────

  describe('asignacionAutomatica()', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('muestra info si todos los cursos ya tienen ambiente', () => {
      component.cursos = [mockCursoOcupado];
      component.asignacionAutomatica();
      expect(toastService.info).toHaveBeenCalledWith(
        jasmine.stringContaining('ya tienen ambiente')
      );
    });

    it('asigna automáticamente los cursos libres', fakeAsync(() => {
      courseSpaceService.assignSpace.and.returnValue(
        of({ ...mockCursoLibre, academicSpace: mockAmbienteDisponible, status: 'Ocupado' })
      );

      component.asignacionAutomatica();
      tick();

      expect(courseSpaceService.assignSpace).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalled();
    }));

    it('muestra warning cuando no hay ambiente compatible', fakeAsync(() => {
      // Todos los ambientes están bloqueados u ocupados
      component.ambientesDisponibles = [mockAmbienteBloqueado, mockAmbienteOcupado];

      component.asignacionAutomatica();
      tick();

      expect(toastService.warning).toHaveBeenCalled();
    }));
  });

  // ─── Helpers del template ─────────────────────────────────────────────────

  describe('Helpers del template', () => {
    it('getCursoNombre retorna el nombre del curso', () => {
      expect(component.getCursoNombre(mockCursoLibre)).toBe('Redes I');
    });

    it('getDocenteNombre retorna nombre completo del docente', () => {
      expect(component.getDocenteNombre(mockCursoLibre)).toBe('Juan Pérez');
    });

    it('getGrupoNombre retorna el nombre del grupo', () => {
      expect(component.getGrupoNombre(mockCursoLibre)).toBe('A');
    });

    it('getTipoAmbiente retorna "—" cuando no hay ambiente', () => {
      expect(component.getTipoAmbiente(mockCursoLibre)).toBe('—');
    });

    it('getTipoAmbiente retorna el tipo cuando hay ambiente', () => {
      expect(component.getTipoAmbiente(mockCursoOcupado)).toBe('Laboratorio');
    });

    it('getAmbienteNombre retorna null cuando no hay ambiente', () => {
      expect(component.getAmbienteNombre(mockCursoLibre)).toBeNull();
    });

    it('getAmbienteNombre retorna el nombre cuando hay ambiente', () => {
      expect(component.getAmbienteNombre(mockCursoOcupado)).toBe('Aula Ocupada');
    });

    it('getStatusClass retorna clase correcta para Libre', () => {
      expect(component.getStatusClass('Libre')).toContain('lime');
    });

    it('getStatusClass retorna clase correcta para Ocupado', () => {
      expect(component.getStatusClass('Ocupado')).toContain('amber');
    });

    it('getStatusClass retorna clase correcta para Bloqueado', () => {
      expect(component.getStatusClass('Bloqueado')).toContain('red');
    });
  });

  // ─── Escenarios de negocio ────────────────────────────────────────────────

  describe('Escenarios de negocio', () => {
    beforeEach(fakeAsync(() => {
      component.loadData();
      tick();
    }));

    it('ESCENARIO: Choque de horario — mismo ambiente asignado a dos cursos', () => {
      // Añadimos un curso activo con el ambiente 1 asignado
      const ambienteConflicto: AcademicSpace = { ...mockAmbienteDisponible, id_academic_space: 1 };
      const cursoConAmbiente: CourseSpaceAssignment = {
        ...mockCursoLibre,
        courseAssignmentCourse: {
          ...mockCursoLibre.courseAssignmentCourse,
          idCourseAssignmentCourse: 88,
        },
        academicSpace: ambienteConflicto,
        status: 'Ocupado',
      };
      component.cursos = [...component.cursos, cursoConAmbiente];

      const nuevoCurso: CourseSpaceAssignment = {
        ...mockCursoLibre,
        courseAssignmentCourse: {
          ...mockCursoLibre.courseAssignmentCourse,
          idCourseAssignmentCourse: 50,
        },
      };
      const error = component.validateAsignacion(nuevoCurso, ambienteConflicto);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('horario');
      expect(error!.message).toContain('Choque de horario');
    });

    it('ESCENARIO: Aforo insuficiente — ambiente con menos de 10 personas', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteAforoInsuficiente);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('aforo');
      expect(error!.message).toContain('Aforo insuficiente');
    });

    it('ESCENARIO: Equipamiento faltante — aviso pero no bloquea', fakeAsync(() => {
      const ambienteSinRecursos: AcademicSpace = {
        ...mockAmbienteDisponible,
        id_academic_space: 99,
        space_name: 'Aula sin recursos',
      };
      courseSpaceService.assignSpace.and.returnValue(
        of({ ...mockCursoLibre, academicSpace: ambienteSinRecursos, status: 'Ocupado' })
      );

      component.cursoSeleccionado = mockCursoLibre;
      component.isReasignacion    = false;
      component.onAmbienteSeleccionado(ambienteSinRecursos);
      tick();

      // Debe mostrar warning de equipamiento
      expect(toastService.warning).toHaveBeenCalledWith(
        jasmine.stringContaining('no tiene recursos')
      );
      // Pero la asignación debe proceder
      expect(courseSpaceService.assignSpace).toHaveBeenCalled();
    }));

    it('ESCENARIO: Falta de disponibilidad — ambiente bloqueado', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteBloqueado);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('disponibilidad');
      expect(error!.message).toContain('bloqueado');
    });

    it('ESCENARIO: Falta de disponibilidad — ambiente ocupado', () => {
      const error = component.validateAsignacion(mockCursoLibre, mockAmbienteOcupado);
      expect(error).not.toBeNull();
      expect(error!.type).toBe('disponibilidad');
      expect(error!.message).toContain('ocupado');
    });

    it('ESCENARIO: Reasignación exitosa', fakeAsync(() => {
      const nuevoAmbiente: AcademicSpace = {
        ...mockAmbienteDisponible,
        id_academic_space: 10,
        space_name: 'Lab 202',
      };
      courseSpaceService.updateAssignment.and.returnValue(
        of({ ...mockCursoOcupado, academicSpace: nuevoAmbiente })
      );

      component.cursoSeleccionado = mockCursoOcupado;
      component.isReasignacion    = true;
      component.onAmbienteSeleccionado(nuevoAmbiente);
      tick();

      expect(courseSpaceService.updateAssignment).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalledWith(
        jasmine.stringContaining('reasignado')
      );
    }));
  });
});
