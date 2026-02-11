import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login';
import { RegisterComponent } from './components/auth/register/register';
import { DashboardComponent } from './components/dashboard/dashboard';
import { TransactionListComponent } from './components/transactions/transaction-list/transaction-list';
import { TransactionFormComponent } from './components/transactions/transaction-form/transaction-form';
import { CategoryListComponent } from './components/categories/category-list/category-list';
import { CategoryFormComponent } from './components/categories/category-form/category-form';
import { BudgetListComponent } from './components/budgets/budget-list/budget-list';
import { BudgetFormComponent } from './components/budgets/budget-form/budget-form';
import { ReportsViewComponent } from './components/reports/reports-view/reports-view';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'transactions', 
    component: TransactionListComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'transactions/new', 
    component: TransactionFormComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'transactions/edit/:id', 
    component: TransactionFormComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'categories', 
    component: CategoryListComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'categories/new', 
    component: CategoryFormComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'categories/edit/:id', 
    component: CategoryFormComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'budgets', 
    component: BudgetListComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'budgets/new', 
    component: BudgetFormComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'budgets/edit/:id', 
    component: BudgetFormComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'reports', 
    component: ReportsViewComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];