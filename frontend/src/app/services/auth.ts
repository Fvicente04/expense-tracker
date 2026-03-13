import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { TransactionService } from './transaction';
import { CategoryService } from './category';
import { BudgetService } from './budget';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private tokenKey = 'auth_token';
  private userSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private budgetService: BudgetService
  ) {
    this.fetchUser();
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data).pipe(
      tap((res: any) => {
        if (res.token) {
          this.clearAllCaches();
          this.setToken(res.token);
          this.fetchUser();
        }
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res.token) {
          this.clearAllCaches();
          this.setToken(res.token);
          this.fetchUser();
        }
      })
    );
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`);
  }

  private fetchUser(): void {
    if (!this.getToken()) return;
    this.getCurrentUser().subscribe({
      next: user => this.userSubject.next(user),
      error: () => this.userSubject.next(null)
    });
  }

  logout(): void {
    this.clearAllCaches();
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  private clearAllCaches(): void {
  this.transactionService.invalidate();
  this.categoryService.invalidate();
  this.budgetService.invalidate();
}

  setToken(token: string): void { localStorage.setItem(this.tokenKey, token); }
  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  isAuthenticated(): boolean { return !!this.getToken(); }
}