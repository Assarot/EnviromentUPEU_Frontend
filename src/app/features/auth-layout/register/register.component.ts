import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  themeService = inject(ThemeService);
  isSubmitting = false;
  username = '';
  password = '';
  confirmPassword = '';
  userProfileId = 1;

  constructor(private router: Router, private authService: AuthService) {}

  onSubmit(form: any): void {
    if (!form.valid || this.isSubmitting) return;
    if (!this.username || !this.password || this.password !== this.confirmPassword) return;

    this.isSubmitting = true;
    this.authService
      .register({ username: this.username, password: this.password, userProfileId: this.userProfileId })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/register-success']);
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
  }
}
