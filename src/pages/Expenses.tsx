import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { expenseService, type Expense, type CreateExpenseInput } from '../services/api';
import Modal from '../components/Modal';

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Vestuário', 'Tecnologia', 'Outros',
];

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  category: z.string().min(1, 'Categoria obrigatória'),
});

type FormData = z.infer<typeof schema>;

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Expenses() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: expenseService.list,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseInput) => expenseService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateExpenseInput }) =>
      expenseService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  function openCreate() {
    reset({ title: '', amount: 0, category: '' });
    setEditing(null);
    setModal('create');
  }

  function openEdit(expense: Expense) {
    reset({ title: expense.title, amount: expense.amount, category: expense.category });
    setEditing(expense);
    setModal('edit');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    reset();
  }

  function onSubmit(data: FormData) {
    if (modal === 'edit' && editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Despesas</h1>
          <p className="text-sm text-slate-500 mt-1">Total: <span className="font-semibold text-red-600">{fmt(totalExpenses)}</span></p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Nova Despesa
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="text-center text-slate-400 py-12">Carregando...</p>
        ) : expenses.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nenhuma despesa cadastrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Título</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Data</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{e.title}</td>
                  <td className="px-4 py-3">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(e.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(e.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Editar Despesa' : 'Nova Despesa'} onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
              <input
                {...register('title')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Ex: Supermercado"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="0,00"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select
                {...register('category')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
