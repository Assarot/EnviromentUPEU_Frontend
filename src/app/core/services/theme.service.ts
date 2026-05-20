import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'upeu-theme';

  // Signal reactivo del tema actual
  theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Aplicar el tema al body cada vez que cambie
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
    localStorage.setItem(this.STORAGE_KEY, this.theme());
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private getInitialTheme(): Theme {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme;
    if (stored === 'dark' || stored === 'light') return stored;
    // Default: preferencia del sistema, sino dark
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    const body = document.documentElement;
    body.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }
}
