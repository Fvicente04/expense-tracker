import { Injectable, signal } from '@angular/core';
import { en } from '../i18n/en';
import { ptBR } from '../i18n/pt-BR';

export type Language = 'en' | 'pt-BR';

const TRANSLATIONS: Record<Language, Record<string, string>> = { en, 'pt-BR': ptBR };
const STORAGE_KEY = 'app_language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private _lang = signal<Language>(
    (localStorage.getItem(STORAGE_KEY) as Language) || 'en'
  );

  get currentLang(): Language { return this._lang(); }

  setLanguage(lang: Language): void {
    this._lang.set(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const dict = TRANSLATIONS[this._lang()];
    let text = dict[key] ?? en[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }
}
