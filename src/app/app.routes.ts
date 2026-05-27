import { Routes } from '@angular/router';
import { MainComponent } from './layout/main/main.component';
import { HomeComponent } from './home/home.component';
import { AuthLayoutComponent } from './features/auth-layout/auth-layout.component';
import { LoginComponent } from './features/auth-layout/login/login.component';
import { RegisterComponent } from './features/auth-layout/register/register.component';
import { RegisterSuccessComponent } from './features/auth-layout/register-success/register-success.component';
import { MenuComponent } from './features/menu/menu.component';
import { CargaAcademicaComponent } from './features/carga-academica/carga-academica.component';
import { ProximamenteComponent } from './features/proximamente/proximamente.component';
import { NotificacionesComponent } from './features/notificaciones/notificaciones.component';
import { ConfiguracionComponent } from './features/configuracion/configuracion.component';
import { MisHorariosComponent } from './features/mis-horarios/mis-horarios.component';
import { ReservarSalonComponent } from './features/reservar-salon/reservar-salon.component';
import { MisSolicitudesComponent } from './features/mis-solicitudes/mis-solicitudes.component';
import { NotificarIncidenciasComponent } from './features/notificar-incidencias/notificar-incidencias.component';
import { EnvScreenComponent } from './features/env-screen/env-screen.component';
import { TypeEnvComponent } from './features/env-screen/type-env/type-env.component';
import { AmbienteComponent } from './features/env-screen/ambiente/ambiente.component';
import { BuildingComponent } from './features/env-screen/building/building.component';
import { FloorComponent } from './features/env-screen/floor/floor.component';
import { StateComponent } from './features/env-screen/state/state.component';
import { ResourcesStateComponent } from './features/resource-screen/resource-state/resource-state.component';
import { ResourceScreenComponent } from './features/resource-screen/resource-screen.component';
import { ResourceComponent } from './features/resource-screen/resource/resource.component';
import { ResourceTypeComponent } from './features/resource-screen/resource-type/resource-type.component';
import { ResourceCategoryComponent } from './features/resource-screen/resource-category/resource-category.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { UsersComponent } from './features/users/users.component';
import { UserDetailComponent } from './features/users/user-detail/user-detail.component';
import { UserManagementComponent } from './features/user-management/user-management.component';
import { ResourceEnvComponent } from './features/resource-env/resource-env.component';
import { CourseScreenComponent } from './features/course-screen/course-screen.component';
import { FacultyComponent } from './features/course-screen/faculty/faculty.component';
import { ProfessionalSchoolComponent } from './features/course-screen/professional-school/professional-school.component';
import { CycleComponent } from './features/course-screen/cycle/cycle.component';
import { GroupComponent } from './features/course-screen/group/group.component';
import { CourseComponent } from './features/course-screen/course/course.component';
import { TeacherComponent } from './features/course-screen/teacher/teacher.component';
import { CourseTypeComponent } from './features/course-screen/course-type/course-type.component';
import { PlanComponent } from './features/course-screen/plan/plan.component';
import { AcademicStructureComponent } from './features/course-screen/academic-structure/academic-structure.component';
import { CourseManagementCombinedComponent } from './features/course-screen/course-management-combined/course-management-combined.component';

export const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },

  // Ruta independiente para register-success (pantalla completa)
  { path: 'register-success', component: RegisterSuccessComponent },

  {
    path: 'main',
    component: MainComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'menu', pathMatch: 'full' },
      { path: 'menu', component: MenuComponent },
      { path: 'home', component: HomeComponent },
      { path: 'carga-academica', component: CargaAcademicaComponent },
      { path: 'mis-horarios', component: MisHorariosComponent },
      { path: 'reservar-salon', component: ReservarSalonComponent },
      { path: 'mis-solicitudes', component: MisSolicitudesComponent },
      { path: 'notificar-incidencias', component: NotificarIncidenciasComponent },
      { path: 'proximamente', component: ProximamenteComponent },
      { path: 'notificaciones', component: NotificacionesComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
      { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
      {
        path: 'users/:id',
        component: UserDetailComponent,
        canActivate: [adminGuard],
      },
      {
        path: 'user-management',
        component: UserManagementComponent,
        canActivate: [adminGuard],
      },

      // Env-creation con rutas hijas
      {
        path: 'env-creation',
        component: EnvScreenComponent,
        children: [
          { path: 'environment', component: AmbienteComponent },
          { path: 'type-environment', component: TypeEnvComponent },
          { path: 'buildings', component: BuildingComponent },
          { path: 'floors', component: FloorComponent },
          { path: 'states', component: StateComponent },
          { path: 'resource-state', component: ResourcesStateComponent },
        ],
      },

      // Res-creation con rutas hijas
      {
        path: 'res-creation',
        component: ResourceScreenComponent,
        children: [
          { path: 'resources', component: ResourceComponent },
          { path: 'states', component: ResourcesStateComponent },
          { path: 'types', component: ResourceTypeComponent },
          { path: 'categories', component: ResourceCategoryComponent },
        ],
      },
      { path: 'res-assign', component: ResourceEnvComponent },

      // Res-creation con rutas hijas
      {
        path: 'res-creation',
        component: ResourceScreenComponent,
        children: [
          { path: 'resources', component: ResourceComponent },
          { path: 'states', component: ResourcesStateComponent },
          { path: 'types', component: ResourceTypeComponent },
          { path: 'categories', component: ResourceCategoryComponent },
        ],
      },

      {
        path: 'course-creation',
        component: CourseScreenComponent,
        children: [
          {
            path: 'faculty',
            component: FacultyComponent,
          },
          {
            path: 'academic-structure',
            component: AcademicStructureComponent,
          },
          {
            path: 'course-management',
            component: CourseManagementCombinedComponent,
          },
          {
            path: 'teacher',
            component: TeacherComponent,
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
