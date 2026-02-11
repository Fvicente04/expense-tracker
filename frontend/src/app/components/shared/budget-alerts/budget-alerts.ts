import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BudgetService } from '../../../services/budget';
import { Budget } from '../../../models/budget';

interface BudgetAlert {
  budget: Budget;
  percentage: number;
  status: 'warning' | 'danger' | 'exceeded';
  message: string;
}

@Component({
  selector: 'app-budget-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './budget-alerts.html',
  styleUrls: ['./budget-alerts.css']
})
export class BudgetAlertsComponent implements OnInit {
  alerts: BudgetAlert[] = [];
  isLoading = true;
  showAlerts = true;

  constructor(
    private budgetService: BudgetService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadBudgetAlerts();
  }

  loadBudgetAlerts(): void {
    this.budgetService.getAll().subscribe({
      next: (budgets) => {
        this.alerts = budgets
          .map(budget => {
            const spent = Number(budget.spent || 0);
            const amount = Number(budget.amount || 0);
            const percentage = amount > 0 ? (spent / amount) * 100 : 0;

            if (percentage >= 100) {
              return {
                budget,
                percentage,
                status: 'exceeded' as const,
                message: `Budget exceeded by €${(spent - amount).toFixed(2)}`
              };
            } else if (percentage >= 90) {
              return {
                budget,
                percentage,
                status: 'danger' as const,
                message: `${percentage.toFixed(0)}% of budget used - €${(amount - spent).toFixed(2)} remaining`
              };
            } else if (percentage >= 80) {
              return {
                budget,
                percentage,
                status: 'warning' as const,
                message: `${percentage.toFixed(0)}% of budget used - €${(amount - spent).toFixed(2)} remaining`
              };
            }
            return null;
          })
          .filter(alert => alert !== null) as BudgetAlert[];

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading budget alerts:', error);
        this.isLoading = false;
      }
    });
  }

  dismissAlert(index: number): void {
    this.alerts.splice(index, 1);
    if (this.alerts.length === 0) {
      this.showAlerts = false;
    }
  }

  goToBudgets(): void {
    this.router.navigate(['/budgets']);
  }

  closeAllAlerts(): void {
    this.showAlerts = false;
  }
}