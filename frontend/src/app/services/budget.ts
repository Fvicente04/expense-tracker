import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Budget } from '../models/budget';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private apiUrl = `${environment.apiUrl}/budgets`;
  private cache: Budget[] | null = null;

  constructor(private http: HttpClient) {}

  private normalize(b: any): Budget {
    return { ...b, userId: b.user_id, categoryId: b.category_id };
  }

  invalidate(): void { this.cache = null; }

  getAll(): Observable<Budget[]> {
    if (this.cache) return of(this.cache);
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(bs => bs.map(b => this.normalize(b))),
      tap(data => this.cache = data)
    );
  }

  getById(id: string): Observable<Budget> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(b => this.normalize(b)));
  }

  create(budget: any): Observable<Budget> {
    return this.http.post<any>(this.apiUrl, budget).pipe(
      map(b => this.normalize(b)),
      tap(() => this.invalidate())
    );
  }

  update(id: string, budget: any): Observable<Budget> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, budget).pipe(
      map(b => this.normalize(b)),
      tap(() => this.invalidate())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.invalidate())
    );
  }
}