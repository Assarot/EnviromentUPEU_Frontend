import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  collapsed = signal<boolean>(false);
  modalOpen = signal<boolean>(false);

  toggle(): void {
    this.collapsed.set(!this.collapsed());
  }

  setCollapsed(val: boolean): void {
    this.collapsed.set(val);
  }
}
