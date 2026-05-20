import { Component, inject } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/auth.model';
import { UserService } from '../../../core/services/user.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  themeService = inject(ThemeService);
  horariosExpanded = false;
  currentRoute = '';
  currentUser: User | null = null;
  profileImageUrl: string | null = null;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });

    // Suscribirse al usuario actual
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // el usuario autenticado contiene `userProfileId` que apunta al perfil
      // usar `userProfileId` en lugar de `id` para cargar la foto de perfil
      const profileId =
        (user as any)?.userProfileId ??
        (user as any)?.userProfile?.id ??
        (user as any)?.id;
      if (profileId) {
        this.loadUserProfile(profileId);
      }
    });
  }

  loadUserProfile(id: number | string) {
    this.userService.getUser(id).subscribe({
      next: (profile) => {
        // Asignamos la foto usando la propiedad que mapea tu servicio
        this.profileImageUrl = profile.profilePicture || null;
      },
      error: (err) => console.error('Error cargando perfil', err),
    });
  }

  onProfileImageError() {
    this.profileImageUrl = null;
  }

  toggleHorarios() {
    this.horariosExpanded = !this.horariosExpanded;
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logout exitoso');
      },
      error: (error) => {
        console.error('Error en logout', error);
      },
    });
  }

  getUserRole(): string {
    return this.currentUser?.roles?.[0]?.name || 'Usuario';
  }

  hasRole(roleName: string): boolean {
    return this.authService.hasRole(roleName);
  }

  isAsacad(): boolean {
    return this.hasRole('ASACAD');
  }

  isCoorooms(): boolean {
    return this.hasRole('COOROOMS');
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }
}
