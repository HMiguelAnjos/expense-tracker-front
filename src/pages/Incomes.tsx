import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { incomeService, type Income, type CreateIncomeInput } from '../services/api';
import Modal from '../components/Modal';

const SOURCES = [
  'Salário', 'Freelance', 'Investimentos', 'Aluguel', 'Vendas', 'Bônus', 'Outros',
];

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  source: z.string().min(1, 'Fonte obrigatória'),
});

type FormData = z.infer<typeof schema>;

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Incomes() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Income | null>(null);

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['incomes'],
    queryFn: incomeService.list,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateIncomeInput) => incomeService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateIncomeInput }) =>
      incomeService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }),
  });

  function openCreate() {
    reset({ description: '', amount: 0, source: '' });
    setEditing(null);
    setModal('create');
  }

  function openEdit(income: Income) {
    reset({ description: income.description, amount: income.amount, source: income.source });
    setEditing(income);
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

  const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Receitas</h1>
          <p className="text-sm text-slate-500 mt-1">Total: <span className="font-semibold text-green-600">{fmt(totalIncomes)}</span></p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus size={16} />
          Nova Receita
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <p className="text-center text-slate-400 py-12">Carregando...</p>
        ) : incomes.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nenhuma receita cadastrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Fonte</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Data</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incomes.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{i.description}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                      {i.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(i.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{fmt(i.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(i)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(i.id)}
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
        <Modal title={modal === 'edit' ? 'Editar Receita' : 'Nova Receita'} onClose={closeModal}>
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input
                {...register('description')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Ex: Salário de abril"
              />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input
                {...register('amount')}
                type="number"
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="0,00"
              />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fonte</label>
              <select
                {...register('source')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="">Selecione...</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.source && <p className="text-xs text-red-500 mt-1">{errors.source.message}</p>}
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
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
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
