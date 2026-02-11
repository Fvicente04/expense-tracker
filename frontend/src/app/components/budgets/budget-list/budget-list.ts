import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { BudgetService } from '../../../services/budget';
import { Budget } from '../../../models/budget';

interface Month {
  value: number;
  label: string;
}

@Component({
  selector: 'app-budget-list',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './budget-list.html',
  styleUrls: ['./budget-list.css']
})
export class BudgetListComponent implements OnInit {
  budgets: Budget[] = [];
  isLoading = false;
  errorMessage = '';
  selectedMonth: number;
  selectedYear: number;
  currentYear: number;

  months: Month[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  constructor(
    private budgetService: BudgetService,
    private router: Router
  ) {
    const today = new Date();
    this.selectedMonth = today.getMonth() + 1;
    this.selectedYear = today.getFullYear();
    this.currentYear = today.getFullYear();
  }

  ngOnInit(): void {
    this.loadBudgets();
  }

  loadBudgets(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.budgetService.getAll().subscribe({
      next: (data) => {
        this.budgets = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading budgets:', error);
        this.errorMessage = 'Failed to load budgets';
        this.isLoading = false;
      }
    });
  }

  getFilteredBudgets(): Budget[] {
    return this.budgets.filter(
      b => b.month === this.selectedMonth && b.year === this.selectedYear
    );
  }

  getMonthName(): string {
    const month = this.months.find(m => m.value === this.selectedMonth);
    return month ? month.label : '';
  }

  changeMonth(direction: number): void {
    this.selectedMonth += direction;
    
    if (this.selectedMonth > 12) {
      this.selectedMonth = 1;
      this.selectedYear++;
    } else if (this.selectedMonth < 1) {
      this.selectedMonth = 12;
      this.selectedYear--;
    }
  }

  getTotalBudgeted(): number {
    const budgets = this.getFilteredBudgets();
    if (!budgets || budgets.length === 0) return 0;
    return budgets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }

  getTotalSpent(): number {
    const budgets = this.getFilteredBudgets();
    if (!budgets || budgets.length === 0) return 0;
    return budgets.reduce((sum, b) => sum + (Number(b.spent) || 0), 0);
  }

  getTotalRemaining(): number {
    return this.getTotalBudgeted() - this.getTotalSpent();
  }

  getProgressPercentage(budget: Budget): number {
    if (!budget.amount || budget.amount === 0) return 0;
    const percentage = (Number(budget.spent) / Number(budget.amount)) * 100;
    return Math.min(percentage, 100);
  }

  getProgressColor(budget: Budget): string {
    const percentage = this.getProgressPercentage(budget);
    
    if (percentage >= 100) return '#ef4444'; // red
    if (percentage >= 80) return '#f97316'; // orange
    if (percentage >= 60) return '#3b82f6'; // blue
    return '#22c55e'; // green
  }

  getStatusText(budget: Budget): string {
    const percentage = this.getProgressPercentage(budget);
    
    if (percentage >= 100) return 'Exceeded';
    if (percentage >= 80) return 'Warning';
    if (percentage >= 60) return 'Moderate';
    return 'Healthy';
  }

  goToAddBudget(): void {
    this.router.navigate(['/budgets/new']);
  }

  editBudget(id: string): void {
    this.router.navigate(['/budgets/edit', id]);
  }

  deleteBudget(id: string): void {
    if (confirm('Are you sure you want to delete this budget?')) {
      this.budgetService.delete(id).subscribe({
        next: () => {
          this.loadBudgets();
        },
        error: (error) => {
          console.error('Error deleting budget:', error);
          this.errorMessage = 'Failed to delete budget';
        }
      });
    }
  }

  // Converte string para número
  toNumber(value: any): number {
    return Number(value) || 0;
  }

  // Formata valor para moeda
  formatCurrency(value: any): string {
    return this.toNumber(value).toFixed(2);
  }
}