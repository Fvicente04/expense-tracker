export interface BankConnection {
  id: string;
  userId: string;
  displayName: string;
  institutionId: string;
  requisitionId: string;
  accountId: string | null;
  status: 'pending' | 'active' | 'expired';
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface Institution {
  id: string;
  name: string;
  logo: string;
}
