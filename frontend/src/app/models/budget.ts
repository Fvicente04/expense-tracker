export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  spent: number;
  month: number;
  year: number;
  Category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetRequest {
  category_id: string;
  amount: number;
  month: number;
  year: number;
}