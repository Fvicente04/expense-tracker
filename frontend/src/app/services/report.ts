import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export interface CategoryReport {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

export interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  getSummary(startDate?: string, endDate?: string): Observable<ReportSummary> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<ReportSummary>(`${this.apiUrl}/summary`, { params });
  }

  getByCategory(type: 'income' | 'expense', startDate?: string, endDate?: string): Observable<CategoryReport[]> {
    const params: any = { type };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<CategoryReport[]>(`${this.apiUrl}/by-category`, { params });
  }

  getMonthlyTrend(months = 6): Observable<MonthlyReport[]> {
    return this.http.get<MonthlyReport[]>(`${this.apiUrl}/monthly-trend`, {
      params: { months: months.toString() }
    });
  }
}