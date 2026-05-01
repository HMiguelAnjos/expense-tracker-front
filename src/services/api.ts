import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finance_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('finance_token');
      localStorage.removeItem('finance_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
};

export type Income = {
  id: string;
  description: string;
  amount: number;
  source: string;
  createdAt: string;
};

export type CreateExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
export type UpdateExpenseInput = Omit<Expense, 'createdAt'>;
export type CreateIncomeInput = Omit<Income, 'id' | 'createdAt'>;
export type UpdateIncomeInput = Omit<Income, 'createdAt'>;

export const expenseService = {
  list: () => api.get<Expense[]>('/expenses').then((r) => r.data),
  create: (data: CreateExpenseInput) => api.post('/expenses', data),
  update: (id: string, data: CreateExpenseInput) => api.put(`/expenses/${id}`, data),
  remove: (id: string) => api.delete(`/expenses/${id}`),
};

export const incomeService = {
  list: () => api.get<Income[]>('/incomes').then((r) => r.data),
  create: (data: CreateIncomeInput) => api.post('/incomes', data),
  update: (id: string, data: CreateIncomeInput) => api.put(`/incomes/${id}`, data),
  remove: (id: string) => api.delete(`/incomes/${id}`),
};

export type AuthUser = { id: string; name: string; email: string };
export type LoginInput = { email: string; password: string };
export type RegisterInput = { name: string; email: string; password: string };
export type AuthResponse = { token: string; user: AuthUser };

export const authService = {
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  register: (data: RegisterInput) => api.post('/auth/register', data),
};
