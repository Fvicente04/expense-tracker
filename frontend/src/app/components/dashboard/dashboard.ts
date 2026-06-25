import { Component, OnInit, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from '../layout/navbar/navbar';
import { TransactionService } from '../../services/transaction';
import { BudgetService } from '../../services/budget';
import { ReportService } from '../../services/report';
import { AuthService } from '../../services/auth';
import { GoalService } from '../../services/goal';
import { CreditCardService } from '../../services/credit-card';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Transaction } from '../../models/transaction';
import { Budget } from '../../models/budget';
import { Goal } from '../../models/goal';
import { CreditCard } from '../../models/credit-card';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { LucideIconComponent, LUCIDE_ICON_NAMES } from '../shared/lucide-icon';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, NavbarComponent, TranslatePipe, LucideIconComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  private subs: Subscription[] = [];

  userName = '';
  currencySymbol = '€';

  totalIncome = 0;
  totalExpense = 0;
  balance = 0;
  transactionCount = 0;
  incomeVsLastMonth = 0;
  expenseVsLastMonth = 0;

  safeToSpend = 0;
  totalBudget = 0;
  daysRemaining = 0;
  totalDaysInMonth = 0;
  spentToday = 0;

  monthlyAvgExpense = 0;
  monthlyAvgIncome = 0;
  avgMonthsLoaded = 0;
  financialStatus: 'good' | 'warning' | 'danger' = 'good';
  statusLabel = 'On track';

  recentTransactions: Transaction[] = [];
  budgetsSortedByRisk: Budget[] = [];
  alertBudget: Budget | null = null;
  weeklySpending: number[] = [0, 0, 0, 0, 0, 0, 0];

  activeGoals: Goal[] = [];
  alertCards: CreditCard[] = [];

  currentMonthLabel = '';
  todayLabel = '';
  dayOfMonth = 0;

  private weekChart: Chart | null = null;

  constructor(
    private router: Router,
    private transactionService: TransactionService,
    private budgetService: BudgetService,
    private reportService: ReportService,
    private authService: AuthService,
    private goalService: GoalService,
    private creditCardService: CreditCardService,
    private cdr: ChangeDetectorRef,
    public lang: LanguageService
  ) { }

  ngOnInit(): void {
    this.initDate();
    this.subs.push(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          this.userName = (user.name || user.email || '').split(' ')[0] || 'there';
          if (user.currency) this.currencySymbol = this.getCurrencySymbol(user.currency);
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.weekChart) this.weekChart.destroy();
  }

  private getCurrencySymbol(code: string): string {
    const map: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' };
    return map[code] ?? code;
  }

  private initDate(): void {
    const today = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    this.currentMonthLabel = `${months[today.getMonth()]} ${today.getFullYear()}`;
    this.todayLabel = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    this.totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    this.dayOfMonth = today.getDate();
    this.daysRemaining = this.totalDaysInMonth - this.dayOfMonth + 1;
  }

  private fmtDate(d: Date): string { return d.toISOString().split('T')[0]; }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  }

  loadData(): void {
    this.isLoading = true;

    const today = new Date();
    const start = this.fmtDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const end = this.fmtDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const todayStr = this.fmtDate(today);
    const prevStart = this.fmtDate(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const prevEnd = this.fmtDate(new Date(today.getFullYear(), today.getMonth(), 0));

    let pending = 7;
    const done = () => {
      if (--pending === 0) {
        this.calcMetrics();
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.buildChart(), 100);
      }
    };

    let avgExpTotal = 0, avgIncTotal = 0, avgCount = 0;
    for (let i = 1; i <= 3; i++) {
      const mStart = this.fmtDate(new Date(today.getFullYear(), today.getMonth() - i, 1));
      const mEnd = this.fmtDate(new Date(today.getFullYear(), today.getMonth() - i + 1, 0));
      this.subs.push(
        this.reportService.getSummary(mStart, mEnd).subscribe({
          next: (d: any) => {
            const inc = Number(d.totalIncome || 0);
            const exp = Number(d.totalExpense || 0);
            if (inc > 0 || exp > 0) {
              avgExpTotal += exp;
              avgIncTotal += inc;
              avgCount++;
            }
            this.monthlyAvgExpense = avgCount > 0 ? avgExpTotal / avgCount : 0;
            this.monthlyAvgIncome = avgCount > 0 ? avgIncTotal / avgCount : 0;
            this.avgMonthsLoaded = avgCount;
            done();
          },
          error: () => done()
        })
      );
    }

    this.subs.push(
      this.transactionService.getAll().subscribe({
        next: (data: any) => {
          const all: Transaction[] = Array.isArray(data) ? data : (data.transactions || data.data || []);

          const currentMonthTxs = all.filter((t: Transaction) => {
            const d = new Date(t.date).toISOString().split('T')[0];
            return d >= start && d <= end;
          });

          this.totalIncome = currentMonthTxs
            .filter((t: Transaction) => t.type === 'income')
            .reduce((s: number, t: Transaction) => s + Number(t.amount || 0), 0);

          this.totalExpense = currentMonthTxs
            .filter((t: Transaction) => t.type === 'expense')
            .reduce((s: number, t: Transaction) => s + Math.abs(Number(t.amount || 0)), 0);

          this.balance = this.totalIncome - this.totalExpense;
          this.transactionCount = currentMonthTxs.length;

          const prevTxs = all.filter((t: Transaction) => {
            const d = new Date(t.date).toISOString().split('T')[0];
            return d >= prevStart && d <= prevEnd;
          });

          const prevIncome = prevTxs
            .filter((t: Transaction) => t.type === 'income')
            .reduce((s: number, t: Transaction) => s + Number(t.amount || 0), 0);

          const prevExpense = prevTxs
            .filter((t: Transaction) => t.type === 'expense')
            .reduce((s: number, t: Transaction) => s + Math.abs(Number(t.amount || 0)), 0);

          this.incomeVsLastMonth = this.totalIncome - prevIncome;
          this.expenseVsLastMonth = this.totalExpense - prevExpense;

          const pastTxs = currentMonthTxs.filter((t: Transaction) => {
            return new Date(t.date).toISOString().split('T')[0] <= todayStr;
          });

          this.recentTransactions = [...pastTxs]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

          this.spentToday = pastTxs
            .filter((t: Transaction) =>
              new Date(t.date).toISOString().split('T')[0] === todayStr && t.type === 'expense'
            )
            .reduce((sum: number, t: Transaction) => sum + Math.abs(Number(t.amount)), 0);

          const weekly = [0, 0, 0, 0, 0, 0, 0];
          const todayIdx = (today.getDay() + 6) % 7;
          pastTxs.forEach((t: Transaction) => {
            if (t.type !== 'expense') return;
            const diff = Math.floor((today.getTime() - new Date(t.date).getTime()) / 86400000);
            if (diff >= 0 && diff < 7) {
              const idx = todayIdx - diff;
              if (idx >= 0) weekly[idx] += Math.abs(Number(t.amount));
            }
          });
          this.weeklySpending = weekly;
          done();
        },
        error: () => done()
      })
    );

    this.subs.push(
      this.budgetService.getAll().subscribe({
        next: (data: any) => {
          const all: Budget[] = Array.isArray(data) ? data : (data.budgets || data.data || []);
          const budgets = all.filter((b: Budget) =>
            Number(b.month) === today.getMonth() + 1 &&
            Number(b.year) === today.getFullYear()
          );
          this.totalBudget = budgets.reduce((s, b) => s + Number(b.amount || 0), 0);
          this.budgetsSortedByRisk = [...budgets].sort((a, b) => this.riskScore(b) - this.riskScore(a));
          this.alertBudget = this.budgetsSortedByRisk.find(b => this.budgetStatus(b) === 'danger') || null;
          done();
        },
        error: () => done()
      })
    );

    this.subs.push(
      this.goalService.getAll().subscribe({
        next: (goals) => {
          this.activeGoals = goals
            .filter(g => g.savedAmount < g.targetAmount)
            .slice(0, 3);
          done();
        },
        error: () => done()
      })
    );

    this.subs.push(
      this.creditCardService.getAll().subscribe({
        next: (cards) => {
          this.alertCards = cards.filter(c => c.isActive && (c.dueAlert || c.utilizationAlert));
          done();
        },
        error: () => done()
      })
    );
  }

  private calcMetrics(): void {
    this.safeToSpend = this.daysRemaining > 0 ? this.balance / this.daysRemaining : 0;
    if (this.balance < 0 || this.safeToSpend < 0) {
      this.financialStatus = 'danger';
      this.statusLabel = 'dashboard.statusOver';
    } else if (this.alertBudget !== null) {
      this.financialStatus = 'warning';
      this.statusLabel = 'dashboard.statusWatch';
    } else {
      this.financialStatus = 'good';
      this.statusLabel = 'dashboard.statusOnTrack';
    }
  }

  budgetPct(budget: Budget): number {
    const amount = Number(budget.amount || 0);
    const spent = Number(budget.spent || 0);
    return amount === 0 ? 0 : Math.min((spent / amount) * 100, 100);
  }

  budgetStatus(budget: Budget): 'good' | 'warning' | 'danger' {
    const pct = this.budgetPct(budget);
    if (pct >= 90) return 'danger';
    if (pct >= 70) return 'warning';
    return 'good';
  }

  budgetRemaining(budget: Budget): number {
    return Math.max(Number(budget.amount || 0) - Number(budget.spent || 0), 0);
  }

  riskScore(b: Budget): number {
    const s = this.budgetStatus(b);
    return s === 'danger' ? 2 : s === 'warning' ? 1 : 0;
  }

  riskGroupChanged(index: number): boolean {
    if (index === 0) return false;
    return this.riskScore(this.budgetsSortedByRisk[index]) !==
      this.riskScore(this.budgetsSortedByRisk[index - 1]);
  }

  private buildChart(): void {
    const canvas = document.getElementById('weekChart') as HTMLCanvasElement;
    if (!canvas) return;
    if (this.weekChart) this.weekChart.destroy();

    const isDark = document.body.classList.contains('dark-mode');
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const labelColor = isDark ? '#7a83a0' : '#8892a4';
    const barActive = isDark ? '#5b8cff' : '#3b82f6';
    const barDefault = isDark ? 'rgba(91,140,255,0.2)' : '#dbeafe';

    this.weekChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
        datasets: [{
          data: this.weeklySpending,
          backgroundColor: this.weeklySpending.map((_, i) => i === 6 ? barActive : barDefault),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => `${this.currencySymbol}${Number(ctx.raw).toFixed(2)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: labelColor, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 11 }, callback: (v: any) => `${this.currencySymbol}${v}` }, beginAtZero: true }
        }
      }
    });
  }

  goalPct(goal: Goal): number {
    if (!goal.targetAmount) return 0;
    return Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  }

  goalDaysLeft(goal: Goal): number | null {
    if (!goal.deadline) return null;
    return Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000);
  }

  fmt(value: any): string { return Number(value || 0).toFixed(2); }
  isLucideIcon(icon: string): boolean { return LUCIDE_ICON_NAMES.has(icon); }

  fmtTxDate(date: string): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return this.lang.t('common.today');
    if (d.toDateString() === yesterday.toDateString()) return this.lang.t('common.yesterday');
    const locale = this.lang.currentLang === 'pt-BR' ? 'pt-BR' : 'en-GB';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }

  fmtDelta(value: number): string {
    return `${value >= 0 ? '+' : '–'}${this.currencySymbol}${Math.abs(value).toFixed(0)}`;
  }

  goTo(path: string, queryParams?: Record<string, any>): void {
    this.router.navigate([`/${path}`], queryParams ? { queryParams } : {});
  }
}