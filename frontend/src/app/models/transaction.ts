import { Category } from './category';

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  notes?: string;
  category?: Category;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTransactionRequest {
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  category_id?: string;
  amount?: number;
  description?: string;
  date?: string;
  notes?: string;
}