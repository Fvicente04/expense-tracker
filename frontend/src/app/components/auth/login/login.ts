import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error   = '';
  showPwd = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePwd(): void { this.showPwd = !this.showPwd; }

  fieldErr(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.touched || ctrl.valid) return null;
    if (ctrl.errors?.['required'])  return `${field === 'email' ? 'Email' : 'Password'} is required`;
    if (ctrl.errors?.['email'])     return 'Please enter a valid email';
    if (ctrl.errors?.['minlength']) return 'Password must be at least 6 characters';
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.loading = true;
    this.error   = '';
    this.auth.login(this.form.value).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (err: any) => {
        this.error   = err.error?.message || 'Invalid email or password';
        this.loading = false;
      }
    });
  }
}