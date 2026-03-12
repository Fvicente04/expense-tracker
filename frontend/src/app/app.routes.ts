import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',    loadComponent: () => import('./components/auth/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./components/auth/register/register').then(m => m.RegisterComponent) },
  { path: 'dashboard',         canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
  { path: 'transactions',      canActivate: [authGuard], loadComponent: () => import('./components/transactions/transaction-list/transaction-list').then(m => m.TransactionListComponent) },
  { path: 'transactions/new',  canActivate: [authGuard], loadComponent: () => import('./components/transactions/transaction-form/transaction-form').then(m => m.TransactionFormComponent) },
  { path: 'transactions/edit/:id', canActivate: [authGuard], loadComponent: () => import('./components/transactions/transaction-form/transaction-form').then(m => m.TransactionFormComponent) },
  { path: 'categories',        canActivate: [authGuard], loadComponent: () => import('./components/categories/category-list/category-list').then(m => m.CategoryListComponent) },
  { path: 'categories/new',    canActivate: [authGuard], loadComponent: () => import('./components/categories/category-form/category-form').then(m => m.CategoryFormComponent) },
  { path: 'categories/edit/:id', canActivate: [authGuard], loadComponent: () => import('./components/categories/category-form/category-form').then(m => m.CategoryFormComponent) },
  { path: 'budgets',           canActivate: [authGuard], loadComponent: () => import('./components/budgets/budget-list/budget-list').then(m => m.BudgetListComponent) },
  { path: 'budgets/new',       canActivate: [authGuard], loadComponent: () => import('./components/budgets/budget-form/budget-form').then(m => m.BudgetFormComponent) },
  { path: 'budgets/edit/:id',  canActivate: [authGuard], loadComponent: () => import('./components/budgets/budget-form/budget-form').then(m => m.BudgetFormComponent) },
  { path: 'reports',           canActivate: [authGuard], loadComponent: () => import('./components/reports/reports-view/reports-view').then(m => m.ReportsViewComponent) },
  { path: '**', redirectTo: '/login' }
];