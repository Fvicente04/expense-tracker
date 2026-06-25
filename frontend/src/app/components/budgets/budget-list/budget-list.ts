import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { BudgetService } from '../../../services/budget';
import { CategoryService } from '../../../services/category';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Budget } from '../../../models/budget';
import { Category } from '../../../models/category';
import { LucideIconComponent, LUCIDE_ICON_NAMES } from '../../shared/lucide-icon';

interface Month { value: number; }

@Component({
  selector: 'app-budget-list',
  imports: [CommonModule, NavbarComponent, ReactiveFormsModule, FormsModule, TranslatePipe, LucideIconComponent],
  templateUrl: './budget-list.html',
  styleUrl: './budget-list.css'
})

export class BudgetListComponent implements OnInit {
  budgets: Budget[] = [];
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';
  selectedMonth: number;
  selectedYear: number;
  currentYear: number;

  showModal = false;
  editMode = false;
  editingId = '';
  isRollingOver = false;
  form: FormGroup;

  months: Month[] = [
    { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 },
    { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 },
    { value: 9 }, { value: 10 }, { value: 11 }, { value: 12 },
  ];

  constructor(
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    public lang: LanguageService
  ) {
    const today = new Date();
    this.selectedMonth = today.getMonth() + 1;
    this.selectedYear  = today.getFullYear();
    this.currentYear   = today.getFullYear();
    this.form = this.fb.group({
      categoryId: ['', Validators.required],
      amount:     ['', [Validators.required, Validators.min(0)]],
      month:      [this.selectedMonth, Validators.required],
      year:       [this.selectedYear,  Validators.required],
      recurring:  [false]
    });
  }

  ngOnInit(): void {
    this.loadCats();
    this.load();
  }

  loadCats(): void {
    this.categoryService.getAll().subscribe({
      next: (data) => { this.categories = data.filter(c => c.type === 'expense'); },
      error: () => {}
    });
  }

  load(): void {
    this.isLoading    = true;
    this.errorMessage = '';
    this.budgetService.getAll().subscribe({
      next:  (data) => { this.budgets = data; this.isLoading = false; },
      error: () => { this.errorMessage = 'Failed to load budgets'; this.isLoading = false; }
    });
  }

  filteredBudgets(): Budget[] {
    return this.budgets.filter(b => b.month === this.selectedMonth && b.year === this.selectedYear);
  }

  monthName(): string {
    const locale = this.lang.currentLang === 'pt-BR' ? 'pt-BR' : 'en-US';
    return new Date(this.selectedYear, this.selectedMonth - 1).toLocaleString(locale, { month: 'long' });
  }

  localeMonthName(monthValue: number): string {
    const locale = this.lang.currentLang === 'pt-BR' ? 'pt-BR' : 'en-US';
    return new Date(this.selectedYear, monthValue - 1).toLocaleString(locale, { month: 'long' });
  }

  changeMonth(dir: number): void {
    this.selectedMonth += dir;
    if      (this.selectedMonth > 12) { this.selectedMonth = 1;  this.selectedYear++; }
    else if (this.selectedMonth < 1)  { this.selectedMonth = 12; this.selectedYear--; }
  }

  totalBudgeted(): number { return this.filteredBudgets().reduce((s, b) => s + (Number(b.amount) || 0), 0); }
  totalSpent():    number { return this.filteredBudgets().reduce((s, b) => s + (Number(b.spent)  || 0), 0); }
  totalRemaining(): number { return this.totalBudgeted() - this.totalSpent(); }

  progressPct(budget: Budget): number {
    if (!budget.amount || budget.amount === 0) return 0;
    return Math.min((Number(budget.spent) / Number(budget.amount)) * 100, 100);
  }

  progressColor(budget: Budget): string {
    const p = this.progressPct(budget);
    if (p >= 100) return '#ef4444';
    if (p >= 80)  return '#f97316';
    if (p >= 60)  return '#3b82f6';
    return '#22c55e';
  }

  statusText(budget: Budget): string {
    const p = this.progressPct(budget);
    if (p >= 100) return 'budgets.statusExceeded';
    if (p >= 80)  return 'budgets.statusWarning';
    if (p >= 60)  return 'budgets.statusModerate';
    return 'budgets.statusHealthy';
  }

  isCurrent(): boolean {
    const today = new Date();
    return this.selectedMonth === today.getMonth() + 1 && this.selectedYear === today.getFullYear();
  }

  daysInMonth(): number  { return new Date(this.selectedYear, this.selectedMonth, 0).getDate(); }
  daysElapsed(): number  { return this.isCurrent() ? new Date().getDate() : this.daysInMonth(); }
  monthPct(): number     { return Math.round((this.daysElapsed() / this.daysInMonth()) * 100); }

  overallPace(): number {
    const b = this.totalBudgeted();
    if (b === 0) return 0;
    return Math.round((this.totalSpent() / b) * 100 - this.monthPct());
  }

  expectedSpend(budget: Budget): number {
    return (Number(budget.amount) * this.monthPct()) / 100;
  }

  paceStatus(budget: Budget): 'ahead' | 'on-track' | 'under' {
    const spent  = Number(budget.spent)  || 0;
    const amount = Number(budget.amount) || 1;
    const diff   = ((spent - this.expectedSpend(budget)) / amount) * 100;
    if (diff >  5) return 'ahead';
    if (diff < -5) return 'under';
    return 'on-track';
  }

  daysToOverage(budget: Budget): number | null {
    const spent   = Number(budget.spent)  || 0;
    const amount  = Number(budget.amount) || 0;
    const elapsed = this.daysElapsed();
    if (spent === 0 || elapsed === 0) return null;
    const daily = spent / elapsed;
    const rem   = amount - spent;
    if (rem   <= 0) return 0;
    if (daily <= 0) return null;
    return Math.floor(rem / daily);
  }

  openModal(): void {
    this.showModal    = true;
    this.editMode     = false;
    this.editingId    = '';
    this.errorMessage = '';
    this.form.reset({ month: this.selectedMonth, year: this.selectedYear });
  }

  closeModal(): void {
    this.showModal    = false;
    this.editMode     = false;
    this.editingId    = '';
    this.errorMessage = '';
    this.form.reset();
  }

  editBudget(budget: Budget): void {
    this.showModal    = true;
    this.editMode     = true;
    this.editingId    = budget.id;
    this.errorMessage = '';
    this.form.patchValue({
      categoryId: budget.categoryId,
      amount:     budget.amount,
      month:      budget.month,
      year:       budget.year,
      recurring:  budget.recurring ?? false
    });
  }

  recurringAvailable(): number {
    if (this.filteredBudgets().length > 0) return 0;
    let prevMonth = this.selectedMonth - 1, prevYear = this.selectedYear;
    if (prevMonth < 1) { prevMonth = 12; prevYear = this.selectedYear - 1; }
    return this.budgets.filter(b => b.month === prevMonth && b.year === prevYear && b.recurring).length;
  }

  rollover(): void {
    if (this.isRollingOver) return;
    this.isRollingOver = true;
    this.budgetService.rollover(this.selectedMonth, this.selectedYear).subscribe({
      next: () => { this.isRollingOver = false; this.load(); },
      error: () => { this.isRollingOver = false; }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    this.isLoading    = true;
    this.errorMessage = '';
    const payload     = this.form.value;
    const op = this.editMode
      ? this.budgetService.update(this.editingId, payload)
      : this.budgetService.create(payload);
    op.subscribe({
      next:  () => { this.load(); this.closeModal(); },
      error: () => {
        this.errorMessage = `Failed to ${this.editMode ? 'update' : 'create'} budget`;
        this.isLoading = false;
      }
    });
  }

  deleteBudget(id: string): void {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    this.budgetService.delete(id).subscribe({
      next:  () => this.load(),
      error: () => { this.errorMessage = 'Failed to delete budget'; }
    });
  }

  fmt(value: any): string { return (Number(value) || 0).toFixed(2); }
  isLucideIcon(icon: string): boolean { return LUCIDE_ICON_NAMES.has(icon); }
}