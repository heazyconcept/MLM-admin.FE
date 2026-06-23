import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalService } from './../../../core/services/modal.service';
import { AuthService } from './../../../core/services/auth.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    FloatLabelModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);

  loginForm: FormGroup;
  isLoading = false;

  // Brand assets
  logoUrl = 'assets/logo.png';
  backgroundImageUrl = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80';

  constructor() {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: () => {
          this.isLoading = false;

          if (this.authService.mustChangePassword()) {
            this.router.navigate(['/change-password']);
            return;
          }

          this.modalService.open('success', 'Login Successful', 'You have successfully signed in to your account.');
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 1500);
        },
        error: () => {
          this.isLoading = false;
          this.modalService.open('error', 'Login Failed', 'Invalid username or password. Please try again.');
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
      this.modalService.open('error', 'Validation Error', 'Please fill in all required fields correctly.');
    }
  }
}
