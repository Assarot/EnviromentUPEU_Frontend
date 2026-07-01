import { CourseType } from './course-type';
import { Group } from './group';
import { Plan } from './plan';

export class Course {
  idCourse?: number;
  name: string;
  code: string;
  description: string;
  duration: number;
  practicalHours: number;
  theoreticalHours: number;
  totalHours: number;
  courseType: CourseType;
  group: Group;
  plan: Plan;

  private parseDuration(val: any): number {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return 0;
    let hours = 0;
    const hMatch = val.match(/(\d+)H/);
    if (hMatch) hours += parseInt(hMatch[1], 10);
    return hours;
  }

  constructor(
    name: string,
    code: string,
    description: string,
    duration: number,
    practicalHours: number,
    theoreticalHours: number,
    totalHours: number,
    courseType: CourseType,
    group: Group,
    plan: Plan,
    idCourse?: number
  ) {
    if (idCourse) {
      this.idCourse = idCourse;
    }
    this.name = name;
    this.code = code;
    this.description = description;
    this.duration = this.parseDuration(duration);
    this.practicalHours = this.parseDuration(practicalHours);
    this.theoreticalHours = this.parseDuration(theoreticalHours);
    this.totalHours = this.parseDuration(totalHours);
    this.courseType = courseType;
    this.group = group;
    this.plan = plan;
  }
}
