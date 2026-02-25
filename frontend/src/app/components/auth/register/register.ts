import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

function pwdMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  form: FormGroup;
  loading      = false;
  error        = '';
  showPwd      = false;
  showConfPwd  = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name:            ['', [Validators.required, Validators.minLength(2)]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: pwdMatch });
  }

  togglePwd():     void { this.showPwd     = !this.showPwd; }
  toggleConfPwd(): void { this.showConfPwd = !this.showConfPwd; }

  pwdStrength(): number {
    const pw = this.form.get('password')?.value ?? '';
    if (pw.length < 6) return pw.length > 0 ? 1 : 0;
    let score = 1;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  fieldErr(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.touched) return null;
    if (field === 'confirmPassword' && this.form.errors?.['passwordMismatch']) return 'Passwords do not match';
    if (!ctrl.errors) return null;
    if (ctrl.errors['required'])  return `${field === 'name' ? 'Name' : field === 'email' ? 'Email' : 'Password'} is required`;
    if (ctrl.errors['email'])     return 'Please enter a valid email';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters required`;
    return null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.loading = true;
    this.error   = '';
    const { name, email, password } = this.form.value;
    this.auth.register({ name, email, password }).subscribe({
      next:  () => this.router.navigate(['/dashboard']),
      error: (err: any) => {
        this.error   = err.error?.message || 'Failed to create account';
        this.loading = false;
      }
    });
  }
}