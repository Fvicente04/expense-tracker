export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  user_id?: string;
  category_id?: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBudgetRequest {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}