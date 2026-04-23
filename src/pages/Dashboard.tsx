import { useQuery } from '@tanstack/react-query';
import { expenseService, incomeService } from '../services/api';
import StatCard from '../components/StatCard';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Dashboard() {
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: expenseService.list });
  const { data: incomes = [] } = useQuery({ queryKey: ['incomes'], queryFn: incomeService.list });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
  const balance = totalIncomes - totalExpenses;

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const top5Expenses = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((e) => ({ name: e.title, value: e.amount }));

  const recentTransactions = [
    ...expenses.map((e) => ({ ...e, type: 'expense' as const, label: e.title })),
    ...incomes.map((i) => ({ ...i, type: 'income' as const, label: i.description })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Receitas" value={fmt(totalIncomes)} color="green" icon="📈" />
        <StatCard title="Total de Despesas" value={fmt(totalExpenses)} color="red" icon="📉" />
        <StatCard
          title="Saldo"
          value={fmt(balance)}
          color={balance >= 0 ? 'indigo' : 'red'}
          icon={balance >= 0 ? '✅' : '⚠️'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Gastos por Categoria</h2>
          {categoryData.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhuma despesa cadastrada</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">Top 5 Maiores Despesas</h2>
          {top5Expenses.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Nenhuma despesa cadastrada</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={top5Expenses} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Transações Recentes</h2>
        {recentTransactions.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">Nenhuma transação ainda</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentTransactions.map((t) => (
              <li key={`${t.type}-${t.id}`} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{t.type === 'expense' ? '📉' : '📈'}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{t.label}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                      {t.type === 'expense' && ' · ' + (t as any).category}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === 'expense' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {t.type === 'expense' ? '-' : '+'}{fmt(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
