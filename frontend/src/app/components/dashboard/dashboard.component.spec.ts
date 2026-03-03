import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { DashboardComponent } from './dashboard';
import { TransactionService } from '../../services/transaction';
import { BudgetService } from '../../services/budget';
import { ReportService } from '../../services/report';
import { AuthService } from '../../services/auth.service';

const mockRouter             = { navigate: jasmine.createSpy('navigate') };
const mockAuthService        = { currentUser$: of({ name: 'Felipe', email: 'felipe@test.com' }) };
const mockReportService      = { getSummary: jasmine.createSpy('getSummary').and.returnValue(of({ totalIncome: 5000, totalExpense: 2000, transactionCount: 10 })) };
const mockTransactionService = { getAll: jasmine.createSpy('getAll').and.returnValue(of([])) };
const mockBudgetService      = { getAll: jasmine.createSpy('getAll').and.returnValue(of([])) };

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture:   ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService,          useValue: mockAuthService },
        { provide: TransactionService,   useValue: mockTransactionService },
        { provide: BudgetService,        useValue: mockBudgetService },
        { provide: ReportService,        useValue: mockReportService },
        ChangeDetectorRef
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('greeting()', () => {
    it('should return "morning" before 12:00', () => {
      spyOn(Date.prototype, 'getHours').and.returnValue(9);
      expect(component.greeting()).toBe('morning');
    });

    it('should return "afternoon" between 12:00 and 17:59', () => {
      spyOn(Date.prototype, 'getHours').and.returnValue(15);
      expect(component.greeting()).toBe('afternoon');
    });

    it('should return "evening" at 18:00 or later', () => {
      spyOn(Date.prototype, 'getHours').and.returnValue(20);
      expect(component.greeting()).toBe('evening');
    });
  });

  describe('fmt()', () => {
    it('should format a number to 2 decimal places', () => {
      expect(component.fmt(100)).toBe('100.00');
    });

    it('should handle zero', () => {
      expect(component.fmt(0)).toBe('0.00');
    });

    it('should handle null gracefully', () => {
      expect(component.fmt(null)).toBe('0.00');
    });

    it('should handle undefined gracefully', () => {
      expect(component.fmt(undefined)).toBe('0.00');
    });
  });

  describe('fmtDelta()', () => {
    it('should prefix positive values with +', () => {
      expect(component.fmtDelta(200)).toContain('+');
    });

    it('should prefix negative values with \u2013', () => {
      expect(component.fmtDelta(-150)).toContain('\u2013');
    });

    it('should handle zero as positive', () => {
      expect(component.fmtDelta(0)).toContain('+');
    });
  });

  describe('budgetPct()', () => {
    it('should return correct percentage', () => {
      expect(component.budgetPct({ amount: 200, spent: 100 } as any)).toBe(50);
    });

    it('should cap at 100% when overspent', () => {
      expect(component.budgetPct({ amount: 100, spent: 150 } as any)).toBe(100);
    });

    it('should return 0 when amount is 0', () => {
      expect(component.budgetPct({ amount: 0, spent: 50 } as any)).toBe(0);
    });
  });

  describe('budgetStatus()', () => {
    it('should return "good" below 70%', () => {
      expect(component.budgetStatus({ amount: 100, spent: 60 } as any)).toBe('good');
    });

    it('should return "warning" between 70% and 89%', () => {
      expect(component.budgetStatus({ amount: 100, spent: 80 } as any)).toBe('warning');
    });

    it('should return "danger" at 90% or above', () => {
      expect(component.budgetStatus({ amount: 100, spent: 95 } as any)).toBe('danger');
    });
  });

  describe('budgetRemaining()', () => {
    it('should return remaining amount', () => {
      expect(component.budgetRemaining({ amount: 200, spent: 80 } as any)).toBe(120);
    });

    it('should return 0 when overspent', () => {
      expect(component.budgetRemaining({ amount: 100, spent: 150 } as any)).toBe(0);
    });
  });

  describe('riskScore()', () => {
    it('should return 2 for danger budgets', () => {
      expect(component.riskScore({ amount: 100, spent: 95 } as any)).toBe(2);
    });

    it('should return 1 for warning budgets', () => {
      expect(component.riskScore({ amount: 100, spent: 75 } as any)).toBe(1);
    });

    it('should return 0 for good budgets', () => {
      expect(component.riskScore({ amount: 100, spent: 30 } as any)).toBe(0);
    });
  });

  describe('goTo()', () => {
    it('should navigate to a path', () => {
      component.goTo('transactions');
      expect(mockRouter.navigate).not.toBeUndefined();
    });

    it('should navigate with queryParams when provided', () => {
      component.goTo('transactions', { type: 'expense' });
      expect(mockRouter.navigate).not.toBeUndefined();
    });
  });

  describe('fmtTxDate()', () => {
    it('should return "Today" for today\'s date', () => {
      expect(component.fmtTxDate(new Date().toISOString())).toBe('Today');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(component.fmtTxDate(yesterday.toISOString())).toBe('Yesterday');
    });

    it('should return formatted date for older dates', () => {
      const result = component.fmtTxDate(new Date('2025-01-15').toISOString());
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Yesterday');
    });
  });
});