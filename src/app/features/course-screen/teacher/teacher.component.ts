import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Teacher } from '../../../core/models/teacher';
import { TeacherService } from '../../../core/services/teacher.service';
import { UserService } from '../../../core/services/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teacher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher.component.html',
  styleUrls: ['./teacher.component.css'],
})
export class TeacherComponent implements OnInit {
  private service = inject(TeacherService);
  private userService = inject(UserService);
  private router = inject(Router);

  teachers: Teacher[] = [];
  users: any[] = [];

  name = '';
  lastName = '';
  email = '';
  authUserId: number | '' = '';

  editingId?: number | null = null;
  editingName = '';
  editingLastName = '';
  editingEmail = '';
  editingAuthUserId: number | '' = '';

  pendingDeleteId?: number | null = null;
  pendingDeleteName = '';
  lastDeleted?: Teacher | null = null;
  popupStyle: { [k: string]: string } | null = null;

  showToast = false;
  toastMessage = '';
  toastTimer: any = null;
  toastHasUndo = false;

  ngOnInit(): void {
    this.load();
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        this.users = res || [];
      },
      error: () => (this.users = [])
    });
  }

  load(): void {
    this.service.getTeachers().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        this.teachers = items.map(
          (item: any, idx: number) =>
            new Teacher(
              item.name ?? '',
              item.lastName ?? '',
              item.email ?? '',
              item.idTeacher ?? item.id ?? idx + 1,
              item.authUserId
            )
        );
      },
      error: () => (this.teachers = []),
    });
  }

  getUserName(id?: number): string {
    if (!id) return 'Ninguno';
    const u = this.users.find((user) => user.id === id);
    return u ? `${u.names} ${u.lastName}` : 'Desconocido';
  }

  create(): void {
    const n = this.name.trim();
    const ln = this.lastName.trim();
    const em = this.email.trim();
    const aId = this.authUserId ? Number(this.authUserId) : undefined;
    if (!n || !ln || !em) return;
    this.service.createTeacher({ name: n, lastName: ln, email: em, authUserId: aId }).subscribe({
      next: () => {
        this.name = '';
        this.lastName = '';
        this.email = '';
        this.authUserId = '';
        this.load();
      },
      error: () =>
        this.showTransientToast('Error al crear docente', 3000, false),
    });
  }

  edit(t: Teacher): void {
    this.editingId = t.idTeacher;
    this.editingName = t.name;
    this.editingLastName = t.lastName;
    this.editingEmail = t.email;
    this.editingAuthUserId = t.authUserId || '';
  }
  cancel(): void {
    this.editingId = null;
    this.editingName = '';
    this.editingLastName = '';
    this.editingEmail = '';
    this.editingAuthUserId = '';
  }
  save(): void {
    if (this.editingId == null) return;
    const n = this.editingName.trim();
    const ln = this.editingLastName.trim();
    const em = this.editingEmail.trim();
    const aId = this.editingAuthUserId ? Number(this.editingAuthUserId) : undefined;
    if (!n || !ln || !em) return;
    this.service
      .updateTeacher(this.editingId, { name: n, lastName: ln, email: em, authUserId: aId })
      .subscribe({
        next: () => {
          this.cancel();
          this.load();
        },
        error: () =>
          this.showTransientToast('Error al actualizar', 3000, false),
      });
  }

  confirmRemove(t: Teacher, ev?: MouseEvent): void {
    this.pendingDeleteId = t.idTeacher ?? null;
    this.pendingDeleteName = `${t.name} ${t.lastName}`;
    this.lastDeleted = new Teacher(t.name, t.lastName, t.email, t.idTeacher);
    try {
      const btn = ev?.currentTarget as HTMLElement | undefined;
      const react = btn ? btn.getBoundingClientRect() : undefined;
      const popupW = 224;
      const popupH = 96;
      let top: number;
      let left: number;
      if (react) {
        if (react.top > popupH + 20) {
          top = react.top - popupH - 8;
        } else {
          top = react.bottom + 8;
        }
        left = react.left + react.width / 2 - popupW / 2;
        const minLeft = 8;
        const maxLeft = Math.max(8, window.innerWidth - popupW - 8);
        if (left < minLeft) left = minLeft;
        if (left > maxLeft) left = maxLeft;
      } else {
        top = Math.max(8, window.innerHeight / 2 - popupH / 2);
        left = Math.max(8, window.innerWidth / 2 - popupW / 2);
      }
      this.popupStyle = {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
      };
    } catch (e) {
      this.popupStyle = null;
    }
  }

  cancelRemove(): void {
    this.pendingDeleteId = null;
    this.pendingDeleteName = '';
    this.popupStyle = null;
  }

  performDeleteConfirmed(): void {
    if (!this.pendingDeleteId) return;
    const id = this.pendingDeleteId;
    this.service.deleteTeacher(id).subscribe({
      next: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.load();
        this.showTransientToast('Eliminado correctamente', 5000, true);
      },
      error: () => {
        this.pendingDeleteId = null;
        this.pendingDeleteName = '';
        this.showTransientToast('Error al eliminar', 3000, false);
      },
    });
  }

  private showTransientToast(
    message: string,
    ms = 3000,
    undoable = false
  ): void {
    this.toastMessage = message;
    this.showToast = true;
    this.toastHasUndo = undoable;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.toastMessage = '';
      this.toastHasUndo = false;
      this.toastTimer = null;
    }, ms);
  }

  undoDelete(): void {
    if (!this.lastDeleted) return;
    const payload = {
      name: this.lastDeleted.name,
      lastName: this.lastDeleted.lastName,
      email: this.lastDeleted.email,
      authUserId: this.lastDeleted.authUserId
    };
    this.service.createTeacher(payload).subscribe({
      next: () => {
        this.load();
        this.showTransientToast('Restaurado', 3000, false);
        this.lastDeleted = null;
      },
      error: () => this.showTransientToast('Error al restaurar', 3000, false),
    });
  }

}
