import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { TransactionService } from '../../../services/transaction';
import { CategoryService } from '../../../services/category';
import { Transaction } from '../../../models/transaction';
import { Category } from '../../../models/category';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './transaction-list.html',
  styleUrls: ['./transaction-list.css']
})
export class TransactionListComponent implements OnInit {
  transactions: Transaction[] = [];
  filtered: Transaction[] = [];
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';

  showModal = false;
  editMode = false;
  editingId = '';
  form: FormGroup;

  selected = new Set<string>();
  bulkDeleting = false;
  showFuture = false;

  filters = { type: '', categoryId: '', startDate: '', endDate: '' };

  constructor(
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      type:               ['income', Validators.required],
      amount:             ['', [Validators.required, Validators.min(0.01)]],
      date:               [this.today(), Validators.required],
      categoryId:         ['', Validators.required],
      description:        ['', [Validators.required, Validators.minLength(3)]],
      notes:              [''],
      isRecurring:        [false],
      recurringFrequency: ['monthly'],
      recurringEndDate:   [null]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadTransactions();

    this.route.queryParams.subscribe(params => {
      if (params['openModal'] === 'true') {
        setTimeout(() => this.openModal(), 300);
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      }
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: data => this.categories = data ?? [],
      error: () => {}
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selected.clear();

    this.transactionService.getAll().subscribe({
      next: data => {
        this.transactions = data ?? [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load transactions';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    this.selected.clear();

    this.filtered = this.transactions.filter(t => {
      const typeMatch     = !this.filters.type       || t.type === this.filters.type;
      const categoryMatch = !this.filters.categoryId || String(t.categoryId) === String(this.filters.categoryId);
      const futureMatch   = this.showFuture || new Date(t.date) <= today;
      let dateMatch = true;
      if (this.filters.startDate) dateMatch = dateMatch && new Date(t.date) >= new Date(this.filters.startDate);
      if (this.filters.endDate)   dateMatch = dateMatch && new Date(t.date) <= new Date(this.filters.endDate);
      return typeMatch && categoryMatch && dateMatch && futureMatch;
    });
  }

  clearFilters(): void {
    this.filters = { type: '', categoryId: '', startDate: '', endDate: '' };
    this.showFuture = false;
    this.applyFilters();
  }

  get allSelected(): boolean {
    return this.filtered.length > 0 && this.filtered.every(t => this.selected.has(t.id));
  }

  get someSelected(): boolean { return this.selected.size > 0 && !this.allSelected; }

  toggleAll(event: Event): void {
    if ((event.target as HTMLInputElement).checked) this.filtered.forEach(t => this.selected.add(t.id));
    else this.selected.clear();
  }

  toggleOne(id: string): void {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }

  clearSelection(): void { this.selected.clear(); }

  deleteSelected(): void {
    const count = this.selected.size;
    if (!count || !confirm(`Delete ${count} transaction${count > 1 ? 's' : ''}? This cannot be undone.`)) return;

    this.bulkDeleting = true;
    const ids = Array.from(this.selected);
    let done = 0;
    const finish = () => { if (++done === ids.length) { this.bulkDeleting = false; this.loadTransactions(); } };
    ids.forEach(id => this.transactionService.delete(id).subscribe({ next: finish, error: finish }));
  }

  totalIncome(): number {
    return this.filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  }

  totalExpenses(): number {
    return this.filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  }

  balance(): number { return this.totalIncome() - this.totalExpenses(); }
  fmt(value: any): string { return Number(value || 0).toFixed(2); }
  fmtDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  today(): string { return new Date().toISOString().split('T')[0]; }

  filteredCats(): Category[] {
    return this.categories.filter(c => c.type === this.form.get('type')?.value);
  }

  private setDefaultCategory(type: 'income' | 'expense'): void {
    const first = this.categories.find(c => c.type === type);
    this.form.patchValue({ categoryId: first?.id ?? '' });
  }

  catColor(t: Transaction): string { return t.category?.color || '#6b7280'; }
  catIcon(t: Transaction): string  { return t.category?.icon  || ''; }
  catName(t: Transaction): string  { return t.category?.name  || 'Unknown'; }

  toggleRecurring(): void {
    const curr = this.form.get('isRecurring')?.value;
    this.form.patchValue({
      isRecurring: !curr,
      recurringFrequency: !curr ? 'monthly' : null,
      recurringEndDate: null
    });
  }

  setFrequency(freq: 'weekly' | 'monthly' | 'yearly'): void {
    this.form.patchValue({ recurringFrequency: freq });
  }

  recurringPreview(): string {
    const freq  = this.form.get('recurringFrequency')?.value;
    const end   = this.form.get('recurringEndDate')?.value;
    const start = this.form.get('date')?.value;
    if (!freq || !start) return '';

    const label: Record<string, string> = { weekly: 'week', monthly: 'month', yearly: 'year' };

    if (end) {
      const endDate = new Date(end);
      const curr = new Date(start);
      let count = 0;
      while (count < 60) {
        if (freq === 'weekly')       curr.setDate(curr.getDate() + 7);
        else if (freq === 'monthly') curr.setMonth(curr.getMonth() + 1);
        else                         curr.setFullYear(curr.getFullYear() + 1);
        if (curr > endDate) break;
        count++;
      }
      const fmt = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `Every ${label[freq]} · ${count} occurrence${count !== 1 ? 's' : ''} until ${fmt}`;
    }

    return `Every ${label[freq]}, indefinitely (up to 60 occurrences)`;
  }

  openModal(): void {
    this.showModal = true;
    this.editMode = false;
    this.editingId = '';
    this.errorMessage = '';
    this.form.reset({
      type: 'income', amount: '', date: this.today(),
      categoryId: '', description: '', notes: '',
      isRecurring: false, recurringFrequency: 'monthly', recurringEndDate: null
    });
    this.setDefaultCategory('income');
  }

  closeModal(): void {
    this.showModal = false;
    this.editMode = false;
    this.editingId = '';
    this.errorMessage = '';
    this.form.reset();
  }

  editTransaction(t: Transaction): void {
    this.showModal = true;
    this.editMode = true;
    this.editingId = t.id;
    this.errorMessage = '';
    this.form.patchValue({
      type:               t.type,
      amount:             t.amount,
      date:               String(t.date).slice(0, 10),
      categoryId:         t.categoryId,
      description:        t.description,
      notes:              (t as any).notes ?? '',
      isRecurring:        (t as any).isRecurring ?? false,
      recurringFrequency: (t as any).recurringFrequency ?? 'monthly',
      recurringEndDate:   (t as any).recurringEndDate ?? null
    });
    if (!this.form.get('categoryId')?.value) this.setDefaultCategory(t.type as any);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const raw = this.form.value;

    const payload: any = {
      type:               raw.type,
      amount:             Number(raw.amount),
      date:               String(raw.date).slice(0, 10),
      categoryId:         raw.categoryId,
      description:        raw.description,
      notes:              raw.notes || null,
      isRecurring:        raw.isRecurring,
      recurringFrequency: raw.isRecurring ? raw.recurringFrequency : null,
      recurringEndDate:   raw.isRecurring && raw.recurringEndDate ? raw.recurringEndDate : null
    };

    const op = this.editMode
      ? this.transactionService.update(this.editingId, payload)
      : this.transactionService.create(payload);

    op.subscribe({
      next: () => { this.loadTransactions(); this.closeModal(); },
      error: err => {
        this.errorMessage = err?.error?.message || `Failed to ${this.editMode ? 'update' : 'create'} transaction`;
        this.isLoading = false;
      }
    });
  }

  deleteTransaction(id: string): void {
    if (!confirm('Delete this transaction?')) return;
    this.transactionService.delete(id).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.errorMessage = 'Failed to delete transaction'
    });
  }
}