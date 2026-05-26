import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ScheduleService } from '../../core/services/schedule.service';
import { ScheduleResponse } from '../../core/models/schedule.model';

export interface ScheduleCell {
  type: 'schedule' | 'empty' | 'skip';
  schedule?: ScheduleResponse;
  rowspan?: number;
  color?: string;
  borderColor?: string;
}

@Component({
  selector: 'app-mis-horarios',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './mis-horarios.component.html',
  styleUrl: './mis-horarios.component.css'
})
export class MisHorariosComponent implements OnInit {
  private scheduleService = inject(ScheduleService);

  days = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];
  timeSlots = [
    { label: '08:00', start: '08:00:00', end: '09:30:00' },
    { label: '09:30', start: '09:30:00', end: '11:00:00' },
    { label: '11:00', start: '11:00:00', end: '12:30:00' },
    { label: '12:30', start: '12:30:00', end: '14:00:00' },
    { label: '14:00', start: '14:00:00', end: '15:30:00' },
    { label: '15:30', start: '15:30:00', end: '17:00:00' }
  ];

  // Matriz 2D: grid[timeSlotIndex][dayIndex]
  grid: ScheduleCell[][] = [];
  isLoading = true;
  totalAttendance = 94.5; // Dummy data
  nextClass: ScheduleResponse | null = null; // Dummy data

  ngOnInit() {
    this.initEmptyGrid();
    this.loadSchedules();
  }

  private initEmptyGrid() {
    this.grid = [];
    for (let i = 0; i < this.timeSlots.length; i++) {
      const row: ScheduleCell[] = [];
      for (let j = 0; j < this.days.length; j++) {
        row.push({ type: 'empty' });
      }
      this.grid.push(row);
    }
  }

  private loadSchedules() {
    this.isLoading = true;
    this.scheduleService.findAll().subscribe({
      next: (schedules) => {
        this.populateGrid(schedules);
        this.calculateNextClass(schedules);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching schedules', err);
        this.isLoading = false;
      }
    });
  }

  private populateGrid(schedules: ScheduleResponse[]) {
    this.initEmptyGrid(); // Reset

    const colors = [
      { bg: '#e8eacc', border: '#d4d8a1' },
      { bg: '#b6c335', border: '#a3b02c' },
      { bg: '#d4e2a2', border: '#c2cf92' }
    ];

    let colorIndex = 0;

    schedules.forEach(schedule => {
      const dayIdx = this.days.findIndex(d => d === schedule.dayOfWeek?.toUpperCase());
      if (dayIdx === -1) return;

      const startTimePrefix = schedule.startTime?.substring(0, 5) || '';
      const timeIdx = this.timeSlots.findIndex(t => t.start.startsWith(startTimePrefix));
      
      if (timeIdx === -1) return;

      // Calcular rowspan basado en duración en minutos (aprox)
      let rowspan = 1;
      if (schedule.startTime && schedule.endTime) {
        const start = this.parseTime(schedule.startTime);
        const end = this.parseTime(schedule.endTime);
        const durationMins = end - start;
        rowspan = Math.max(1, Math.ceil(durationMins / 90)); // Cada bloque es de 90 mins
      }

      const color = colors[colorIndex % colors.length];
      colorIndex++;

      this.grid[timeIdx][dayIdx] = {
        type: 'schedule',
        schedule: {
          ...schedule,
          // Si el backend no los provee, usar placeholders por ahora
          courseName: schedule.courseName || 'Curso ' + (schedule.idCourseAssignment || 'X'),
          spaceName: schedule.spaceName || 'Aula ' + (schedule.idAcademicSpace || 'Y')
        },
        rowspan,
        color: schedule.colorHex || color.bg,
        borderColor: schedule.borderColorHex || color.border
      };

      // Rellenar celdas "skip" hacia abajo
      for (let r = 1; r < rowspan; r++) {
        if (timeIdx + r < this.timeSlots.length) {
          this.grid[timeIdx + r][dayIdx] = { type: 'skip' };
        }
      }
    });
  }

  private parseTime(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return 0;
  }

  private calculateNextClass(schedules: ScheduleResponse[]) {
    if (schedules.length > 0) {
      this.nextClass = {
        courseName: schedules[0].courseName || 'Cálculo Diferencial',
        spaceName: schedules[0].spaceName || 'Pab. D - 204'
      };
    }
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    return time.substring(0, 5); // '08:00:00' -> '08:00'
  }
}
