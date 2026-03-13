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
  { path: 'reports',           canActivate: [authGuard], loadComponent: () => import('./components/reports/reports-view/reports-view').then(m => m.ReportsViewComponent) },
  { path: '**', redirectTo: '/login' }
];