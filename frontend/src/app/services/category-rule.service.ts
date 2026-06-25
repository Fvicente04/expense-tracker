import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategoryRule, CreateCategoryRuleRequest } from '../models/category-rule';

@Injectable({ providedIn: 'root' })
export class CategoryRuleService {
  private apiUrl = `${environment.apiUrl}/category-rules`;

  constructor(private http: HttpClient) {}

  getRules(): Observable<CategoryRule[]> {
    return this.http.get<CategoryRule[]>(this.apiUrl);
  }

  createRule(body: CreateCategoryRuleRequest): Observable<CategoryRule> {
    return this.http.post<CategoryRule>(this.apiUrl, body);
  }

  applyRules(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.apiUrl}/apply`, {});
  }

  deleteRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
