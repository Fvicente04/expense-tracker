export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  notes?: string;
  category?: {
    name: string;
    icon: string;
    color: string;
  };
  creditCardId?: string | null;
  source?: 'manual' | 'bank_sync';
  bankConnectionId?: string | null;
  // Recurring fields
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
  recurringEndDate?: string | null;
  recurringGroupId?: string | null;
}

export interface CreateTransactionRequest {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
  recurringEndDate?: string | null;
}

export interface UpdateTransactionRequest {
  type?: 'income' | 'expense';
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
  notes?: string;
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | null;
  recurringEndDate?: string | null;
}