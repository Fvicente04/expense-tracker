import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BankConnection, Institution } from '../models/bank-connection';

@Injectable({ providedIn: 'root' })
export class BankService {
  private apiUrl = `${environment.apiUrl}/bank`;
  private cache: BankConnection[] | null = null;

  constructor(private http: HttpClient) {}

  invalidate(): void { this.cache = null; }

  getConnections(): Observable<BankConnection[]> {
    if (this.cache) return of(this.cache);
    return this.http.get<BankConnection[]>(this.apiUrl).pipe(tap(d => this.cache = d));
  }

  connect(displayName: string): Observable<{ authUrl: string }> {
    return this.http.post<{ authUrl: string }>(`${this.apiUrl}/connect`, { displayName });
  }

  sync(connectionId: string): Observable<{ imported: number; skipped: number }> {
    return this.http.post<{ imported: number; skipped: number }>(`${this.apiUrl}/${connectionId}/sync`, {}).pipe(
      tap(() => this.invalidate())
    );
  }

  delete(connectionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${connectionId}`).pipe(tap(() => this.invalidate()));
  }
}
