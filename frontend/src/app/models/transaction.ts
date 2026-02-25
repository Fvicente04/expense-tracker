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
  // Recurring fields
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly' | null;
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
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly' | null;
  recurringEndDate?: string | null;
}

export interface UpdateTransactionRequest {
  type?: 'income' | 'expense';
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
  notes?: string;
}