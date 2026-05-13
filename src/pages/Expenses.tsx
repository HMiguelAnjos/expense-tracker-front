import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, TrendingDown, CreditCard, Banknote, Smartphone, ArrowLeftRight } from 'lucide-react';
import { expenseService, cardService, type Expense, type CreateExpenseInput } from '../services/api';
import Modal from '../components/Modal';
import { CATEGORIES, CAT_COLOR } from '../constants/categories';

const PAYMENT_METHODS = [
  { value: 'pix',         label: 'PIX',                  icon: Smartphone },
  { value: 'credit_card', label: 'Cartão de Crédito',    icon: CreditCard },
  { value: 'debit_card',  label: 'Cartão de Débito',     icon: CreditCard },
  { value: 'cash',        label: 'Dinheiro',             icon: Banknote },
  { value: 'transfer',    label: 'Transferência',        icon: ArrowLeftRight },
];
const PM_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p.label]));

const schema = z.object({
  title:         z.string().min(1, 'Título obrigatório'),
  amount:        z.coerce.number().positive('Valor deve ser positivo'),
  category:      z.string().min(1, 'Categoria obrigatória'),
  paymentMethod: z.string().min(1, 'Forma de pagamento obrigatória'),
  installments:  z.coerce.number().int().min(1).max(48).default(1),
  cardId:        z.string().nullable().optional(),
  createdAt:     z.string().optional(),
});
type Form = z.infer<typeof schema>;

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const todayISO = () => new Date().toISOString().slice(0, 10);

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
  outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
};

export default function Expenses() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState('');

  const { data: expenses = [], isLoading } = useQuery({ queryKey: ['expenses'], queryFn: expenseService.list });
  const { data: cards = [] } = useQuery({ queryKey: ['cards'], queryFn: cardService.list });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema) as any,
    defaultValues: { paymentMethod: 'pix', installments: 1, createdAt: todayISO() },
  });

  const paymentMethod = useWatch({ control, name: 'paymentMethod' });
  const watchedInstallments = useWatch({ control, name: 'installments' });
  const isCard = paymentMethod === 'credit_card' || paymentMethod === 'debit_card';
  const isCreditCard = paymentMethod === 'credit_card';
  const willCreateInstallments = isCreditCard && Number(watchedInstallments) > 1;

  const create = useMutation({
    mutationFn: (d: CreateExpenseInput) => expenseService.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); close_(); },
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => expenseService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); close_(); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  function open(e?: Expense) {
    if (e) {
      reset({
        title: e.title, amount: e.amount, category: e.category,
        paymentMethod: e.paymentMethod ?? 'pix',
        installments: 1, cardId: e.cardId ?? null,
        createdAt: new Date(e.createdAt).toISOString().slice(0, 10),
      });
      setEditing(e); setModal('edit');
    } else {
      reset({ title: '', amount: '' as any, category: '', paymentMethod: 'pix', installments: 1, cardId: null, createdAt: todayISO() });
      setEditing(null); setModal('create');
    }
  }
  function close_() { setModal(null); setEditing(null); reset(); }

  function onSubmit(d: Form) {
    const payload: CreateExpenseInput = {
      title: d.title, amount: d.amount, category: d.category,
      paymentMethod: d.paymentMethod,
      installments: isCreditCard ? d.installments : 1,
      cardId: isCard ? (d.cardId || null) : null,
      createdAt: d.createdAt,
    };
    if (modal === 'edit' && editing) update.mutate({ id: editing.id, data: payload });
    else create.mutate(payload);
  }

  const filtered = expenses.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  function installmentLabel(e: Expense) {
    if (e.installments > 1) return `${e.installmentNumber}/${e.installments}`;
    return null;
  }

  function paymentBadge(e: Expense) {
    const card = e.cardId ? cards.find((c) => c.id === e.cardId) : null;
    const label = card ? card.name : PM_LABEL[e.paymentMethod] ?? e.paymentMethod;
    const color = card ? card.color : '#475569';
    const parcela = installmentLabel(e);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: `${color}22`, color, border: `1px solid ${color}44` }}>
          {label}
        </span>
        {parcela && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
            {parcela}x
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Despesas</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {expenses.length} lançamentos &nbsp;·&nbsp; Total: <span style={{ color: '#f43f5e', fontWeight: 600 }}>{fmt(total)}</span>
          </p>
        </div>
        <button onClick={() => open()} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'white',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 14px rgba(99,102,241,0.35)', transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
        >
          <Plus size={15} /> Nova Despesa
        </button>
      </div>

      {/* Table card */}
      <div className="fade-up fade-up-2" style={{ borderRadius: 20, background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#374151' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar despesas..." style={{ ...inputSt, paddingLeft: 38, background: '#07080f' }} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#374151', fontSize: 13 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={24} color="#4f46e5" />
            </div>
            <div style={{ fontSize: 13, color: '#374151' }}>{search ? 'Nenhum resultado' : 'Nenhuma despesa cadastrada'}</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Título', 'Categoria', 'Pagamento', 'Data', 'Valor', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 20px', textAlign: i >= 4 ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const color = CAT_COLOR[e.category] || '#64748b';
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.12s' }}
                    onMouseEnter={(r) => { (r.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(r) => { (r.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TrendingDown size={13} color={color} />
                        </div>
                        <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{e.title}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: `${color}1a`, color }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>{paymentBadge(e)}</td>
                    <td style={{ padding: '14px 20px', color: '#475569', fontSize: 12 }}>
                      {new Date(e.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#f43f5e' }}>
                      {fmt(e.amount)}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        {([
                          { icon: <Pencil size={12} />, action: () => open(e), hover: '#6366f1' },
                          { icon: <Trash2 size={12} />, action: () => remove.mutate(e.id), hover: '#f43f5e' },
                        ] as const).map((btn, i) => (
                          <button key={i} onClick={btn.action} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#374151', transition: 'all 0.15s' }}
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

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'edit' ? 'Editar Despesa' : 'Nova Despesa'} subtitle="Preencha as informações abaixo" onClose={close_}>
          <form onSubmit={handleSubmit(onSubmit as any)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Título" error={errors.title?.message}>
              <input {...register('title')} style={inputSt} placeholder="Ex: Supermercado" />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Valor (R$)" error={errors.amount?.message}>
                <input {...register('amount')} type="number" step="0.01" style={inputSt} placeholder="0,00" onFocus={(e) => e.target.select()} />
              </Field>
              <Field label="Data" error={errors.createdAt?.message}>
                <input {...register('createdAt')} type="date" style={inputSt} />
              </Field>
            </div>

            <Field label="Categoria" error={errors.category?.message}>
              <select {...register('category')} style={inputSt}>
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Forma de pagamento" error={errors.paymentMethod?.message}>
              <select {...register('paymentMethod')} style={inputSt}>
                {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>

            {isCard && (
              <Field label="Cartão" error={undefined}>
                <select {...register('cardId')} style={inputSt}>
                  <option value="">Sem cartão específico</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.lastDigits ? ` •••• ${c.lastDigits}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {isCreditCard && (
              <Field label="Parcelas" error={errors.installments?.message}>
                <select {...register('installments')} style={inputSt}>
                  {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map((n) => (
                    <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>
                  ))}
                </select>
              </Field>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={close_} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending || update.isPending} style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (create.isPending || update.isPending) ? 0.5 : 1 }}>
                {create.isPending || update.isPending ? 'Salvando...' : willCreateInstallments && modal === 'create' ? `Criar ${watchedInstallments}x parcelas` : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
