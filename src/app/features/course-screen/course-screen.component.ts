import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-course-screen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './course-screen.component.html',
  styleUrls: ['./course-screen.component.css'],
})
export class CourseScreenComponent implements OnInit {
  readonly brand = '#BFC621';
  isChildRouteActive = false;

  cards = [
    {
      key: 'academic-structure',
      title: 'Estructura Académica',
      desc: 'Configura y gestiona las escuelas profesionales de la facultad, sus ciclos de estudio y los grupos de estudiantes en una sola vista unificada.',
      route: 'academic-structure',
      cta: 'Ir a Estructura Académica',
      iconPath:
        'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      key: 'course-management',
      title: 'Gestionar Cursos',
      desc: 'Administra todas las asignaturas de la oferta curricular, los planes de estudio correspondientes y las clasificaciones por tipo de curso.',
      route: 'course-management',
      cta: 'Ir a Cursos',
      iconPath:
        'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      key: 'teacher',
      title: 'Crear Docente',
      desc: 'Añade nuevos docentes al sistema y gestiona sus asignaciones académicas de cursos.',
      route: 'teacher',
      cta: 'Ir a Docentes',
      iconPath:
        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];
  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.checkChildRoute();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkChildRoute();
      });
  }

  checkChildRoute() {
    this.isChildRouteActive = this.route.children.length > 0;
  }

  go(route: string) {
    if (!route) return;
    this.router.navigate([route], { relativeTo: this.route });
  }
}
