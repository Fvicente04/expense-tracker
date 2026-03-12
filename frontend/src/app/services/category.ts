import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Category, CreateCategoryRequest } from '../models/category';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = environment.apiUrl + '/categories';
  private cache: Category[] | null = null;

  constructor(private http: HttpClient) {}

  invalidate(): void { this.cache = null; }

  getAll(): Observable<Category[]> {
    if (this.cache) return of(this.cache);
    return this.http.get<Category[]>(this.apiUrl).pipe(
      tap(data => this.cache = data)
    );
  }

  getById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  create(category: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category).pipe(
      tap(() => this.invalidate())
    );
  }

  update(id: string, category: Partial<CreateCategoryRequest>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category).pipe(
      tap(() => this.invalidate())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.invalidate())
    );
  }
}