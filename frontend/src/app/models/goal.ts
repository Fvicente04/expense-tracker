export interface Goal {
  id: string;
  userId: string;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGoalRequest {
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount?: number;
  deadline?: string | null;
}
