import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Transaction, CreateTransactionRequest, UpdateTransactionRequest } from '../models/transaction';

export interface PageFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  categoryId?: string;
  bankConnectionId?: string;
  showFuture?: boolean;
  search?: string;
}

export interface PageResult {
  data: Transaction[];
  total: number;
  page: number;
  pages: number;
  summary: { totalIncome: number; totalExpenses: number; balance: number };
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private apiUrl = `${environment.apiUrl}/transactions`;
  private cache: Transaction[] | null = null;

  constructor(private http: HttpClient) {}

  private normalize(t: any): Transaction {
    return { ...t, userId: t.user_id || t.userId, categoryId: t.category_id || t.categoryId };
  }

  invalidate(): void { this.cache = null; }

  getAll(): Observable<Transaction[]> {
    if (this.cache) return of(this.cache);
    return this.http.get<any[]>(this.apiUrl).pipe(
      map(ts => ts.map(t => this.normalize(t))),
      tap(data => this.cache = data)
    );
  }

  getById(id: string): Observable<Transaction> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(t => this.normalize(t)));
  }

  create(transaction: CreateTransactionRequest): Observable<Transaction> {
    return this.http.post<any>(this.apiUrl, transaction).pipe(
      map(t => this.normalize(t)),
      tap(() => this.invalidate())
    );
  }

  update(id: string, transaction: UpdateTransactionRequest): Observable<Transaction> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, transaction).pipe(
      map(t => this.normalize(t)),
      tap(() => this.invalidate())
    );
  }

  updateSeries(id: string, transaction: UpdateTransactionRequest): Observable<Transaction> {
    return this.http.put<any>(`${this.apiUrl}/${id}?updateSeries=true`, transaction).pipe(
      map(t => this.normalize(t)),
      tap(() => this.invalidate())
    );
  }

  delete(id: string, deleteSeries = false): Observable<void> {
    const url = deleteSeries ? `${this.apiUrl}/${id}?deleteSeries=true` : `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url).pipe(tap(() => this.invalidate()));
  }

  private buildParams(filters: PageFilters, extra?: Record<string, string>): HttpParams {
    let p = new HttpParams();
    if (filters.startDate) p = p.set('startDate', filters.startDate);
    if (filters.endDate)   p = p.set('endDate', filters.endDate);
    if (filters.type)      p = p.set('type', filters.type);
    if (filters.categoryId)       p = p.set('categoryId', filters.categoryId);
    if (filters.bankConnectionId) p = p.set('bankConnectionId', filters.bankConnectionId);
    if (filters.showFuture === false) p = p.set('showFuture', 'false');
    if (filters.search)     p = p.set('search', filters.search);
    if (extra) Object.entries(extra).forEach(([k, v]) => p = p.set(k, v));
    return p;
  }

  getPage(filters: PageFilters & { page?: number; limit?: number }): Observable<PageResult> {
    const { page, limit, ...rest } = filters;
    const extra: Record<string, string> = {};
    if (page  !== undefined) extra['page']  = String(page);
    if (limit !== undefined) extra['limit'] = String(limit);
    const params = this.buildParams(rest, extra);
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => ({
        data: (res.data as any[]).map(t => this.normalize(t)),
        total: res.total,
        page: res.page,
        pages: res.pages,
        summary: res.summary
      }))
    );
  }

  getFiltered(filters: PageFilters): Observable<Transaction[]> {
    const params = this.buildParams(filters);
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(ts => ts.map(t => this.normalize(t)))
    );
  }

  importPreview(csvText: string): Observable<{ transactions: any[]; categories: any[] }> {
    return this.http.post<any>(`${this.apiUrl}/import/preview`, { csvText });
  }

  importConfirm(transactions: any[]): Observable<{ imported: number; skipped: number; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/import/confirm`, { transactions }).pipe(
      tap(() => this.invalidate())
    );
  }
}