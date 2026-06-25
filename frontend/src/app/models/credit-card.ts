export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  lastFourDigits?: string | null;
  creditLimit?: number | null;
  color: string;
  icon: string;
  isActive: boolean;
  statementDay?: number | null;
  dueDay?: number | null;
  utilizationAlertPct?: number;
  // computed by backend
  currentSpend?: number;
  availableCredit?: number | null;
  utilizationPct?: number | null;
  utilizationAlert?: boolean;
  dueAlert?: boolean;
  daysUntilDue?: number | null;
  billingPeriod?: { start: string; end: string };
  lastPayment?: { amount: number; date: string; type: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCreditCardRequest {
  name: string;
  lastFourDigits?: string | null;
  creditLimit?: number | null;
  color?: string;
  icon?: string;
  statementDay?: number | null;
  dueDay?: number | null;
  utilizationAlertPct?: number;
}

export interface UpdateCreditCardRequest extends Partial<CreateCreditCardRequest> {
  isActive?: boolean;
}

export interface CardPayment {
  id: string;
  creditCardId: string;
  amount: number;
  paymentDate: string;
  billingMonth: number;
  billingYear: number;
  paymentType: 'minimum' | 'full' | 'partial';
  notes?: string | null;
  createdAt: string;
}

export interface MonthlyHistory {
  yearMonth: string;
  expenses: number;
  income: number;
  count: number;
  paid: number;
}

export interface Subscription {
  description: string;
  avgAmount: number;
  occurrences: number;
  monthsActive: number;
  lastDate: string;
}
