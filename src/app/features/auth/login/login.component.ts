import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalService } from './../../../core/services/modal.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, FloatLabelModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private modalService = inject(ModalService);

  loginForm: FormGroup;
  isLoading = false;
  
  // Brand assets
  logoUrl = 'assets/logo.png';
  backgroundImageUrl = 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=80';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      
      setTimeout(() => {
        this.isLoading = false;
        
        if (this.loginForm.valid) {
          this.modalService.open('success', 'Login Successful', 'You have successfully signed in to your account.');
          setTimeout(() => {
            this.router.navigate(['/admin/dashboard']);
          }, 1500);
        } else {
          this.modalService.open('error', 'Login Failed', 'Please check your inputs and try again.');
        }
      }, 1000);
    } else {
      this.loginForm.markAllAsTouched();
      this.modalService.open('error', 'Validation Error', 'Please fill in all required fields correctly.');
    }
  }
}
