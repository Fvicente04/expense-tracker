import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { ReportService, ReportSummary, CategoryReport, MonthlyReport } from '../../../services/report';
import { TransactionService } from '../../../services/transaction';
import { AuthService } from '../../../services/auth';
import { Transaction } from '../../../models/transaction';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { LucideIconComponent, LUCIDE_ICON_NAMES } from '../../shared/lucide-icon';

Chart.register(...registerables);

export interface QuickInsight {
  type: 'up' | 'down' | 'info';
  key: string;
  params?: Record<string, string | number>;
}

export interface ForecastMonth {
  label: string;
  year: number;
  month: number;
  projectedIncome: number;
  projectedExpenses: number;
  balance: number;
  cumulative: number;
  isCurrentMonth: boolean;
  isPast: boolean;
}

export interface Scenario {
  id: string;
  label: string;
  type: 'income' | 'expense';
  monthlyDelta: number;
  startMonth: number | null; // 0-11, null = current month
  endMonth: number | null;   // 0-11, null = December
}

@Component({
  selector: 'app-reports-view',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, TranslatePipe, LucideIconComponent],
  templateUrl: './reports-view.html',
  styleUrl: './reports-view.css'
})
export class ReportsViewComponent implements OnInit {
  filterForm!: FormGroup;
  isLoading = false;
  errorMessage = '';

  summary: ReportSummary = { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0 };
  previousSummary: ReportSummary = { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0 };

  expensesByCategory: CategoryReport[] = [];
  previousPeriodCategories: CategoryReport[] = [];
  monthlyTrend: MonthlyReport[] = [];
  quickInsights: QuickInsight[] = [];

  categoryChart: Chart | null = null;
  trendChart: Chart | null = null;
  forecastChart: Chart | null = null;

  forecastMonths: ForecastMonth[] = [];
  simulatedMonths: ForecastMonth[] = [];
  allTransactions: Transaction[] = [];
  forecastYear: number = new Date().getFullYear();

  showSimulator = false;
  scenarios: Scenario[] = [];
  newScenarioLabel = '';
  newScenarioType: 'income' | 'expense' = 'income';
  newScenarioAmount = 0;
  newScenarioStartMonth: number | null = null;
  newScenarioEndMonth: number | null = null;

  currencySymbol = '€';
  quickScenarios: Omit<Scenario, 'id'>[] = [];

  get monthNames(): string[] {
    const locale = this.lang.currentLang === 'pt-BR' ? 'pt-BR' : 'en-US';
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i).toLocaleString(locale, { month: 'short' })
    );
  }

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private transactionService: TransactionService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public lang: LanguageService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user?.currency) {
        this.currencySymbol = this.getCurrencySymbol(user.currency);
        this.buildQuickScenarios();
      }
    });
    this.buildQuickScenarios();
    this.initForm();
    setTimeout(() => this.loadReports(), 100);
  }

  private getCurrencySymbol(code: string): string {
    const map: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' };
    return map[code] ?? code;
  }

  private buildQuickScenarios(): void {
    const s = this.currencySymbol;
    this.quickScenarios = [
      { label: `+${s}200 ${this.lang.t('reports.qsSavings')}`,     type: 'income',  monthlyDelta:  200, startMonth: null, endMonth: null },
      { label: `${this.lang.t('reports.qsSalary')} +${s}500`,      type: 'income',  monthlyDelta:  500, startMonth: null, endMonth: null },
      { label: `${this.lang.t('reports.qsSideHustle')} +${s}800`,  type: 'income',  monthlyDelta:  800, startMonth: null, endMonth: null },
      { label: `${this.lang.t('reports.qsSubscription')} −${s}50`, type: 'expense', monthlyDelta:  -50, startMonth: null, endMonth: null },
      { label: `${this.lang.t('reports.qsDining')} −${s}150`,      type: 'expense', monthlyDelta: -150, startMonth: null, endMonth: null },
      { label: `${this.lang.t('reports.qsRent')} −${s}300`,        type: 'expense', monthlyDelta: -300, startMonth: null, endMonth: null },
    ];
  }

  initForm(): void {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.filterForm = this.fb.group({
      startDate: [this.fmtDate(start)],
      endDate: [this.fmtDate(end)]
    });
  }

  fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
  onFilterChange(): void { this.loadReports(); }

  private prevDates(): { start: string; end: string } {
    const s = new Date(this.filterForm.get('startDate')?.value);
    const e = new Date(this.filterForm.get('endDate')?.value);
    const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
    const pe = new Date(s); pe.setDate(pe.getDate() - 1);
    const ps = new Date(pe); ps.setDate(ps.getDate() - (days - 1));
    return { start: this.fmtDate(ps), end: this.fmtDate(pe) };
  }

  loadReports(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.quickInsights = [];

    const start = this.filterForm.get('startDate')?.value;
    const end = this.filterForm.get('endDate')?.value;
    const prev = this.prevDates();

    const loaded = { summary: false, prevSummary: false, category: false, prevCat: false, trend: false, transactions: false };

    const check = () => {
      if (!Object.values(loaded).every(Boolean)) return;
      this.isLoading = false;
      this.buildForecast();
      this.buildInsights();
      this.cdr.detectChanges();
      setTimeout(() => this.createCharts(), 500);
    };

    this.reportService.getSummary(start, end).subscribe({
      next: d => { this.summary = d; loaded.summary = true; check(); },
      error: () => { this.errorMessage = 'Failed to load summary'; this.isLoading = false; }
    });
    this.reportService.getSummary(prev.start, prev.end).subscribe({
      next: d => { this.previousSummary = d; loaded.prevSummary = true; check(); },
      error: () => { loaded.prevSummary = true; check(); }
    });
    this.reportService.getByCategory('expense', start, end).subscribe({
      next: d => { this.expensesByCategory = d; loaded.category = true; check(); },
      error: () => { loaded.category = true; check(); }
    });
    this.reportService.getByCategory('expense', prev.start, prev.end).subscribe({
      next: d => { this.previousPeriodCategories = d; loaded.prevCat = true; check(); },
      error: () => { this.previousPeriodCategories = []; loaded.prevCat = true; check(); }
    });
    this.reportService.getMonthlyTrend(6).subscribe({
      next: d => { this.monthlyTrend = d; loaded.trend = true; check(); },
      error: () => { loaded.trend = true; check(); }
    });
    this.transactionService.getAll().subscribe({
      next: d => { this.allTransactions = d ?? []; loaded.transactions = true; check(); },
      error: () => { this.allTransactions = []; loaded.transactions = true; check(); }
    });
  }

  // ── FORECAST ────────────────────────────────────────────────────────────────

  buildForecast(): void {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const year = this.forecastYear;
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const baseline = this.buildHistoricalBaseline();

    let cum = 0, simCum = 0;
    const months: ForecastMonth[] = [];
    const simMonths: ForecastMonth[] = [];

    for (let m = 0; m <= 11; m++) {
      const isPast    = year < currentYear || (year === currentYear && m < currentMonth);
      const isCurrent = year === currentYear && m === currentMonth;

      const incDelta = this.scenarios
        .filter(s => s.type === 'income' && this.scenarioAppliesToMonth(s, m, year))
        .reduce((sum, s) => sum + s.monthlyDelta, 0);
      const expDelta = this.scenarios
        .filter(s => s.type === 'expense' && this.scenarioAppliesToMonth(s, m, year))
        .reduce((sum, s) => sum + Math.abs(s.monthlyDelta), 0);

      if (isPast) {
        const actual = this.actualMonthData(this.allTransactions, year, m);
        const bal = actual.income - actual.expenses;
        cum += bal; simCum += bal;
        const base: ForecastMonth = {
          label: this.monthNames[m], year, month: m,
          projectedIncome: actual.income, projectedExpenses: actual.expenses,
          balance: bal, cumulative: cum, isCurrentMonth: false, isPast: true
        };
        months.push(base);
        simMonths.push({ ...base, cumulative: simCum });

      } else if (isCurrent) {
        const actual = this.actualMonthData(this.allTransactions, year, m);
        const bal = actual.income - actual.expenses;
        cum += bal;
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const remaining = Math.max(0, (daysInMonth - today.getDate()) / daysInMonth);
        const simIncome = actual.income + incDelta * remaining;
        const simExp    = actual.expenses + expDelta * remaining;
        simCum += simIncome - simExp;
        months.push({ label: this.monthNames[m], year, month: m, projectedIncome: actual.income, projectedExpenses: actual.expenses, balance: bal, cumulative: cum, isCurrentMonth: true, isPast: false });
        simMonths.push({ label: this.monthNames[m], year, month: m, projectedIncome: simIncome, projectedExpenses: simExp, balance: simIncome - simExp, cumulative: simCum, isCurrentMonth: true, isPast: false });

      } else {
        // Future: use actual scheduled transactions (recurring entries already exist in DB).
        // Fall back to historical average only when the month has no data at all.
        const actual = this.actualMonthData(this.allTransactions, year, m);
        const hasData = actual.income > 0 || actual.expenses > 0;
        const baseInc = hasData ? actual.income   : baseline.avgIncome;
        const baseExp = hasData ? actual.expenses : baseline.avgExpenses;
        const bal = baseInc - baseExp;
        cum += bal;
        const simIncome = baseInc + incDelta;
        const simExp2   = baseExp + expDelta;
        simCum += simIncome - simExp2;
        months.push({ label: this.monthNames[m], year, month: m, projectedIncome: baseInc, projectedExpenses: baseExp, balance: bal, cumulative: cum, isCurrentMonth: false, isPast: false });
        simMonths.push({ label: this.monthNames[m], year, month: m, projectedIncome: simIncome, projectedExpenses: simExp2, balance: simIncome - simExp2, cumulative: simCum, isCurrentMonth: false, isPast: false });
      }
    }

    this.forecastMonths = months;
    this.simulatedMonths = simMonths;
  }

  private buildHistoricalBaseline(): { avgIncome: number; avgExpenses: number } {
    const today = new Date();
    const samples: { income: number; expenses: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const data = this.actualMonthData(this.allTransactions, d.getFullYear(), d.getMonth());
      if (data.income > 0 || data.expenses > 0) samples.push(data);
    }
    if (!samples.length) return { avgIncome: 0, avgExpenses: 0 };
    return {
      avgIncome:   samples.reduce((s, m) => s + m.income,   0) / samples.length,
      avgExpenses: samples.reduce((s, m) => s + m.expenses, 0) / samples.length
    };
  }

  private actualMonthData(transactions: Transaction[], year: number, month: number): { income: number; expenses: number } {
    const t = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      income:   t.filter(t => t.type === 'income') .reduce((s, t) => s + Number(t.amount), 0),
      expenses: t.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    };
  }

  private scenarioAppliesToMonth(s: Scenario, month: number, year: number): boolean {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();
    const startKey = curYear * 12 + (s.startMonth ?? curMonth);
    const endKey   = curYear * 12 + (s.endMonth   ?? 11);
    const targetKey = year * 12 + month;
    return targetKey >= startKey && targetKey <= endKey;
  }

  get displayMonths(): ForecastMonth[] {
    return this.scenarios.length > 0 ? this.simulatedMonths : this.forecastMonths;
  }

  getMonthDelta(idx: number): { income: number; expenses: number; balance: number } | null {
    if (!this.scenarios.length) return null;
    const base = this.forecastMonths[idx];
    const sim  = this.simulatedMonths[idx];
    if (!base || !sim || base.isPast) return null;
    const income   = sim.projectedIncome   - base.projectedIncome;
    const expenses = sim.projectedExpenses - base.projectedExpenses;
    if (Math.abs(income) < 0.01 && Math.abs(expenses) < 0.01) return null;
    return { income, expenses, balance: sim.balance - base.balance };
  }

  get simulatedYearEnd(): ForecastMonth | null { return this.simulatedMonths.find(m => m.month === 11) ?? null; }
  get baseYearEnd(): ForecastMonth | null       { return this.forecastMonths.find(m => m.month === 11)  ?? null; }
  get yearEndDelta(): number { return (this.simulatedYearEnd?.cumulative ?? 0) - (this.baseYearEnd?.cumulative ?? 0); }

  get hasHistoricalData(): boolean { return this.buildHistoricalBaseline().avgIncome > 0 || this.buildHistoricalBaseline().avgExpenses > 0; }

  prevYear(): void { this.forecastYear--; this.buildForecast(); setTimeout(() => this.createForecastChart(), 0); }
  nextYear(): void { this.forecastYear++; this.buildForecast(); setTimeout(() => this.createForecastChart(), 0); }

  // ── SIMULATOR ───────────────────────────────────────────────────────────────

  toggleSimulator(): void { this.showSimulator = !this.showSimulator; this.resetNewForm(); }

  resetNewForm(): void {
    this.newScenarioLabel = '';
    this.newScenarioType = 'income';
    this.newScenarioAmount = 0;
    this.newScenarioStartMonth = null;
    this.newScenarioEndMonth = null;
  }

  addQuickScenario(q: Omit<Scenario, 'id'>): void {
    const existing = this.scenarios.find(s => s.label === q.label);
    if (existing) { this.removeScenario(existing.id); return; }
    this.scenarios = [...this.scenarios, { ...q, id: Date.now().toString() }];
    this.buildForecast();
    setTimeout(() => this.createForecastChart(), 0);
  }

  addCustomScenario(): void {
    if (!this.newScenarioLabel.trim() || this.newScenarioAmount <= 0) return;
    let start = this.newScenarioStartMonth;
    let end   = this.newScenarioEndMonth;
    if (start !== null && end !== null && start > end) [start, end] = [end, start];
    const delta = this.newScenarioType === 'expense'
      ? -Math.abs(this.newScenarioAmount)
      :  Math.abs(this.newScenarioAmount);
    this.scenarios = [...this.scenarios, {
      id: Date.now().toString(),
      label: this.newScenarioLabel.trim(),
      type: this.newScenarioType,
      monthlyDelta: delta,
      startMonth: start,
      endMonth: end
    }];
    this.buildForecast();
    setTimeout(() => this.createForecastChart(), 0);
    this.resetNewForm();
  }

  removeScenario(id: string): void {
    this.scenarios = this.scenarios.filter(s => s.id !== id);
    this.buildForecast();
    setTimeout(() => this.createForecastChart(), 0);
  }

  clearScenarios(): void {
    this.scenarios = [];
    this.buildForecast();
    setTimeout(() => this.createForecastChart(), 0);
  }

  isQuickActive(q: Omit<Scenario, 'id'>): boolean {
    return this.scenarios.some(s => s.label === q.label);
  }

  scenarioRange(s: Scenario): string {
    if (s.startMonth === null && s.endMonth === null) return '';
    const names = this.monthNames;
    const start = s.startMonth !== null ? names[s.startMonth] : this.lang.t('reports.fromNow');
    const end   = s.endMonth   !== null ? names[s.endMonth]   : this.lang.t('reports.decMonth');
    return `${start}–${end}`;
  }

  // ── INSIGHTS ─────────────────────────────────────────────────────────────────

  buildInsights(): void {
    this.quickInsights = [];
    const sym = this.currencySymbol;

    if (this.previousSummary.totalExpense > 0) {
      const diff = this.summary.totalExpense - this.previousSummary.totalExpense;
      const pct  = Math.abs(Math.round((diff / this.previousSummary.totalExpense) * 100));
      if (diff > 0) this.quickInsights.push({ type: 'up',   key: 'reports.insightExpUp',   params: { pct } });
      else if (diff < 0) this.quickInsights.push({ type: 'down', key: 'reports.insightExpDown', params: { pct } });
    }
    if (this.expensesByCategory.length > 0 && this.summary.totalExpense > 0) {
      const top = [...this.expensesByCategory].sort((a, b) => b.amount - a.amount)[0];
      const pct = Math.round((top.amount / this.summary.totalExpense) * 100);
      if (pct >= 25) this.quickInsights.push({ type: 'info', key: 'reports.insightTopCat', params: { cat: top.categoryName, pct } });
    }
    if (this.summary.totalIncome > 0) {
      const rate = Math.round((this.summary.balance / this.summary.totalIncome) * 100);
      if (rate > 0)  this.quickInsights.push({ type: 'down', key: 'reports.insightSaved',     params: { rate } });
      else if (rate < 0) this.quickInsights.push({ type: 'up', key: 'reports.insightSpentMore', params: { sym, amount: Math.abs(this.summary.balance).toFixed(0) } });
    }
    const dec = this.forecastMonths.find(m => m.month === 11) ?? null;
    if (dec) {
      if (dec.cumulative > 0) this.quickInsights.push({ type: 'down', key: 'reports.insightYearEnd', params: { year: this.forecastYear, sym, amount: dec.cumulative.toFixed(0) } });
      else this.quickInsights.push({ type: 'up', key: 'reports.insightDeficit', params: { sym, amount: Math.abs(dec.cumulative).toFixed(0), year: this.forecastYear } });
    }
  }

  // ── CHARTS ───────────────────────────────────────────────────────────────────

  createCharts(): void { this.createCategoryChart(); this.createTrendChart(); this.createForecastChart(); }

  private getTop5WithOther(): { labels: string[]; data: number[]; colors: string[] } {
    if (!this.expensesByCategory.length) return { labels: [], data: [], colors: [] };
    const sorted = [...this.expensesByCategory].sort((a, b) => b.amount - a.amount);
    const top5 = sorted.slice(0, 5);
    const rest  = sorted.slice(5);
    const labels = top5.map(c => c.categoryName);
    const data   = top5.map(c => c.amount);
    const colors = top5.map(c => c.categoryColor);
    if (rest.length) { labels.push('Other'); data.push(rest.reduce((s, c) => s + c.amount, 0)); colors.push('#94a3b8'); }
    return { labels, data, colors };
  }

  private createCategoryChart(): void {
    if (!this.expensesByCategory.length) return;
    const canvas = document.getElementById('categoryChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.categoryChart) this.categoryChart.destroy();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { labels, data, colors } = this.getTop5WithOther();
    const sym = this.currencySymbol;
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 }, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { callbacks: { label: (ctx: any) => { const v = ctx.parsed || 0; const tot = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0); return `${ctx.label}: ${sym}${v.toFixed(2)} (${tot > 0 ? ((v / tot) * 100).toFixed(1) : 0}%)`; } } }
        }
      }
    };
    try { this.categoryChart = new Chart(ctx, config); } catch { }
  }

  private createTrendChart(): void {
    if (!this.monthlyTrend.length) return;
    const canvas = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.trendChart) this.trendChart.destroy();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sym = this.currencySymbol;
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.monthlyTrend.map(m => `${m.month} ${m.year}`),
        datasets: [
          { label: 'Income',   data: this.monthlyTrend.map(m => m.income),  borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)',  borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#22c55e', pointBorderColor: '#fff', pointBorderWidth: 2 },
          { label: 'Expenses', data: this.monthlyTrend.map(m => m.expense), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',  borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 }, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${sym}${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => `${sym}${v}`, font: { size: 12 } } },
          x: { grid: { display: false }, ticks: { font: { size: 12 } } }
        }
      }
    };
    try { this.trendChart = new Chart(ctx, config); } catch { }
  }

  private createForecastChart(): void {
    if (!this.forecastMonths.length) return;
    const canvas = document.getElementById('forecastChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.forecastChart) this.forecastChart.destroy();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sym = this.currencySymbol;
    const hasScenarios = this.scenarios.length > 0;

    const datasets: any[] = [{
      label: 'Projected balance',
      data: this.forecastMonths.map(m => +m.cumulative.toFixed(2)),
      borderColor: '#667eea',
      backgroundColor: 'rgba(102,126,234,0.07)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointRadius: this.forecastMonths.map(m => m.isCurrentMonth ? 7 : 4),
      pointHoverRadius: 8,
      pointBackgroundColor: this.forecastMonths.map(m => m.isPast ? '#667eea' : 'white'),
      pointBorderColor: '#667eea',
      pointBorderWidth: 2,
    }];

    if (hasScenarios) {
      datasets.push({
        label: 'Simulated balance',
        data: this.simulatedMonths.map(m => +m.cumulative.toFixed(2)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.04)',
        borderWidth: 2.5,
        borderDash: [7, 4],
        tension: 0.35,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: 'white',
        pointBorderColor: '#22c55e',
        pointBorderWidth: 2,
      });
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: { labels: this.forecastMonths.map(m => m.label), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 }, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${sym}${(ctx.parsed.y ?? 0).toFixed(2)}` } }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: '#f1f5f9' },
            ticks: { callback: (v: any) => `${sym}${v}`, font: { size: 11 } }
          },
          x: { grid: { display: false }, ticks: { font: { size: 12 } } }
        }
      }
    };

    try { this.forecastChart = new Chart(ctx, config); } catch { }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────

  printReport(): void { window.print(); }
  getBalanceClass(): string { return this.summary.balance >= 0 ? 'positive' : 'negative'; }

  getTopCategories(): CategoryReport[] {
    return [...this.expensesByCategory].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }

  isLucideIcon(icon: string): boolean { return LUCIDE_ICON_NAMES.has(icon); }

  getVsLastPeriod(category: CategoryReport): { pct: number; direction: 'up' | 'down' | 'same' } | null {
    if (!this.previousPeriodCategories.length) return null;
    const prev    = this.previousPeriodCategories.find(c => c.categoryName === category.categoryName);
    const prevAmt = prev?.amount ?? 0;
    if (prevAmt === 0 && category.amount === 0) return null;
    if (prevAmt === 0) return { pct: 100, direction: 'up' };
    const diff = category.amount - prevAmt;
    if (Math.abs(diff) < 0.01) return { pct: 0, direction: 'same' };
    return { pct: Math.round(Math.abs(diff / prevAmt) * 100), direction: diff > 0 ? 'up' : 'down' };
  }
}
