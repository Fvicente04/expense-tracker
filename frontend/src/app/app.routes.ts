import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',    loadComponent: () => import('./components/auth/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/auth/register/register').then(m => m.RegisterComponent) },
  { path: 'dashboard',         canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'transactions',      canActivate: [authGuard], loadComponent: () => import('./components/transactions/transaction-list/transaction-list').then(m => m.TransactionListComponent) },
  { path: 'categories',        canActivate: [authGuard], loadComponent: () => import('./components/categories/category-list/category-list').then(m => m.CategoryListComponent) },
  { path: 'budgets',           canActivate: [authGuard], loadComponent: () => import('./components/budgets/budget-list/budget-list').then(m => m.BudgetListComponent) },
  { path: 'goals',             canActivate: [authGuard], loadComponent: () => import('./components/goals/goal-list/goal-list').then(m => m.GoalListComponent) },
  { path: 'reports',           canActivate: [authGuard], loadComponent: () => import('./components/reports/reports-view/reports-view').then(m => m.ReportsViewComponent) },
  { path: 'settings',          canActivate: [authGuard], loadComponent: () => import('./components/settings/settings').then(m => m.SettingsComponent) },
  { path: 'credit-cards',      canActivate: [authGuard], loadComponent: () => import('./components/credit-cards/credit-card-list/credit-card-list').then(m => m.CreditCardListComponent) },
  { path: 'bank-connections',  canActivate: [authGuard], loadComponent: () => import('./components/bank-connections/bank-connections').then(m => m.BankConnectionsComponent) },
  { path: 'category-rules',    canActivate: [authGuard], loadComponent: () => import('./components/category-rules/category-rules').then(m => m.CategoryRulesComponent) },
  { path: '**', redirectTo: '/login' }
];