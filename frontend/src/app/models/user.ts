export interface User {
  id: string;
  name: string;
  email: string;
  currency: 'EUR' | 'USD' | 'GBP' | 'BRL';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  currency: 'EUR' | 'USD' | 'GBP' | 'BRL';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}