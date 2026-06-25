import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Goal, CreateGoalRequest } from '../models/goal';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private apiUrl = `${environment.apiUrl}/goals`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Goal[]> {
    return this.http.get<Goal[]>(this.apiUrl);
  }

  create(payload: CreateGoalRequest): Observable<Goal> {
    return this.http.post<Goal>(this.apiUrl, payload);
  }

  update(id: string, payload: Partial<CreateGoalRequest>): Observable<Goal> {
    return this.http.put<Goal>(`${this.apiUrl}/${id}`, payload);
  }

  deposit(id: string, amount: number): Observable<Goal> {
    return this.http.patch<Goal>(`${this.apiUrl}/${id}/deposit`, { amount });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
