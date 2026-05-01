import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, TrendingUp } from 'lucide-react';
import { incomeService, type Income, type CreateIncomeInput } from '../services/api';
import Modal from '../components/Modal';

const SOURCES = ['Salário','Freelance','Investimentos','Aluguel','Vendas','Bônus','Outros'];
const SRC_COLOR: Record<string, string> = {
  Salário:'#10b981', Freelance:'#6366f1', Investimentos:'#f59e0b',
  Aluguel:'#3b82f6', Vendas:'#ec4899', Bônus:'#8b5cf6', Outros:'#64748b',
};

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  source: z.string().min(1, 'Fonte obrigatória'),
});
type Form = z.infer<typeof schema>;

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</label>
    {children}
    {error && <div style={{ fontSize: 11, color: '#f43f5e', marginTop: 6 }}>{error}</div>}
  </div>
);

const inputSt: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 13,
  color: '#e2e8f0', background: '#07080f', border: '1px solid rgba(255,255,255,0.08)',
  outline: 'none', transition: 'border-color 0.15s',
};

export default function Incomes() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Income | null>(null);
  const [search, setSearch] = useState('');

  const { data: incomes = [], isLoading } = useQuery({ queryKey: ['incomes'], queryFn: incomeService.list });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form, unknown, Form>({ resolver: zodResolver(schema) as any });

  const create = useMutation({ mutationFn: (d: CreateIncomeInput) => incomeService.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); close_(); } });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: CreateIncomeInput }) => incomeService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); close_(); } });
  const remove = useMutation({ mutationFn: (id: string) => incomeService.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['incomes'] }) });

  function open(i?: Income) {
    if (i) { reset({ description: i.description, amount: i.amount, source: i.source }); setEditing(i); setModal('edit'); }
    else { reset({ description: '', amount: 0, source: '' }); setEditing(null); setModal('create'); }
  }
  function close_() { setModal(null); setEditing(null); reset(); }
  function onSubmit(d: Form) {
    if (modal === 'edit' && editing) update.mutate({ id: editing.id, data: d });
    else create.mutate(d);
  }

  const filtered = incomes.filter((i) =>
    i.description.toLowerCase().includes(search.toLowerCase()) ||
    i.source.toLowerCase().includes(search.toLowerCase())
  );
  const total = incomes.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Receitas</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {incomes.length} lançamentos &nbsp;·&nbsp; Total: <span style={{ color: '#10b981', fontWeight: 600 }}>{fmt(total)}</span>
          </p>
        </div>
        <button onClick={() => open()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'white',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
          transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(16,185,129,0.4)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(16,185,129,0.3)'; }}
        >
          <Plus size={15} /> Nova Receita
        </button>
      </div>

      {/* Table card */}
      <div className="fade-up fade-up-2" style={{ borderRadius: 20, background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#374151' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar receitas..." style={{ ...inputSt, paddingLeft: 38, background: '#07080f' }} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#374151', fontSize: 13 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="#059669" />
            </div>
            <div style={{ fontSize: 13, color: '#374151' }}>{search ? 'Nenhum resultado' : 'Nenhuma receita cadastrada'}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Descrição','Fonte','Data','Valor',''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 20px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const color = SRC_COLOR[i.source] || '#64748b';
                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.12s' }}
                    onMouseEnter={(r) => { (r.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(r) => { (r.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TrendingUp size={13} color={color} />
                        </div>
                        <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{i.description}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: `${color}1a`, color }}>
                        {i.source}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#475569', fontSize: 12 }}>
                      {new Date(i.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      {fmt(i.amount)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        {([
                          { icon: <Pencil size={12} />, action: () => open(i), hover: '#6366f1' },
                          { icon: <Trash2 size={12} />, action: () => remove.mutate(i.id), hover: '#f43f5e' },
                        ] as const).map((btn, idx) => (
                          <button key={idx} onClick={btn.action} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#374151', transition: 'all 0.15s' }}
                            onMouseEnter={(b) => { (b.currentTarget as HTMLButtonElement).style.background = `${btn.hover}18`; (b.currentTarget as HTMLButtonElement).style.color = btn.hover; }}
                            onMouseLeave={(b) => { (b.currentTarget as HTMLButtonElement).style.background = 'transparent'; (b.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
                          >{btn.icon}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'edit' ? 'Editar Receita' : 'Nova Receita'} subtitle="Preencha as informações abaixo" onClose={close_}>
          <form onSubmit={handleSubmit(onSubmit as any)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Descrição" error={errors.description?.message}>
              <input {...register('description')} style={inputSt} placeholder="Ex: Salário de abril" />
            </Field>
            <Field label="Valor (R$)" error={errors.amount?.message}>
              <input {...register('amount')} type="number" step="0.01" style={inputSt} placeholder="0,00" />
            </Field>
            <Field label="Fonte" error={errors.source?.message}>
              <select {...register('source')} style={inputSt}>
                <option value="">Selecione...</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={close_} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(b) => { (b.currentTarget as HTMLButtonElement).style.color = '#e2e8f0'; }}
                onMouseLeave={(b) => { (b.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
              >Cancelar</button>
              <button type="submit" disabled={create.isPending || update.isPending} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (create.isPending || update.isPending) ? 0.5 : 1 }}>
                {create.isPending || update.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
