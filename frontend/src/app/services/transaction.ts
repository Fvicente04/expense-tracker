import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Transaction, CreateTransactionRequest, UpdateTransactionRequest } from '../models/transaction';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private apiUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  private normalize(t: any): Transaction {
    return { ...t, userId: t.user_id || t.userId, categoryId: t.category_id || t.categoryId };
  }

  getAll(): Observable<Transaction[]> {
    return this.http.get<any[]>(this.apiUrl).pipe(map(ts => ts.map(t => this.normalize(t))));
  }

  getById(id: string): Observable<Transaction> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(map(t => this.normalize(t)));
  }

  create(transaction: CreateTransactionRequest): Observable<Transaction> {
    return this.http.post<any>(this.apiUrl, transaction).pipe(map(t => this.normalize(t)));
  }

  update(id: string, transaction: UpdateTransactionRequest): Observable<Transaction> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, transaction).pipe(map(t => this.normalize(t)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}