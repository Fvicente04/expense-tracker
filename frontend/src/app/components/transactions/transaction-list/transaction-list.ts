import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { TransactionService } from '../../../services/transaction';
import { CategoryService } from '../../../services/category';
import { BankService } from '../../../services/bank';
import { BankConnection } from '../../../models/bank-connection';
import { AuthService } from '../../../services/auth';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Transaction } from '../../../models/transaction';
import { Category } from '../../../models/category';
import { Observable } from 'rxjs';
import { LucideIconComponent, LUCIDE_ICON_NAMES } from '../../shared/lucide-icon';

@Component({
  selector: 'app-transaction-list',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, TranslatePipe, LucideIconComponent],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.css'
})
export class TransactionListComponent implements OnInit {
  pagedTransactions: Transaction[] = [];
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';

  showModal = false;
  editMode = false;
  editingId = '';
  editingTransaction: Transaction | null = null;
  isSubmitting = false;
  currencySymbol = '€';
  form: FormGroup;

  selected = new Set<string>();
  bulkDeleting = false;
  showFuture = true;

  showActionsDropdown = false;

  showImportModal = false;
  importRows: any[] = [];
  importCategories: any[] = [];
  importLoading = false;
  importError = '';
  importSuccess = '';
  importFilter: 'all' | 'income' | 'expense' = 'all';

  get filteredImportRows(): any[] {
    if (this.importFilter === 'all') return this.importRows;
    return this.importRows.filter(r => r.type === this.importFilter);
  }
  get importIncomeCount(): number { return this.importRows.filter(r => r.type === 'income').length; }
  get importExpenseCount(): number { return this.importRows.filter(r => r.type === 'expense').length; }

  filters = { type: '', categoryId: '', bankConnectionId: '', startDate: '', endDate: '', search: '' };
  bankConnections: BankConnection[] = [];
  private searchTimer: any = null;

  pageSize = 10;
  currentPage = 1;
  serverTotal = 0;
  serverPages = 1;
  serverSummary = { totalIncome: 0, totalExpenses: 0, balance: 0 };

  constructor(
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private bankService: BankService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public lang: LanguageService
  ) {
    this.form = this.fb.group({
      type: ['income', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [this.today(), Validators.required],
      categoryId: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(3)]],
      notes: [''],
      isRecurring: [false],
      recurringFrequency: ['monthly'],
      recurringEndDate: [null]
    });
  }

  private getCurrencySymbol(code: string): string {
    const map: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' };
    return map[code] ?? code;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user?.currency) this.currencySymbol = this.getCurrencySymbol(user.currency);
    });
    this.initMonthFilter();
    this.loadCategories();
    this.loadBankConnections();
    this.loadTransactions();

    this.route.queryParams.subscribe(params => {
      if (params['openModal'] === 'true') {
        setTimeout(() => this.openModal(), 300);
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      }
    });
  }

  private initMonthFilter(): void {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    this.filters.startDate = `${y}-${m}-01`;
    this.filters.endDate   = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: data => this.categories = data ?? [],
      error: () => { }
    });
  }

  loadBankConnections(): void {
    this.bankService.getConnections().subscribe({
      next: data => this.bankConnections = data.filter(c => c.status === 'active'),
      error: () => { }
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selected.clear();

    this.transactionService.getPage({
      page: this.currentPage,
      limit: this.pageSize,
      startDate: this.filters.startDate || undefined,
      endDate: this.filters.endDate || undefined,
      type: this.filters.type || undefined,
      categoryId: this.filters.categoryId || undefined,
      bankConnectionId: this.filters.bankConnectionId || undefined,
      showFuture: this.showFuture,
      search: this.filters.search || undefined
    }).subscribe({
      next: res => {
        this.pagedTransactions = res.data;
        this.serverTotal = res.total;
        this.serverPages = res.pages;
        this.serverSummary = {
          totalIncome: res.summary.totalIncome,
          totalExpenses: res.summary.totalExpenses,
          balance: res.summary.balance
        };
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load transactions';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.selected.clear();
    this.loadTransactions();
  }

  clearFilters(): void {
    this.filters = { type: '', categoryId: '', bankConnectionId: '', startDate: '', endDate: '', search: '' };
    this.initMonthFilter();
    this.showFuture = true;
    this.applyFilters();
  }

  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  get totalPages(): number { return this.serverPages; }
  get pageStart(): number { return this.serverTotal === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get pageEnd(): number { return Math.min(this.currentPage * this.pageSize, this.serverTotal); }

  prevPage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.loadTransactions(); }
  }
  nextPage(): void {
    if (this.currentPage < this.totalPages) { this.currentPage++; this.loadTransactions(); }
  }
  goToPage(page: number): void { this.currentPage = page; this.loadTransactions(); }

  get pageNumbers(): (number | '...')[] {
    const total = this.totalPages;
    if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1);

    const curr = this.currentPage;
    const visible = new Set<number>();
    visible.add(1);
    visible.add(total);
    for (let i = Math.max(1, curr - 2); i <= Math.min(total, curr + 2); i++) visible.add(i);

    const sorted = Array.from(visible).sort((a, b) => a - b);
    const pages: (number | '...')[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) pages.push('...');
      pages.push(sorted[i]);
    }
    return pages;
  }

  get allSelected(): boolean {
    return this.pagedTransactions.length > 0 && this.pagedTransactions.every(t => this.selected.has(t.id));
  }

  get someSelected(): boolean { return this.selected.size > 0 && !this.allSelected; }

  toggleAll(event: Event): void {
    if ((event.target as HTMLInputElement).checked) this.pagedTransactions.forEach(t => this.selected.add(t.id));
    else this.pagedTransactions.forEach(t => this.selected.delete(t.id));
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

  totalIncome(): number { return this.serverSummary.totalIncome; }
  totalExpenses(): number { return this.serverSummary.totalExpenses; }
  balance(): number { return this.serverSummary.balance; }

  fmt(value: any): string { return Number(value || 0).toFixed(2); }
  fmtDate(date: string): string {
    const locale = this.lang.currentLang === 'pt-BR' ? 'pt-BR' : 'en-US';
    return new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  today(): string { return new Date().toISOString().split('T')[0]; }

  filteredCats(): Category[] {
    return this.categories.filter(c => c.type === this.form.get('type')?.value);
  }

  private setDefaultCategory(type: 'income' | 'expense'): void {
    const first = this.categories.find(c => c.type === type);
    this.form.patchValue({ categoryId: first?.id ?? '' });
  }

  setType(type: 'income' | 'expense'): void {
    const currentCategoryId = this.form.get('categoryId')?.value;
    const currentCategory = this.categories.find(c => String(c.id) === String(currentCategoryId));
    this.form.patchValue({ type });
    if (!currentCategory || currentCategory.type !== type) this.setDefaultCategory(type);
  }

  catColor(t: Transaction): string { return t.category?.color || '#6b7280'; }
  catIcon(t: Transaction): string { return t.category?.icon || ''; }
  catName(t: Transaction): string { return t.category?.name || 'Unknown'; }
  isLucideIcon(icon: string): boolean { return LUCIDE_ICON_NAMES.has(icon); }

  toggleRecurring(): void {
    const curr = this.form.get('isRecurring')?.value;
    this.form.patchValue({ isRecurring: !curr, recurringFrequency: !curr ? 'monthly' : null, recurringEndDate: null });
  }

  setFrequency(freq: 'weekly' | 'biweekly' | 'monthly'): void { this.form.patchValue({ recurringFrequency: freq }); }

  recurringPreview(): string {
    const freq = this.form.get('recurringFrequency')?.value;
    const end = this.form.get('recurringEndDate')?.value;
    const start = this.form.get('date')?.value;
    if (!freq || !start) return '';

    const label: Record<string, string> = { weekly: 'week', biweekly: '2 weeks', monthly: 'month' };

    if (end) {
      const endDate = new Date(end);
      const curr = new Date(start);
      let count = 0;
      while (count < 60) {
        if (freq === 'weekly')        curr.setDate(curr.getDate() + 7);
        else if (freq === 'biweekly') curr.setDate(curr.getDate() + 14);
        else                          curr.setMonth(curr.getMonth() + 1);
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
    this.editingTransaction = null;
    this.errorMessage = '';
    this.form.reset();
  }

  editTransaction(t: Transaction): void {
    this.showModal = true;
    this.editMode = true;
    this.editingId = t.id;
    this.editingTransaction = t;
    this.errorMessage = '';
    this.form.patchValue({
      type: t.type,
      amount: t.amount,
      date: String(t.date).slice(0, 10),
      categoryId: t.categoryId,
      description: t.description,
      notes: (t as any).notes ?? '',
      isRecurring: (t as any).isRecurring ?? false,
      recurringFrequency: (t as any).recurringFrequency ?? 'monthly',
      recurringEndDate: (t as any).recurringEndDate ?? null
    });
    if (!this.form.get('categoryId')?.value) this.setDefaultCategory(t.type as any);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
      return;
    }
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.isLoading = true;
    this.errorMessage = '';
    const raw = this.form.value;

    const payload: any = {
      type: raw.type,
      amount: Number(raw.amount),
      date: String(raw.date).slice(0, 10),
      categoryId: raw.categoryId,
      description: raw.description,
      notes: raw.notes || null,
      isRecurring: raw.isRecurring,
      recurringFrequency: raw.isRecurring ? raw.recurringFrequency : null,
      recurringEndDate: raw.isRecurring && raw.recurringEndDate ? raw.recurringEndDate : null
    };

    let op: Observable<Transaction>;
    if (this.editMode) {
      const isRecurringSeries = this.editingTransaction?.isRecurring && this.editingTransaction?.recurringGroupId;
      if (isRecurringSeries && confirm('Update all future occurrences of this recurring series?')) {
        op = this.transactionService.updateSeries(this.editingId, payload);
      } else {
        op = this.transactionService.update(this.editingId, payload);
      }
    } else {
      op = this.transactionService.create(payload);
    }

    op.subscribe({
      next: () => { this.isSubmitting = false; this.loadTransactions(); this.closeModal(); },
      error: err => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || `Failed to ${this.editMode ? 'update' : 'create'} transaction`;
        this.isLoading = false;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.actions-dropdown')) {
      this.showActionsDropdown = false;
    }
  }

  toggleActionsDropdown(): void { this.showActionsDropdown = !this.showActionsDropdown; }
  closeActionsDropdown(): void  { this.showActionsDropdown = false; }

  exportCSV(): void {
    this.transactionService.getFiltered({
      startDate: this.filters.startDate || undefined,
      endDate: this.filters.endDate || undefined,
      type: this.filters.type || undefined,
      categoryId: this.filters.categoryId || undefined,
      showFuture: this.showFuture,
      search: this.filters.search || undefined
    }).subscribe({
      next: transactions => {
        const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Notes'];
        const rows = transactions.map(t => [
          this.fmtDate(t.date),
          t.type,
          this.catName(t),
          `"${(t.description || '').replace(/"/g, '""')}"`,
          (t.type === 'expense' ? '-' : '') + Number(t.amount).toFixed(2),
          `"${((t as any).notes || '').replace(/"/g, '""')}"`
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.errorMessage = 'Failed to export transactions'
    });
  }

  triggerImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => this.onFileSelected(e as Event);
    input.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.importLoading = true;
    this.errorMessage = '';

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      this.transactionService.importPreview(csvText).subscribe({
        next: (data) => {
          this.importRows = data.transactions.map(t => ({ ...t }));
          this.importCategories = data.categories;
          this.importLoading = false;
          this.importError = '';
          this.importSuccess = '';
          this.showImportModal = true;
        },
        error: (err) => {
          this.importLoading = false;
          this.errorMessage = err?.error?.message || 'Falha ao processar o arquivo CSV';
        }
      });
    };
    reader.onerror = () => {
      this.importLoading = false;
      this.errorMessage = 'Falha ao ler o arquivo';
    };
    reader.readAsText(file);
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.importRows = [];
    this.importCategories = [];
    this.importError = '';
    this.importSuccess = '';
    this.importFilter = 'all';
  }

  removeImportRow(row: any): void {
    const idx = this.importRows.indexOf(row);
    if (idx !== -1) this.importRows.splice(idx, 1);
  }

  importCats(type: string): any[] {
    return this.importCategories.filter(c => c.type === type);
  }

  confirmImport(): void {
    if (this.importRows.some(r => !r.categoryId)) {
      this.importError = 'Atribua uma categoria a todas as transações antes de importar';
      return;
    }

    this.importLoading = true;
    this.importError = '';

    this.transactionService.importConfirm(this.importRows).subscribe({
      next: (result) => {
        this.importLoading = false;
        this.importSuccess = result.message;
        this.importRows = [];
        this.loadTransactions();
        setTimeout(() => this.closeImportModal(), 2500);
      },
      error: (err) => {
        this.importLoading = false;
        this.importError = err?.error?.message || 'Falha ao importar transações';
      }
    });
  }

  deleteTransaction(id: string): void {
    if (!confirm('Delete this transaction?')) return;
    const tx = this.pagedTransactions.find(t => t.id === id);
    const deleteSeries = !!(tx?.isRecurring && tx?.recurringGroupId &&
      confirm('Also delete all future occurrences of this recurring series?'));
    this.transactionService.delete(id, deleteSeries).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.errorMessage = 'Failed to delete transaction'
    });
  }
}
