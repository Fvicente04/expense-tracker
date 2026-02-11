import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { ReportService, ReportSummary, CategoryReport, MonthlyReport } from '../../../services/report';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './reports-view.html',
  styleUrls: ['./reports-view.css']
})
export class ReportsViewComponent implements OnInit, AfterViewInit {
  filterForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  viewInitialized = false;

  summary: ReportSummary = {
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    transactionCount: 0
  };

  expensesByCategory: CategoryReport[] = [];
  monthlyTrend: MonthlyReport[] = [];

  categoryChart: Chart | null = null;
  trendChart: Chart | null = null;

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    setTimeout(() => {
      this.loadReports();
    }, 100);
  }

  initForm(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.filterForm = this.fb.group({
      startDate: [this.formatDate(firstDayOfMonth)],
      endDate: [this.formatDate(lastDayOfMonth)]
    });
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onFilterChange(): void {
    this.loadReports();
  }

  loadReports(): void {
    if (!this.viewInitialized) return;

    this.isLoading = true;
    this.errorMessage = '';

    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    let summaryLoaded = false;
    let categoryLoaded = false;
    let trendLoaded = false;

    this.reportService.getSummary(startDate, endDate).subscribe({
      next: (data) => {
        this.summary = data;
        summaryLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading summary:', error);
        this.errorMessage = 'Failed to load summary';
        this.isLoading = false;
      }
    });

    this.reportService.getByCategory('expense', startDate, endDate).subscribe({
      next: (data) => {
        this.expensesByCategory = data;
        categoryLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading category report:', error);
        categoryLoaded = true;
        this.checkAllLoaded();
      }
    });

    this.reportService.getMonthlyTrend(6).subscribe({
      next: (data) => {
        this.monthlyTrend = data;
        trendLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading monthly trend:', error);
        trendLoaded = true;
        this.checkAllLoaded();
      }
    });

    const checkAllLoaded = () => {
      if (summaryLoaded && categoryLoaded && trendLoaded) {
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.createCharts();
        }, 500);
      }
    };

    this.checkAllLoaded = checkAllLoaded;
  }

  checkAllLoaded = () => {};

  createCharts(): void {
    this.createCategoryChart();
    this.createTrendChart();
  }

  createCategoryChart(): void {
    if (this.expensesByCategory.length === 0) {
      return;
    }

    const canvas = document.getElementById('categoryChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Category chart canvas not found');
      return;
    }

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: this.expensesByCategory.map(c => c.categoryName),
        datasets: [{
          data: this.expensesByCategory.map(c => c.amount),
          backgroundColor: this.expensesByCategory.map(c => c.categoryColor),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: €${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    try {
      this.categoryChart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error creating category chart:', error);
    }
  }

  createTrendChart(): void {
    if (this.monthlyTrend.length === 0) {
      return;
    }

    const canvas = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Trend chart canvas not found');
      return;
    }

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.monthlyTrend.map(m => `${m.month} ${m.year}`),
        datasets: [
          {
            label: 'Income',
            data: this.monthlyTrend.map(m => m.income),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Expenses',
            data: this.monthlyTrend.map(m => m.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                return `${context.dataset.label}: €${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value: any) => `€${value}`
            }
          }
        }
      }
    };

    try {
      this.trendChart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error creating trend chart:', error);
    }
  }

  getBalanceClass(): string {
    return this.summary.balance >= 0 ? 'positive' : 'negative';
  }

  getTopCategories(): CategoryReport[] {
    return this.expensesByCategory.slice(0, 5);
  }
}