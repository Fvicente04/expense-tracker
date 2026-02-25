import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = 'dark_mode';

  constructor() {
    if (this.isDark()) document.body.classList.add('dark-mode');
  }

  isDark(): boolean {
    return localStorage.getItem(this.key) === 'true';
  }

  toggle(): void {
    const dark = !this.isDark();
    localStorage.setItem(this.key, String(dark));
    document.body.classList.toggle('dark-mode', dark);
  }
}