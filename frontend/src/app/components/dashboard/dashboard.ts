import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../layout/navbar/navbar';
import { BudgetAlertsComponent } from '../shared/budget-alerts/budget-alerts';
import { TransactionService } from '../../services/transaction';
import { BudgetService } from '../../services/budget';
import { ReportService } from '../../services/report';
import { Transaction } from '../../models/transaction';
import { Budget } from '../../models/budget';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, BudgetAlertsComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  isLoading = true;
  viewInitialized = false;

  // Summary Stats
  totalIncome = 0;
  totalExpense = 0;
  balance = 0;
  transactionCount = 0;

  // Recent Data
  recentTransactions: Transaction[] = [];
  budgets: Budget[] = [];

  // Chart Data
  expensesByCategory: any[] = [];
  monthlyTrend: any[] = [];

  // Charts
  categoryChart: Chart | null = null;
  trendChart: Chart | null = null;

  constructor(
    private router: Router,
    private transactionService: TransactionService,
    private budgetService: BudgetService,
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initial load will happen in AfterViewInit
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    // Get current month dates
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startDate = this.formatDate(firstDay);
    const endDate = this.formatDate(lastDay);

    let summaryLoaded = false;
    let categoryLoaded = false;
    let trendLoaded = false;
    let transactionsLoaded = false;
    let budgetsLoaded = false;

    // Load Summary
    this.reportService.getSummary(startDate, endDate).subscribe({
      next: (data) => {
        this.totalIncome = Number(data.totalIncome || 0);
        this.totalExpense = Number(data.totalExpense || 0);
        this.balance = Number(data.balance || 0);
        this.transactionCount = Number(data.transactionCount || 0);
        summaryLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading summary:', error);
        summaryLoaded = true;
        this.checkAllLoaded();
      }
    });

    // Load Expenses by Category
    this.reportService.getByCategory('expense', startDate, endDate).subscribe({
      next: (data) => {
        this.expensesByCategory = data;
        categoryLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading category data:', error);
        categoryLoaded = true;
        this.checkAllLoaded();
      }
    });

    // Load Monthly Trend
    this.reportService.getMonthlyTrend(6).subscribe({
      next: (data) => {
        this.monthlyTrend = data;
        trendLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading trend data:', error);
        trendLoaded = true;
        this.checkAllLoaded();
      }
    });

    // Load Recent Transactions
    this.transactionService.getAll().subscribe({
      next: (data) => {
        this.recentTransactions = data.slice(0, 5); // Get last 5
        transactionsLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        transactionsLoaded = true;
        this.checkAllLoaded();
      }
    });

    // Load Budgets
    this.budgetService.getAll().subscribe({
      next: (data) => {
        // Convert spent and amount to numbers
        this.budgets = data.map(b => ({
          ...b,
          spent: Number(b.spent || 0),
          amount: Number(b.amount || 0)
        }));
        budgetsLoaded = true;
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error loading budgets:', error);
        budgetsLoaded = true;
        this.checkAllLoaded();
      }
    });

    const checkAllLoaded = () => {
      if (summaryLoaded && categoryLoaded && trendLoaded && transactionsLoaded && budgetsLoaded) {
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
    if (this.expensesByCategory.length > 0) {
      this.createCategoryChart();
    }
    if (this.monthlyTrend.length > 0) {
      this.createTrendChart();
    }
  }

  createCategoryChart(): void {
    const canvas = document.getElementById('dashboardCategoryChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.categoryChart) {
      this.categoryChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: this.expensesByCategory.map(c => c.categoryName),
        datasets: [{
          data: this.expensesByCategory.map(c => Number(c.amount || 0)),
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
              padding: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: €${value.toFixed(2)}`;
              }
            }
          }
        }
      }
    };

    this.categoryChart = new Chart(ctx, config);
  }

  createTrendChart(): void {
    const canvas = document.getElementById('dashboardTrendChart') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.trendChart) {
      this.trendChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.monthlyTrend.map(m => `${m.month} ${m.year}`),
        datasets: [
          {
            label: 'Income',
            data: this.monthlyTrend.map(m => Number(m.income || 0)),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Expenses',
            data: this.monthlyTrend.map(m => Number(m.expense || 0)),
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
              padding: 12,
              font: { size: 11 }
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

    this.trendChart = new Chart(ctx, config);
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatCurrency(value: any): string {
    return Number(value || 0).toFixed(2);
  }

  formatTransactionDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  getBudgetPercentage(budget: Budget): number {
    const amount = Number(budget.amount || 0);
    const spent = Number(budget.spent || 0);
    if (amount === 0) return 0;
    return Math.min((spent / amount) * 100, 100);
  }

  getBudgetStatus(budget: Budget): string {
    const percentage = this.getBudgetPercentage(budget);
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    return 'good';
  }

  goToTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  goToBudgets(): void {
    this.router.navigate(['/budgets']);
  }

  goToReports(): void {
    this.router.navigate(['/reports']);
  }
}