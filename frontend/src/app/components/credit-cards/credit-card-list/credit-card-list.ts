import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { LanguageService } from '../../../services/language.service';
import { CreditCardService } from '../../../services/credit-card';
import { CategoryService } from '../../../services/category';
import { AuthService } from '../../../services/auth';
import { CreditCard, CardPayment, MonthlyHistory, Subscription } from '../../../models/credit-card';
import { Category } from '../../../models/category';
import { Transaction } from '../../../models/transaction';
import { PageResult } from '../../../services/transaction';
import {
  LucideCreditCard, LucidePlus, LucideUpload, LucidePencil, LucideTrash2,
  LucideChevronDown, LucideChevronUp, LucideCircleAlert, LucideClock,
  LucideAlertTriangle, LucideRefreshCw, LucideX, LucideCheck,
  LucideArrowUp, LucideArrowDown, LucideRepeat2, LucideWallet,
} from '@lucide/angular';

type Tab = 'transactions' | 'history' | 'subscriptions' | 'payments';

@Component({
  selector: 'app-credit-card-list',
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, TranslatePipe,
    LucideCreditCard, LucidePlus, LucideUpload, LucidePencil, LucideTrash2,
    LucideChevronDown, LucideChevronUp, LucideCircleAlert, LucideClock,
    LucideAlertTriangle, LucideRefreshCw, LucideX, LucideCheck,
    LucideArrowUp, LucideArrowDown, LucideRepeat2, LucideWallet,
  ],
  templateUrl: './credit-card-list.html',
  styleUrl: './credit-card-list.css'
})
export class CreditCardListComponent implements OnInit {
  readonly Math = Math;

  cards: CreditCard[] = [];
  categories: Category[] = [];
  isLoading = false;
  errorMessage = '';
  currencySymbol = '€';

  // ── card modal ────────────────────────────────────────
  showCardModal = false;
  editingCard: CreditCard | null = null;
  isSubmitting = false;
  cardForm: FormGroup;

  // ── expanded card state ───────────────────────────────
  expandedCardId: string | null = null;
  activeTab: Tab = 'transactions';

  // ── transactions tab ──────────────────────────────────
  txLoading = false;
  txData: Transaction[] = [];
  txTotal = 0;
  txPages = 1;
  txPage = 1;
  txPageSize = 10;
  txSummary = { totalIncome: 0, totalExpenses: 0, balance: 0 };
  txFilters = { startDate: '', endDate: '', type: '', search: '' };
  private txSearchTimer: any = null;

  // ── history tab ───────────────────────────────────────
  historyLoading = false;
  history: MonthlyHistory[] = [];

  // ── subscriptions tab ─────────────────────────────────
  subsLoading = false;
  subscriptions: Subscription[] = [];

  // ── payments tab ──────────────────────────────────────
  paymentsLoading = false;
  payments: CardPayment[] = [];
  showPaymentModal = false;
  paymentForm: FormGroup;
  isPaymentSubmitting = false;

  // ── import modal ──────────────────────────────────────
  showImportModal = false;
  importCardId: string | null = null;
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
  get importIncomeCount():  number { return this.importRows.filter(r => r.type === 'income').length; }
  get importExpenseCount(): number { return this.importRows.filter(r => r.type === 'expense').length; }

  readonly PALETTE = [
    '#667eea','#764ba2','#f093fb','#f5576c',
    '#4facfe','#00f2fe','#43e97b','#38f9d7',
    '#fa709a','#fee140','#a18cd1','#fbc2eb'
  ];

  readonly MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  constructor(
    private cardService: CreditCardService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private fb: FormBuilder,
    public lang: LanguageService
  ) {
    this.cardForm = this.fb.group({
      name:                ['', [Validators.required, Validators.maxLength(50)]],
      lastFourDigits:      ['', [Validators.pattern(/^\d{4}$/)]],
      creditLimit:         [null, [Validators.min(0)]],
      color:               ['#667eea'],
      icon:                ['💳'],
      statementDay:        [null, [Validators.min(1), Validators.max(31)]],
      dueDay:              [null, [Validators.min(1), Validators.max(31)]],
      utilizationAlertPct: [80,   [Validators.min(1), Validators.max(100)]]
    });

    this.paymentForm = this.fb.group({
      amount:       ['', [Validators.required, Validators.min(0.01)]],
      paymentDate:  [this.today(), Validators.required],
      billingMonth: [new Date().getMonth() + 1, Validators.required],
      billingYear:  [new Date().getFullYear(),  Validators.required],
      paymentType:  ['full', Validators.required],
      notes:        ['']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user?.currency) {
        const map: Record<string,string> = { EUR:'€', USD:'$', GBP:'£', BRL:'R$' };
        this.currencySymbol = map[user.currency] ?? user.currency;
      }
    });
    this.loadCards();
    this.loadCategories();
  }

  loadCards(): void {
    this.isLoading = true;
    this.cardService.getAll().subscribe({
      next: c => { this.cards = c; this.isLoading = false; },
      error: () => { this.errorMessage = 'Failed to load credit cards'; this.isLoading = false; }
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({ next: c => this.categories = c ?? [], error: () => {} });
  }

  // ── CARD MODAL ────────────────────────────────────────

  openAddCard(): void {
    this.editingCard = null;
    this.cardForm.reset({ name:'', lastFourDigits:'', creditLimit:null, color:'#667eea', icon:'💳', statementDay:null, dueDay:null, utilizationAlertPct:80 });
    this.showCardModal = true;
  }

  openEditCard(card: CreditCard, e: Event): void {
    e.stopPropagation();
    this.editingCard = card;
    this.cardForm.patchValue({
      name:                card.name,
      lastFourDigits:      card.lastFourDigits  ?? '',
      creditLimit:         card.creditLimit     ?? null,
      color:               card.color,
      icon:                card.icon,
      statementDay:        card.statementDay    ?? null,
      dueDay:              card.dueDay          ?? null,
      utilizationAlertPct: card.utilizationAlertPct ?? 80
    });
    this.showCardModal = true;
  }

  closeCardModal(): void { this.showCardModal = false; this.editingCard = null; }

  submitCard(): void {
    if (this.cardForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    const v = this.cardForm.value;
    const payload: any = {
      name:                v.name,
      lastFourDigits:      v.lastFourDigits      || null,
      creditLimit:         v.creditLimit         ? Number(v.creditLimit) : null,
      color:               v.color               || '#667eea',
      icon:                v.icon                || '💳',
      statementDay:        v.statementDay        ? Number(v.statementDay) : null,
      dueDay:              v.dueDay              ? Number(v.dueDay)       : null,
      utilizationAlertPct: v.utilizationAlertPct ? Number(v.utilizationAlertPct) : 80
    };
    const op = this.editingCard ? this.cardService.update(this.editingCard.id, payload) : this.cardService.create(payload);
    op.subscribe({
      next: () => { this.isSubmitting = false; this.cardService.invalidate(); this.loadCards(); this.closeCardModal(); },
      error: err => { this.isSubmitting = false; this.errorMessage = err?.error?.message || 'Failed to save card'; }
    });
  }

  deleteCard(card: CreditCard, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Delete "${card.name}"? Transactions will be kept but unlinked.`)) return;
    this.cardService.delete(card.id).subscribe({
      next: () => { if (this.expandedCardId === card.id) this.expandedCardId = null; this.cardService.invalidate(); this.loadCards(); },
      error: () => { this.errorMessage = 'Failed to delete card'; }
    });
  }

  // ── EXPAND / TABS ─────────────────────────────────────

  toggleExpand(card: CreditCard): void {
    if (this.expandedCardId === card.id) { this.expandedCardId = null; return; }
    this.expandedCardId = card.id;
    this.activeTab = 'transactions';
    this.txPage = 1;
    this.txFilters = { startDate:'', endDate:'', type:'', search:'' };
    this.loadTx(card.id);
  }

  setTab(tab: Tab): void {
    this.activeTab = tab;
    if (!this.expandedCardId) return;
    if (tab === 'history'       && !this.history.length)       this.loadHistory(this.expandedCardId);
    if (tab === 'subscriptions' && !this.subscriptions.length) this.loadSubscriptions(this.expandedCardId);
    if (tab === 'payments'      && !this.payments.length)      this.loadPayments(this.expandedCardId);
  }

  // ── TRANSACTIONS ──────────────────────────────────────

  loadTx(cardId: string): void {
    this.txLoading = true;
    this.cardService.getTransactions(cardId, {
      page: this.txPage, limit: this.txPageSize,
      startDate: this.txFilters.startDate || undefined,
      endDate:   this.txFilters.endDate   || undefined,
      type:      this.txFilters.type      || undefined,
      search:    this.txFilters.search    || undefined
    }).subscribe({
      next: (r: PageResult) => { this.txData = r.data; this.txTotal = r.total; this.txPages = r.pages; this.txSummary = r.summary; this.txLoading = false; },
      error: () => { this.txLoading = false; }
    });
  }

  applyTxFilters(): void { this.txPage = 1; if (this.expandedCardId) this.loadTx(this.expandedCardId); }
  onTxSearch(): void { clearTimeout(this.txSearchTimer); this.txSearchTimer = setTimeout(() => this.applyTxFilters(), 350); }
  prevTxPage(): void { if (this.txPage > 1 && this.expandedCardId) { this.txPage--; this.loadTx(this.expandedCardId); } }
  nextTxPage(): void { if (this.txPage < this.txPages && this.expandedCardId) { this.txPage++; this.loadTx(this.expandedCardId); } }
  goTxPage(p: number | '...'): void { if (typeof p !== 'number' || !this.expandedCardId) return; this.txPage = p; this.loadTx(this.expandedCardId); }

  get txPageNumbers(): (number | '...')[] {
    const total = this.txPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const curr = this.txPage;
    const vis = new Set<number>([1, total]);
    for (let i = Math.max(1, curr - 1); i <= Math.min(total, curr + 1); i++) vis.add(i);
    const sorted = Array.from(vis).sort((a, b) => a - b);
    const pages: (number | '...')[] = [];
    for (let i = 0; i < sorted.length; i++) { if (i > 0 && sorted[i] - sorted[i-1] > 1) pages.push('...'); pages.push(sorted[i]); }
    return pages;
  }

  // ── HISTORY ───────────────────────────────────────────

  loadHistory(cardId: string): void {
    this.historyLoading = true;
    this.cardService.getMonthlyHistory(cardId).subscribe({
      next: h => { this.history = h; this.historyLoading = false; },
      error: () => { this.historyLoading = false; }
    });
  }

  historyMax(): number { return Math.max(...this.history.map(h => h.expenses), 1); }

  barHeight(val: number): number { return Math.round((val / this.historyMax()) * 100); }

  fmtYearMonth(ym: string): string {
    const [y, m] = ym.split('-');
    return `${this.MONTHS[parseInt(m) - 1]} ${y}`;
  }

  // ── SUBSCRIPTIONS ─────────────────────────────────────

  loadSubscriptions(cardId: string): void {
    this.subsLoading = true;
    this.cardService.getSubscriptions(cardId).subscribe({
      next: s => { this.subscriptions = s; this.subsLoading = false; },
      error: () => { this.subsLoading = false; }
    });
  }

  refreshSubscriptions(): void { if (this.expandedCardId) { this.subscriptions = []; this.loadSubscriptions(this.expandedCardId); } }

  // ── PAYMENTS ─────────────────────────────────────────

  loadPayments(cardId: string): void {
    this.paymentsLoading = true;
    this.cardService.getPayments(cardId).subscribe({
      next: p => { this.payments = p; this.paymentsLoading = false; },
      error: () => { this.paymentsLoading = false; }
    });
  }

  openPaymentModal(): void {
    this.paymentForm.reset({
      amount: '', paymentDate: this.today(),
      billingMonth: new Date().getMonth() + 1,
      billingYear:  new Date().getFullYear(),
      paymentType: 'full', notes: ''
    });
    this.showPaymentModal = true;
  }

  closePaymentModal(): void { this.showPaymentModal = false; }

  submitPayment(): void {
    if (this.paymentForm.invalid || this.isPaymentSubmitting || !this.expandedCardId) return;
    this.isPaymentSubmitting = true;
    const v = this.paymentForm.value;
    this.cardService.recordPayment(this.expandedCardId, {
      amount:       Number(v.amount),
      paymentDate:  v.paymentDate,
      billingMonth: Number(v.billingMonth),
      billingYear:  Number(v.billingYear),
      paymentType:  v.paymentType,
      notes:        v.notes || null
    }).subscribe({
      next: () => {
        this.isPaymentSubmitting = false;
        this.closePaymentModal();
        this.payments = [];
        this.loadPayments(this.expandedCardId!);
        this.cardService.invalidate();
        this.loadCards();
      },
      error: err => { this.isPaymentSubmitting = false; this.errorMessage = err?.error?.message || 'Failed to record payment'; }
    });
  }

  confirmDeletePayment(payment: CardPayment): void {
    if (!confirm('Delete this payment record?') || !this.expandedCardId) return;
    this.cardService.deletePayment(this.expandedCardId, payment.id).subscribe({
      next: () => { this.payments = this.payments.filter(p => p.id !== payment.id); this.cardService.invalidate(); this.loadCards(); },
      error: () => { this.errorMessage = 'Failed to delete payment'; }
    });
  }

  paymentTypeLabel(type: string): string {
    return { minimum: 'Minimum', full: 'Full', partial: 'Partial' }[type] ?? type;
  }

  // ── IMPORT ────────────────────────────────────────────

  triggerImport(cardId: string, e?: Event): void {
    e?.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = (ev) => this.onFileSelected(ev as Event, cardId);
    input.click();
  }

  onFileSelected(event: Event, cardId: string): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importLoading = true; this.importCardId = cardId;
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      this.cardService.importPreview(cardId, csvText).subscribe({
        next: data => { this.importRows = data.transactions.map(t => ({ ...t })); this.importCategories = data.categories; this.importLoading = false; this.importError = ''; this.importSuccess = ''; this.showImportModal = true; },
        error: err  => { this.importLoading = false; this.errorMessage = err?.error?.message || 'Falha ao processar o CSV'; }
      });
    };
    reader.onerror = () => { this.importLoading = false; this.errorMessage = 'Falha ao ler o arquivo'; };
    reader.readAsText(file);
  }

  closeImportModal(): void { this.showImportModal = false; this.importRows = []; this.importCategories = []; this.importError = ''; this.importSuccess = ''; this.importFilter = 'all'; this.importCardId = null; }
  removeImportRow(row: any): void { const i = this.importRows.indexOf(row); if (i !== -1) this.importRows.splice(i, 1); }
  importCats(type: string): any[] { return this.importCategories.filter(c => c.type === type); }

  confirmImport(): void {
    if (!this.importCardId) return;
    if (this.importRows.some(r => !r.categoryId)) { this.importError = 'Atribua uma categoria a todas as transações antes de importar'; return; }
    this.importLoading = true; this.importError = '';
    this.cardService.importConfirm(this.importCardId, this.importRows).subscribe({
      next: result => {
        this.importLoading = false; this.importSuccess = result.message; this.importRows = [];
        if (this.expandedCardId && this.expandedCardId === this.importCardId) { this.txPage = 1; this.loadTx(this.expandedCardId); }
        this.loadCards();
        setTimeout(() => this.closeImportModal(), 2500);
      },
      error: err => { this.importLoading = false; this.importError = err?.error?.message || 'Falha ao importar transações'; }
    });
  }

  // ── HELPERS ───────────────────────────────────────────

  importBtnLabel(): string {
    const n = this.importRows.length;
    return this.lang.t('creditCards.importBtn', { n });
  }

  txFoundLabel(): string {
    return this.lang.t('creditCards.txFound', { n: this.importRows.length });
  }

  fmt(v: any): string { return Number(v || 0).toFixed(2); }
  today(): string { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; }
  fmtDate(d: string): string {
    const locale = this.lang.currentLang === 'pt-BR' ? 'pt-BR' : 'en-GB';
    return new Date(d).toLocaleDateString(locale, { day:'numeric', month:'short', year:'numeric' });
  }
  maskDigits(d?: string | null): string { return d ? `•••• •••• •••• ${d}` : '•••• •••• •••• ••••'; }

  utilizationClass(pct: number | null | undefined): string {
    if (pct == null) return '';
    return pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'ok';
  }

  catName(t: Transaction):  string { return t.category?.name  || 'Unknown'; }
  catColor(t: Transaction): string { return t.category?.color || '#6b7280'; }
  catIcon(t: Transaction):  string { return t.category?.icon  || ''; }

  monthOptions(): { value: number; label: string }[] {
    return this.MONTHS.map((m, i) => ({ value: i + 1, label: m }));
  }

  yearOptions(): number[] {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }
}
