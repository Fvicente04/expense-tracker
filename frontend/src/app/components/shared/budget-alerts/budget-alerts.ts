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

  constructor(private budgetService: BudgetService, private router: Router) {}

  ngOnInit(): void { this.loadBudgetAlerts(); }

  loadBudgetAlerts(): void {
    this.budgetService.getAll().subscribe({
      next: budgets => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year  = now.getFullYear();

        this.alerts = budgets
          .filter(b => b.month === month && b.year === year)
          .map(budget => {
            const spent  = Number(budget.spent  || 0);
            const amount = Number(budget.amount || 0);
            const pct    = amount > 0 ? (spent / amount) * 100 : 0;
            const rem    = (amount - spent).toFixed(2);

            if (pct >= 100) return {
              budget, percentage: pct, status: 'exceeded' as const,
              message: `Budget exceeded by \u20AC${(spent - amount).toFixed(2)}`
            };
            if (pct >= 90) return {
              budget, percentage: pct, status: 'danger' as const,
              message: `${pct.toFixed(0)}% used \u2014 \u20AC${rem} remaining`
            };
            if (pct >= 80) return {
              budget, percentage: pct, status: 'warning' as const,
              message: `${pct.toFixed(0)}% used \u2014 \u20AC${rem} remaining`
            };
            return null;
          })
          .filter(a => a !== null) as BudgetAlert[];

        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  dismissAlert(i: number): void {
    this.alerts.splice(i, 1);
    if (!this.alerts.length) this.showAlerts = false;
  }

  goToBudgets(): void { this.router.navigate(['/budgets']); }
  closeAllAlerts(): void { this.showAlerts = false; }
}