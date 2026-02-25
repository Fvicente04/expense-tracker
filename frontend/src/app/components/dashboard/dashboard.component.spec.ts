import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { TransactionService } from '../../services/transaction';
import { BudgetService } from '../../services/budget';
import { ReportService } from '../../services/report';

const mockRouter = { navigate: jasmine.createSpy('navigate') };
const mockReportService = { getSummary: jasmine.createSpy('getSummary').and.returnValue(of({ totalIncome: 5000, totalExpense: 2000, transactionCount: 10 })) };
const mockTransactionService = { getAll: jasmine.createSpy('getAll').and.returnValue(of([])) };
const mockBudgetService = { getAll: jasmine.createSpy('getAll').and.returnValue(of([])) };

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: ReportService, useValue: mockReportService },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => { expect(component).toBeTruthy(); });

  describe('getGreeting()', () => {
    it('should return morning before 12', () => { spyOn(Date.prototype, 'getHours').and.returnValue(9); expect(component.getGreeting()).toBe('morning'); });
    it('should return afternoon between 12 and 17', () => { spyOn(Date.prototype, 'getHours').and.returnValue(14); expect(component.getGreeting()).toBe('afternoon'); });
    it('should return evening at 18 or later', () => { spyOn(Date.prototype, 'getHours').and.returnValue(20); expect(component.getGreeting()).toBe('evening'); });
  });

  describe('formatCurrency()', () => {
    it('should format number to 2 decimal places', () => { expect(component.formatCurrency(100)).toBe('100.00'); });
    it('should handle zero', () => { expect(component.formatCurrency(0)).toBe('0.00'); });
    it('should handle null', () => { expect(component.formatCurrency(null)).toBe('0.00'); });
    it('should handle string numbers', () => { expect(component.formatCurrency('50.5')).toBe('50.50'); });
  });

  describe('formatDelta()', () => {
    it('should prefix positive with +euro', () => { expect(component.formatDelta(200)).toBe('+€200'); });
    it('should prefix negative with minus euro', () => { expect(component.formatDelta(-150)).toBe('–€150'); });
    it('should treat zero as positive', () => { expect(component.formatDelta(0)).toBe('+€0'); });
  });

  describe('getBudgetPercentage()', () => {
    it('should calculate correct percentage', () => { expect(component.getBudgetPercentage({ amount: 200, spent: 100 } as any)).toBe(50); });
    it('should cap at 100 when overspent', () => { expect(component.getBudgetPercentage({ amount: 100, spent: 200 } as any)).toBe(100); });
    it('should return 0 when amount is 0', () => { expect(component.getBudgetPercentage({ amount: 0, spent: 50 } as any)).toBe(0); });
  });

  describe('getBudgetStatus()', () => {
    it('should return good under 70%', () => { expect(component.getBudgetStatus({ amount: 100, spent: 60 } as any)).toBe('good'); });
    it('should return warning between 70 and 89%', () => { expect(component.getBudgetStatus({ amount: 100, spent: 80 } as any)).toBe('warning'); });
    it('should return danger at 90% or above', () => { expect(component.getBudgetStatus({ amount: 100, spent: 95 } as any)).toBe('danger'); });
  });

  describe('getBudgetRemaining()', () => {
    it('should calculate remaining', () => { expect(component.getBudgetRemaining({ amount: 200, spent: 120 } as any)).toBe(80); });
    it('should return 0 when overspent', () => { expect(component.getBudgetRemaining({ amount: 100, spent: 150 } as any)).toBe(0); });
  });

  describe('riskScore()', () => {
    it('should return 2 for danger', () => { expect(component.riskScore({ amount: 100, spent: 95 } as any)).toBe(2); });
    it('should return 1 for warning', () => { expect(component.riskScore({ amount: 100, spent: 75 } as any)).toBe(1); });
    it('should return 0 for good', () => { expect(component.riskScore({ amount: 100, spent: 30 } as any)).toBe(0); });
  });
});
