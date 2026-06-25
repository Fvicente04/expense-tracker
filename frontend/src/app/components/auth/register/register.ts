import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

function pwdMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.css'
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
    private router: Router,
    public lang: LanguageService
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

  strengthLabel(): string {
    const labels = ['', 'auth.strengthWeak', 'auth.strengthFair', 'auth.strengthGood', 'auth.strengthStrong'];
    return labels[this.pwdStrength()] || '';
  }

  fieldErr(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.touched) return null;
    if (field === 'confirmPassword' && this.form.errors?.['passwordMismatch']) return 'val.passwordMismatch';
    if (!ctrl.errors) return null;
    if (ctrl.errors['required']) {
      if (field === 'name') return 'val.nameRequired';
      if (field === 'email') return 'val.emailRequired';
      return 'val.passwordRequired';
    }
    if (ctrl.errors['email'])     return 'val.emailInvalid';
    if (ctrl.errors['minlength']) return field === 'name' ? 'val.nameMinLength' : 'val.passwordMin';
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
        const msg = err.error?.message || '';
        this.error = msg.toLowerCase().includes('already exists') ? 'auth.emailTaken' : 'auth.registerError';
        this.loading = false;
      }
    });
  }
}
