import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CourseComponent } from '../course/course.component';
import { PlanComponent } from '../plan/plan.component';
import { CourseTypeComponent } from '../course-type/course-type.component';
import { SidebarService } from '../../../core/services/sidebar.service';

@Component({
  selector: 'app-course-management-combined',
  standalone: true,
  imports: [
    CommonModule,
    CourseComponent,
    PlanComponent,
    CourseTypeComponent
  ],
  templateUrl: './course-management-combined.component.html',
  styleUrls: ['./course-management-combined.component.css']
})
export class CourseManagementCombinedComponent {
  private router = inject(Router);
  sidebarService = inject(SidebarService);
  activeTab: 'course' | 'plan' | 'type' = 'course';
  readonly brand = '#BFC621';

  setTab(tab: 'course' | 'plan' | 'type'): void {
    this.activeTab = tab;
  }

  volver(): void {
    this.router.navigate(['/main/course-creation']);
  }
}
