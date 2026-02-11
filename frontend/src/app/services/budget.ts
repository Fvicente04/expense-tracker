import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Budget } from '../models/budget';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private apiUrl = `${environment.apiUrl}/budgets`;

  constructor(private http: HttpClient) {}

  private transformBudget(b: any): Budget {
    return {
      ...b,
      userId: b.user_id,
      categoryId: b.category_id
    };
  }

  getAll(): Observable<Budget[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(budgets => budgets.map(b => this.transformBudget(b)))
    );
  }

  getById(id: string): Observable<Budget> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(b => this.transformBudget(b))
    );
  }

  create(budget: any): Observable<Budget> {
    return this.http.post<any>(this.apiUrl, budget).pipe(
      map(b => this.transformBudget(b))
    );
  }

  update(id: string, budget: any): Observable<Budget> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, budget).pipe(
      map(b => this.transformBudget(b))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}