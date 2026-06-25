import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CreditCard, CreateCreditCardRequest, UpdateCreditCardRequest, CardPayment, MonthlyHistory, Subscription } from '../models/credit-card';
import { PageFilters, PageResult } from './transaction';

@Injectable({ providedIn: 'root' })
export class CreditCardService {
  private apiUrl = `${environment.apiUrl}/credit-cards`;
  private cache: CreditCard[] | null = null;

  constructor(private http: HttpClient) {}

  invalidate(): void { this.cache = null; }

  getAll(): Observable<CreditCard[]> {
    if (this.cache) return of(this.cache);
    return this.http.get<CreditCard[]>(this.apiUrl).pipe(tap(d => this.cache = d));
  }

  getById(id: string): Observable<CreditCard> {
    return this.http.get<CreditCard>(`${this.apiUrl}/${id}`);
  }

  create(card: CreateCreditCardRequest): Observable<CreditCard> {
    return this.http.post<CreditCard>(this.apiUrl, card).pipe(tap(() => this.invalidate()));
  }

  update(id: string, card: UpdateCreditCardRequest): Observable<CreditCard> {
    return this.http.put<CreditCard>(`${this.apiUrl}/${id}`, card).pipe(tap(() => this.invalidate()));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(tap(() => this.invalidate()));
  }

  getTransactions(id: string, filters: PageFilters & { page?: number; limit?: number }): Observable<PageResult> {
    const { page, limit, startDate, endDate, type, search } = filters;
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate)   params = params.set('endDate',   endDate);
    if (type)      params = params.set('type',      type);
    if (search)    params = params.set('search',    search);
    if (page  !== undefined) params = params.set('page',  String(page));
    if (limit !== undefined) params = params.set('limit', String(limit));
    return this.http.get<PageResult>(`${this.apiUrl}/${id}/transactions`, { params });
  }

  getMonthlyHistory(id: string): Observable<MonthlyHistory[]> {
    return this.http.get<MonthlyHistory[]>(`${this.apiUrl}/${id}/history`);
  }

  getSubscriptions(id: string): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/${id}/subscriptions`);
  }

  getPayments(id: string): Observable<CardPayment[]> {
    return this.http.get<CardPayment[]>(`${this.apiUrl}/${id}/payments`);
  }

  recordPayment(id: string, payment: Partial<CardPayment>): Observable<CardPayment> {
    return this.http.post<CardPayment>(`${this.apiUrl}/${id}/payments`, payment).pipe(tap(() => this.invalidate()));
  }

  deletePayment(cardId: string, paymentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${cardId}/payments/${paymentId}`).pipe(tap(() => this.invalidate()));
  }

  importPreview(id: string, csvText: string): Observable<{ transactions: any[]; categories: any[]; format: string }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/import/preview`, { csvText });
  }

  importConfirm(id: string, transactions: any[]): Observable<{ imported: number; skipped: number; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/${id}/import/confirm`, { transactions }).pipe(tap(() => this.invalidate()));
  }
}
