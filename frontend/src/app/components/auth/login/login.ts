import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error   = '';
  sessionExpired = false;
  showPwd = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public lang: LanguageService
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.sessionExpired = params['reason'] === 'session_expired';
    });
  }

  togglePwd(): void { this.showPwd = !this.showPwd; }

  fieldErr(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl?.touched || ctrl.valid) return null;
    if (ctrl.errors?.['required'])  return field === 'email' ? 'val.emailRequired' : 'val.passwordRequired';
    if (ctrl.errors?.['email'])     return 'val.emailInvalid';
    if (ctrl.errors?.['minlength']) return 'val.passwordMin';
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
        this.error   = err.status === 401 ? 'auth.invalidCredentials' : 'auth.loginError';
        this.loading = false;
      }
    });
  }
}
