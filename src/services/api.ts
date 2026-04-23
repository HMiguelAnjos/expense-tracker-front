import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
});

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
