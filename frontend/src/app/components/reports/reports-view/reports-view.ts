import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar/navbar';
import { ReportService, ReportSummary, CategoryReport, MonthlyReport } from '../../../services/report';
import { TransactionService } from '../../../services/transaction';
import { Transaction } from '../../../models/transaction';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface QuickInsight {
  type: 'up' | 'down' | 'info';
  text: string;
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
}

@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './reports-view.html',
  styleUrls: ['./reports-view.css']
})
export class ReportsViewComponent implements OnInit, AfterViewInit {
  filterForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  viewInitialized = false;

  summary: ReportSummary = { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0 };
  previousSummary: ReportSummary = { totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0 };

  expensesByCategory: CategoryReport[] = [];
  previousPeriodCategories: CategoryReport[] = [];
  monthlyTrend: MonthlyReport[] = [];
  quickInsights: QuickInsight[] = [];

  categoryChart: Chart | null = null;
  trendChart: Chart | null = null;

  forecastMonths: ForecastMonth[] = [];
  simulatedMonths: ForecastMonth[] = [];
  allTransactions: Transaction[] = [];
  forecastYear: number = new Date().getFullYear();

  showSimulator = false;
  scenarios: Scenario[] = [];
  newScenarioLabel    = '';
  newScenarioType: 'income' | 'expense' = 'income';
  newScenarioAmount   = 0;

  readonly QUICK_SCENARIOS: Omit<Scenario, 'id'>[] = [
    { label: '+\u20AC200 savings/month',      type: 'income',  monthlyDelta:  200 },
    { label: 'Salary raise +\u20AC500',       type: 'income',  monthlyDelta:  500 },
    { label: 'Side hustle +\u20AC800',        type: 'income',  monthlyDelta:  800 },
    { label: 'Remove subscription \u2212\u20AC50', type: 'expense', monthlyDelta: -50  },
    { label: 'Cut dining \u2212\u20AC150',    type: 'expense', monthlyDelta: -150 },
    { label: 'Extra rent \u2212\u20AC300',    type: 'expense', monthlyDelta: -300 },
  ];

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private transactionService: TransactionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.initForm(); }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    setTimeout(() => this.loadReports(), 100);
  }

  initForm(): void {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.filterForm = this.fb.group({
      startDate: [this.fmtDate(start)],
      endDate:   [this.fmtDate(end)]
    });
  }

  fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }
  onFilterChange(): void { this.loadReports(); }

  private prevDates(): { start: string; end: string } {
    const s    = new Date(this.filterForm.get('startDate')?.value);
    const e    = new Date(this.filterForm.get('endDate')?.value);
    const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
    const pe   = new Date(s); pe.setDate(pe.getDate() - 1);
    const ps   = new Date(pe); ps.setDate(ps.getDate() - (days - 1));
    return { start: this.fmtDate(ps), end: this.fmtDate(pe) };
  }

  loadReports(): void {
    if (!this.viewInitialized) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.quickInsights = [];

    const start = this.filterForm.get('startDate')?.value;
    const end   = this.filterForm.get('endDate')?.value;
    const prev  = this.prevDates();

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
      next:  d => { this.summary = d; loaded.summary = true; check(); },
      error: () => { this.errorMessage = 'Failed to load summary'; this.isLoading = false; }
    });
    this.reportService.getSummary(prev.start, prev.end).subscribe({
      next:  d => { this.previousSummary = d; loaded.prevSummary = true; check(); },
      error: () => { loaded.prevSummary = true; check(); }
    });
    this.reportService.getByCategory('expense', start, end).subscribe({
      next:  d => { this.expensesByCategory = d; loaded.category = true; check(); },
      error: () => { loaded.category = true; check(); }
    });
    this.reportService.getByCategory('expense', prev.start, prev.end).subscribe({
      next:  d => { this.previousPeriodCategories = d; loaded.prevCat = true; check(); },
      error: () => { this.previousPeriodCategories = []; loaded.prevCat = true; check(); }
    });
    this.reportService.getMonthlyTrend(6).subscribe({
      next:  d => { this.monthlyTrend = d; loaded.trend = true; check(); },
      error: () => { loaded.trend = true; check(); }
    });
    this.transactionService.getAll().subscribe({
      next:  d => { this.allTransactions = d ?? []; loaded.transactions = true; check(); },
      error: () => { this.allTransactions = []; loaded.transactions = true; check(); }
    });
  }

  buildForecast(): void {
    const today  = new Date();
    today.setHours(23, 59, 59, 999);
    const year  = this.forecastYear;
    const month = today.getMonth();

    const past      = this.allTransactions.filter(t => new Date(t.date) <= today);
    const recurring = this.allTransactions.filter(t => (t as any).isRecurring);

    const avgExpenses = this.varMonthlyAvg(past, recurring, 'expense', 3);

    const incDelta = this.scenarios.filter(s => s.type === 'income').reduce((sum, s) => sum + s.monthlyDelta, 0);
    const expDelta = this.scenarios.filter(s => s.type === 'expense').reduce((sum, s) => sum + Math.abs(s.monthlyDelta), 0);

    let cum = 0, simCum = 0;
    const months: ForecastMonth[]    = [];
    const simMonths: ForecastMonth[] = [];
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    for (let m = 0; m <= 11; m++) {
      const isPast    = m < month;
      const isCurrent = m === month;

      if (isPast) {
        const actual = this.actualMonthData(past, year, m);
        const bal    = actual.income - actual.expenses;
        cum    += bal;
        simCum += bal;
        const base: ForecastMonth = {
          label: names[m], year, month: m,
          projectedIncome: actual.income, projectedExpenses: actual.expenses,
          balance: bal, cumulative: cum, isCurrentMonth: false, isPast: true
        };
        months.push(base);
        simMonths.push({ ...base, cumulative: simCum });

      } else if (isCurrent) {
        const actual        = this.actualMonthData(past, year, m);
        const recInc        = this.recurringForMonth(recurring, year, m, 'income');
        const recExp        = this.recurringForMonth(recurring, year, m, 'expense');
        const alreadyRecInc = this.recurringBeforeToday(recurring, year, m, 'income',  today);
        const alreadyRecExp = this.recurringBeforeToday(recurring, year, m, 'expense', today);
        const totalIncome   = actual.income   + (recInc - alreadyRecInc);
        const totalExp      = actual.expenses + (recExp - alreadyRecExp);
        const bal           = totalIncome - totalExp;
        cum += bal;

        const daysInMonth    = new Date(year, m + 1, 0).getDate();
        const remaining      = Math.max(0, (daysInMonth - today.getDate()) / daysInMonth);
        const simIncome      = totalIncome + (incDelta * remaining);
        const simExp         = totalExp    + (expDelta * remaining);
        const simBal         = simIncome - simExp;
        simCum += simBal;

        months.push({
          label: names[m], year, month: m,
          projectedIncome: totalIncome, projectedExpenses: totalExp,
          balance: bal, cumulative: cum, isCurrentMonth: true, isPast: false
        });
        simMonths.push({
          label: names[m], year, month: m,
          projectedIncome: simIncome, projectedExpenses: simExp,
          balance: simBal, cumulative: simCum, isCurrentMonth: true, isPast: false
        });

      } else {
        const recInc  = this.recurringForMonth(recurring, year, m, 'income');
        const recExp  = this.recurringForMonth(recurring, year, m, 'expense');
        const projInc = recInc;
        const projExp = recExp + avgExpenses;
        const bal     = projInc - projExp;
        cum += bal;

        const simIncome = projInc + incDelta;
        const simExp    = projExp + expDelta;
        const simBal    = simIncome - simExp;
        simCum += simBal;

        months.push({
          label: names[m], year, month: m,
          projectedIncome: projInc, projectedExpenses: projExp,
          balance: bal, cumulative: cum, isCurrentMonth: false, isPast: false
        });
        simMonths.push({
          label: names[m], year, month: m,
          projectedIncome: simIncome, projectedExpenses: simExp,
          balance: simBal, cumulative: simCum, isCurrentMonth: false, isPast: false
        });
      }
    }

    this.forecastMonths  = months;
    this.simulatedMonths = simMonths;
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
  get baseYearEnd(): ForecastMonth | null       { return this.forecastMonths.find(m => m.month === 11) ?? null; }
  get yearEndDelta(): number { return (this.simulatedYearEnd?.cumulative ?? 0) - (this.baseYearEnd?.cumulative ?? 0); }

  toggleSimulator(): void {
    this.showSimulator = !this.showSimulator;
    this.resetNewForm();
  }

  resetNewForm(): void {
    this.newScenarioLabel  = '';
    this.newScenarioType   = 'income';
    this.newScenarioAmount = 0;
  }

  addQuickScenario(q: Omit<Scenario, 'id'>): void {
    const existing = this.scenarios.find(s => s.label === q.label);
    if (existing) { this.removeScenario(existing.id); return; }
    this.scenarios = [...this.scenarios, { ...q, id: Date.now().toString() }];
    this.buildForecast();
  }

  addCustomScenario(): void {
    if (!this.newScenarioLabel.trim() || this.newScenarioAmount <= 0) return;
    const delta = this.newScenarioType === 'expense'
      ? -Math.abs(this.newScenarioAmount)
      :  Math.abs(this.newScenarioAmount);
    this.scenarios = [...this.scenarios, {
      id: Date.now().toString(),
      label: this.newScenarioLabel.trim(),
      type: this.newScenarioType,
      monthlyDelta: delta
    }];
    this.buildForecast();
    this.resetNewForm();
  }

  removeScenario(id: string): void {
    this.scenarios = this.scenarios.filter(s => s.id !== id);
    this.buildForecast();
  }

  clearScenarios(): void { this.scenarios = []; this.buildForecast(); }

  isQuickActive(q: Omit<Scenario, 'id'>): boolean {
    return this.scenarios.some(s => s.label === q.label);
  }

  private varMonthlyAvg(all: Transaction[], recurring: Transaction[], type: 'income' | 'expense', months: number): number {
    const today = new Date();
    let total = 0, count = 0;
    for (let i = 1; i <= months; i++) {
      const d     = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yr    = d.getFullYear();
      const mo    = d.getMonth();
      const hasIncome = all.some(t => {
        const td = new Date(t.date);
        return t.type === 'income' && td.getFullYear() === yr && td.getMonth() === mo;
      });
      if (!hasIncome) continue;
      const actual = all
        .filter(t => { const td = new Date(t.date); return t.type === type && td.getFullYear() === yr && td.getMonth() === mo; })
        .reduce((s, t) => s + Number(t.amount), 0);
      const rec = recurring
        .filter(t => { const td = new Date(t.date); return t.type === type && td.getFullYear() === yr && td.getMonth() === mo; })
        .reduce((s, t) => s + Number(t.amount), 0);
      total += Math.max(0, actual - rec);
      count++;
    }
    return count > 0 ? total / count : 0;
  }

  private actualMonthData(transactions: Transaction[], year: number, month: number): { income: number; expenses: number } {
    const t = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      income:   t.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount), 0),
      expenses: t.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    };
  }

  private recurringForMonth(transactions: Transaction[], year: number, month: number, type: 'income' | 'expense'): number {
    return transactions
      .filter(t => { const d = new Date(t.date); return t.type === type && d.getFullYear() === year && d.getMonth() === month; })
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  private recurringBeforeToday(transactions: Transaction[], year: number, month: number, type: 'income' | 'expense', today: Date): number {
    return transactions
      .filter(t => { const d = new Date(t.date); return t.type === type && d.getFullYear() === year && d.getMonth() === month && d <= today; })
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  private decemberForecast(): ForecastMonth | null {
    return this.forecastMonths.find(m => m.month === 11) ?? null;
  }

  buildInsights(): void {
    this.quickInsights = [];
    if (this.previousSummary.totalExpense > 0) {
      const diff = this.summary.totalExpense - this.previousSummary.totalExpense;
      const pct  = Math.abs(Math.round((diff / this.previousSummary.totalExpense) * 100));
      if (diff > 0)      this.quickInsights.push({ type: 'up',   text: `Expenses up <strong>${pct}%</strong> vs previous period` });
      else if (diff < 0) this.quickInsights.push({ type: 'down', text: `Expenses down <strong>${pct}%</strong> vs previous period` });
    }
    if (this.expensesByCategory.length > 0 && this.summary.totalExpense > 0) {
      const top = [...this.expensesByCategory].sort((a, b) => b.amount - a.amount)[0];
      const pct = Math.round((top.amount / this.summary.totalExpense) * 100);
      if (pct >= 25) this.quickInsights.push({ type: 'info', text: `<strong>${top.categoryName}</strong> represents ${pct}% of total spending` });
    }
    if (this.summary.totalIncome > 0) {
      const rate = Math.round((this.summary.balance / this.summary.totalIncome) * 100);
      if (rate > 0)      this.quickInsights.push({ type: 'down', text: `You saved <strong>${rate}%</strong> of your income this period` });
      else if (rate < 0) this.quickInsights.push({ type: 'up',   text: `Spent <strong>\u20AC${Math.abs(this.summary.balance).toFixed(0)}</strong> more than earned this period` });
    }
    const dec = this.decemberForecast();
    if (dec) {
      if (dec.cumulative > 0) this.quickInsights.push({ type: 'down', text: `On track to end ${this.forecastYear} with <strong>\u20AC${dec.cumulative.toFixed(0)}</strong> accumulated balance` });
      else                    this.quickInsights.push({ type: 'up',   text: `Forecast shows a <strong>\u20AC${Math.abs(dec.cumulative).toFixed(0)}</strong> deficit by end of ${this.forecastYear}` });
    }
  }

  createCharts(): void { this.createCategoryChart(); this.createTrendChart(); }

  private getTop5WithOther(): { labels: string[]; data: number[]; colors: string[] } {
    if (!this.expensesByCategory.length) return { labels: [], data: [], colors: [] };
    const sorted = [...this.expensesByCategory].sort((a, b) => b.amount - a.amount);
    const top5   = sorted.slice(0, 5);
    const rest   = sorted.slice(5);
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
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 }, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { callbacks: { label: (ctx: any) => { const v = ctx.parsed || 0; const tot = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0); return `${ctx.label}: \u20AC${v.toFixed(2)} (${tot > 0 ? ((v / tot) * 100).toFixed(1) : 0}%)`; } } }
        }
      }
    };
    try { this.categoryChart = new Chart(ctx, config); } catch {}
  }

  private createTrendChart(): void {
    if (!this.monthlyTrend.length) return;
    const canvas = document.getElementById('trendChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.trendChart) this.trendChart.destroy();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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
          tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: \u20AC${ctx.parsed.y.toFixed(2)}` } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v: any) => `\u20AC${v}`, font: { size: 12 } } },
          x: { grid: { display: false }, ticks: { font: { size: 12 } } }
        }
      }
    };
    try { this.trendChart = new Chart(ctx, config); } catch {}
  }

  getBalanceClass(): string { return this.summary.balance >= 0 ? 'positive' : 'negative'; }

  getTopCategories(): CategoryReport[] {
    return [...this.expensesByCategory].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }

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