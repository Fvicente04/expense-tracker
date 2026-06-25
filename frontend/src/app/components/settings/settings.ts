import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../layout/navbar/navbar';
import { AuthService } from '../../services/auth';
import { LanguageService, Language } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { User } from '../../models/user';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent, TranslatePipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;

  profileSaving = false;
  passwordSaving = false;
  profileSuccess = '';
  profileError = '';
  passwordSuccess = '';
  passwordError = '';

  activeSection: 'profile' | 'security' | 'appearance' = 'profile';
  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  private _user: User | null = null;

  currencies = [
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'GBP', label: 'British Pound (£)' },
    { code: 'BRL', label: 'Brazilian Real (R$)' }
  ];

  get userInitials(): string {
    return (this._user?.name || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || '?';
  }

  get userName(): string  { return this._user?.name  || ''; }
  get userEmail(): string { return this._user?.email || ''; }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    public lang: LanguageService
  ) {
    this.profileForm = this.fb.group({
      name:     ['', [Validators.required, Validators.maxLength(50)]],
      currency: ['EUR', Validators.required]
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this._user = user;
        this.profileForm.patchValue({ name: user.name || '', currency: user.currency || 'EUR' });
      }
    });
  }

  private passwordsMatch(group: FormGroup): { mismatch: true } | null {
    const np = group.get('newPassword')?.value;
    const cp = group.get('confirmPassword')?.value;
    return np && cp && np !== cp ? { mismatch: true } : null;
  }

  setLanguage(lang: Language): void {
    this.lang.setLanguage(lang);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.profileSaving) return;
    this.profileSaving = true;
    this.profileSuccess = '';
    this.profileError = '';

    this.authService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.profileSaving = false;
        this.profileSuccess = this.lang.t('settings.profileSuccess');
      },
      error: err => {
        this.profileSaving = false;
        this.profileError = err?.error?.message || this.lang.t('settings.profileError');
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.passwordSaving) return;
    this.passwordSaving = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordSaving = false;
        this.passwordSuccess = this.lang.t('settings.passwordSuccess');
        this.passwordForm.reset();
        this.showCurrentPwd = false;
        this.showNewPwd = false;
        this.showConfirmPwd = false;
      },
      error: err => {
        this.passwordSaving = false;
        this.passwordError = err?.error?.message || this.lang.t('settings.passwordError');
      }
    });
  }
}
