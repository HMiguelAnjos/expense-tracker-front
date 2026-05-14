import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
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
  paymentMethod: string;
  installments: number;
  installmentNumber: number;
  cardId: string | null;
  createdAt: string;
};

export type Income = {
  id: string;
  description: string;
  amount: number;
  source: string;
  createdAt: string;
};

export type Card = {
  id: string;
  name: string;
  lastDigits: string | null;
  color: string;
  createdAt: string;
};

export type CreateExpenseInput = {
  title: string;
  amount: number;
  category: string;
  paymentMethod: string;
  installments?: number;
  cardId?: string | null;
  createdAt?: string;
};
export type UpdateExpenseInput = Omit<Expense, 'createdAt' | 'installmentNumber' | 'installments'>;
export type CreateIncomeInput = Omit<Income, 'id' | 'createdAt'>;
export type UpdateIncomeInput = Omit<Income, 'createdAt'>;
export type CreateCardInput = { name: string; lastDigits?: string; color?: string };

export const expenseService = {
  list: () => api.get<Expense[]>('/expenses').then((r) => r.data),
  create: (data: CreateExpenseInput) => api.post('/expenses', data),
  update: (id: string, data: UpdateExpenseInput) => api.put(`/expenses/${id}`, data),
  remove: (id: string) => api.delete(`/expenses/${id}`),
};

export const cardService = {
  list: () => api.get<Card[]>('/cards').then((r) => r.data),
  create: (data: CreateCardInput) => api.post('/cards', data),
  remove: (id: string) => api.delete(`/cards/${id}`),
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

export type Saving = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number | null;
  color: string;
  balance: number;
  createdAt: string;
};

export type SavingTransaction = {
  id: string;
  savingId: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  description: string | null;
  createdAt: string;
};

export type CreateSavingInput = { name: string; description?: string; targetAmount?: number; color?: string };
export type AddTransactionInput = { amount: number; type: 'deposit' | 'withdrawal'; description?: string; createdAt?: string };

export const savingService = {
  list: () => api.get<Saving[]>('/savings').then((r) => r.data),
  create: (data: CreateSavingInput) => api.post('/savings', data),
  remove: (id: string) => api.delete(`/savings/${id}`),
  addTransaction: (id: string, data: AddTransactionInput) => api.post(`/savings/${id}/transactions`, data),
  listTransactions: (id: string) => api.get<SavingTransaction[]>(`/savings/${id}/transactions`).then((r) => r.data),
};

export type CardBill = {
  id: string;
  cardId: string;
  cardName: string;
  cardColor: string;
  amount: number;
  month: number;
  year: number;
  dueDate: string | null;
  expenseId: string | null;
  createdAt: string;
  itemsCount: number;
  itemsTotal: number;
};

export type CardBillItem = {
  id: string;
  cardBillId: string;
  description: string;
  amount: number;
  category: string;
  installments: number;
  installmentNumber: number;
  createdAt: string;
};

export type CreateCardBillInput = {
  cardId: string;
  cardName: string;
  amount: number;
  month: number;
  year: number;
  dueDate?: string;
};

export type AddBillItemInput = {
  description: string;
  totalAmount: number;
  category: string;
  installments?: number;
};

export type UpdateBillItemInput = { description: string; amount: number; category: string };

export const cardBillService = {
  list: () => api.get<CardBill[]>('/card-bills').then((r) => r.data),
  create: (data: CreateCardBillInput) => api.post<{ id: string }>('/card-bills', data).then((r) => r.data),
  updateAmount: (id: string, amount: number, cardName: string) =>
    api.patch(`/card-bills/${id}/amount`, { amount, cardName }),
  remove: (id: string) => api.delete(`/card-bills/${id}`),
  listItems: (id: string) => api.get<CardBillItem[]>(`/card-bills/${id}/items`).then((r) => r.data),
  addItem: (id: string, data: AddBillItemInput) => api.post(`/card-bills/${id}/items`, data),
  removeItem: (billId: string, itemId: string) => api.delete(`/card-bills/${billId}/items/${itemId}`),
  updateItem: (billId: string, itemId: string, data: UpdateBillItemInput) =>
    api.patch(`/card-bills/${billId}/items/${itemId}`, data),
};

export type Category = {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
};

export type CreateCategoryInput = { name: string; color?: string };

export const categoryService = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (data: CreateCategoryInput) => api.post('/categories', data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export const authService = {
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  register: (data: RegisterInput) => api.post('/auth/register', data),
};
