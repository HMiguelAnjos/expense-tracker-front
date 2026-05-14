import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Receipt, Plus, Trash2, ChevronDown, ChevronUp, X,
  CreditCard, AlertCircle, Pencil, Check,
} from 'lucide-react';
import { cardService, cardBillService } from '../services/api';
import type { CardBill, CardBillItem } from '../services/api';
import { CATEGORIES, CAT_COLOR } from '../constants/categories';

/* ── helpers ── */
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const SHORT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];


const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#94a3b8', marginBottom: 5, display: 'block' };
const errStyle: React.CSSProperties   = { fontSize: 11, color: '#f43f5e', marginTop: 4 };

/* ── schemas ── */
const billSchema = z.object({
  cardId:  z.string().min(1, 'Selecione um cartão'),
  amount:  z.number().positive('Informe um valor'),
  month:   z.number().min(1).max(12),
  year:    z.number().min(2020).max(2099),
  dueDate: z.string().optional(),
});
type BillForm = z.infer<typeof billSchema>;

const itemSchema = z.object({
  description:  z.string().min(1, 'Descrição obrigatória'),
  totalAmount:  z.number().positive('Informe um valor'),
  category:     z.string().min(1, 'Categoria obrigatória'),
  installments: z.number().int().min(1).max(48).optional(),
});
type ItemForm = z.infer<typeof itemSchema>;

/* ═══════════════════════════════════════════════════════════ */
export default function Faturas() {
  const qc = useQueryClient();

  const { data: cards = [] }  = useQuery({ queryKey: ['cards'],      queryFn: cardService.list });
  const { data: bills = [], isLoading } = useQuery({ queryKey: ['card-bills'], queryFn: cardBillService.list });

  const [selectedCard, setSelectedCard] = useState<string | 'all'>('all');
  const [showBillModal, setShowBillModal] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [billItems, setBillItems] = useState<Record<string, CardBillItem[]>>({});
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  /* ── bill form ── */
  const now = new Date();
  const { register: regB, handleSubmit: hB, reset: rB, formState: { errors: eB } } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() },
  });

  const createBillMut = useMutation({
    mutationFn: (d: BillForm) => {
      const card = cards.find((c) => c.id === d.cardId);
      return cardBillService.create({ ...d, cardName: card?.name ?? '' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['card-bills'] }); qc.invalidateQueries({ queryKey: ['expenses'] }); setShowBillModal(false); rB(); },
  });

  const deleteBillMut = useMutation({
    mutationFn: (id: string) => cardBillService.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['card-bills'] }); qc.invalidateQueries({ queryKey: ['expenses'] }); },
  });

  /* ── inline amount edit ── */
  async function saveAmount(bill: CardBill) {
    const val = parseFloat(editAmount.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      await cardBillService.updateAmount(bill.id, val, bill.cardName);
      qc.invalidateQueries({ queryKey: ['card-bills'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    }
    setEditingAmount(null);
  }

  /* ── items ── */
  const { register: regI, handleSubmit: hI, reset: rI, formState: { errors: eI } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { installments: 1 },
  });

  const addItemMut = useMutation({
    mutationFn: ({ billId, data }: { billId: string; data: ItemForm }) =>
      cardBillService.addItem(billId, data),
    onSuccess: async (_, { billId }) => {
      const updated = await cardBillService.listItems(billId);
      setBillItems((prev) => ({ ...prev, [billId]: updated }));
      qc.invalidateQueries({ queryKey: ['card-bills'] });
      rI({ installments: 1 });
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: ({ billId, itemId }: { billId: string; itemId: string }) =>
      cardBillService.removeItem(billId, itemId),
    onSuccess: async (_, { billId }) => {
      const updated = await cardBillService.listItems(billId);
      setBillItems((prev) => ({ ...prev, [billId]: updated }));
      qc.invalidateQueries({ queryKey: ['card-bills'] });
    },
  });

  async function toggleExpand(bill: CardBill) {
    if (expandedBill === bill.id) { setExpandedBill(null); return; }
    const items = await cardBillService.listItems(bill.id);
    setBillItems((prev) => ({ ...prev, [bill.id]: items }));
    setExpandedBill(bill.id);
  }

  /* ── filtered bills ── */
  const filtered = selectedCard === 'all'
    ? bills
    : bills.filter((b) => b.cardId === selectedCard);

  // Group by year
  const byYear = filtered.reduce<Record<number, CardBill[]>>((acc, b) => {
    if (!acc[b.year]) acc[b.year] = [];
    acc[b.year].push(b);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  /* ════════════════════ render ════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Faturas</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Acompanhe os gastos dos seus cartões</div>
        </div>
        <button
          onClick={() => setShowBillModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={15} /> Nova Fatura
        </button>
      </div>

      {/* ── Card tabs ── */}
      {cards.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCard('all')}
            style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: selectedCard === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: selectedCard === 'all' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: selectedCard === 'all' ? '#818cf8' : '#64748b',
            }}
          >Todos os cartões</button>
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCard(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: selectedCard === c.id ? `${c.color}22` : 'rgba(255,255,255,0.04)',
                border: selectedCard === c.id ? `1px solid ${c.color}55` : '1px solid rgba(255,255,255,0.08)',
                color: selectedCard === c.id ? c.color : '#64748b',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
              {c.name}{c.lastDigits ? ` ••${c.lastDigits}` : ''}
            </button>
          ))}
        </div>
      )}

      {/* ── No cards warning ── */}
      {cards.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14,
        }}>
          <AlertCircle size={18} color="#fbbf24" />
          <div style={{ fontSize: 13, color: '#fbbf24' }}>
            Cadastre um cartão primeiro em <strong>Cartões</strong> para poder registrar faturas.
          </div>
        </div>
      )}

      {/* ── Bills list ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#0d1117', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <Receipt size={40} color="#1f2937" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: '#374151' }}>Nenhuma fatura ainda</div>
          <div style={{ fontSize: 12, color: '#1f2937', marginTop: 4 }}>Clique em "Nova Fatura" para registrar</div>
        </div>
      ) : (
        years.map((year) => (
          <div key={year}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              {year}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byYear[year].map((bill) => {
                const items = billItems[bill.id] ?? [];
                const isExp = expandedBill === bill.id;
                const stubBill = bill.amount === 0 && !bill.expenseId;

                return (
                  <div key={bill.id} style={{
                    background: '#0d1117', borderRadius: 16,
                    border: `1px solid ${bill.cardColor}25`,
                    overflow: 'hidden',
                  }}>
                    {/* Color bar */}
                    <div style={{ height: 3, background: `linear-gradient(90deg, ${bill.cardColor}, ${bill.cardColor}66)` }} />

                    <div style={{ padding: '16px 20px' }}>
                      {/* Bill header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                            background: `${bill.cardColor}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <CreditCard size={18} color={bill.cardColor} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                              {bill.cardName} — {MONTHS[bill.month - 1]}
                            </div>
                            <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                              {bill.itemsCount} {bill.itemsCount === 1 ? 'item' : 'itens'} · Total detalhado: {fmt(bill.itemsTotal)}
                            </div>
                          </div>
                        </div>

                        {/* Amount (editable) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {editingAmount === bill.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                autoFocus
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveAmount(bill); if (e.key === 'Escape') setEditingAmount(null); }}
                                style={{ ...inputStyle, width: 130, padding: '6px 10px', fontSize: 14 }}
                                placeholder="0,00"
                              />
                              <button onClick={() => saveAmount(bill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}>
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingAmount(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                  fontSize: 18, fontWeight: 800,
                                  color: stubBill ? '#374151' : bill.cardColor,
                                  letterSpacing: '-0.02em',
                                }}>
                                  {stubBill ? '— sem valor' : fmt(bill.amount)}
                                </div>
                                <button
                                  onClick={() => { setEditingAmount(bill.id); setEditAmount(String(bill.amount)); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 2 }}
                                  title="Editar valor"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                              {stubBill && (
                                <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>clique no lápis para informar</div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => deleteBillMut.mutate(bill.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4 }}
                            title="Excluir fatura"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(bill)}
                        style={{
                          marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '7px 0', borderRadius: 10, background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        {isExp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isExp ? 'Ocultar itens' : 'Ver / adicionar itens da fatura'}
                      </button>

                      {/* Items panel */}
                      {isExp && (
                        <div style={{ marginTop: 14 }}>
                          {/* Items list */}
                          {items.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#374151', textAlign: 'center', padding: '12px 0' }}>
                              Nenhum item adicionado ainda
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                              {items.map((item) => {
                                const catColor = CAT_COLOR[item.category] ?? '#64748b';
                                return (
                                  <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.025)',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div style={{
                                        width: 8, height: 8, borderRadius: 2, background: catColor, flexShrink: 0,
                                      }} />
                                      <div>
                                        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>{item.description}</div>
                                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
                                          {item.category}
                                          {item.installments > 1 && (
                                            <span style={{ marginLeft: 6, color: '#6366f1', fontWeight: 600 }}>
                                              {item.installmentNumber}/{item.installments}x
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f43f5e' }}>
                                        {item.installments > 1 ? (
                                          <>
                                            {fmt(item.amount)}
                                            <span style={{ fontSize: 10, color: '#475569', fontWeight: 400 }}> /parcela</span>
                                          </>
                                        ) : fmt(item.amount)}
                                      </div>
                                      <button
                                        onClick={() => deleteItemMut.mutate({ billId: bill.id, itemId: item.id })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 2 }}
                                        title="Remover item"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Add item form */}
                          <div style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Adicionar item
                            </div>
                            <form
                              onSubmit={hI((d) => addItemMut.mutate({ billId: bill.id, data: d }))}
                              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
                            >
                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Descrição *</label>
                                <input {...regI('description')} placeholder="Ex: Netflix, Tênis Nike…" style={inputStyle} />
                                {eI.description && <div style={errStyle}>{eI.description.message}</div>}
                              </div>

                              <div>
                                <label style={labelStyle}>Valor total (R$) *</label>
                                <input
                                  {...regI('totalAmount', { valueAsNumber: true })}
                                  type="number" step="0.01" placeholder="0,00"
                                  style={inputStyle}
                                  onFocus={(e) => e.target.select()}
                                />
                                {eI.totalAmount && <div style={errStyle}>{eI.totalAmount.message}</div>}
                              </div>

                              <div>
                                <label style={labelStyle}>Parcelas</label>
                                <input
                                  {...regI('installments', { valueAsNumber: true })}
                                  type="number" min={1} max={48} placeholder="1"
                                  style={inputStyle}
                                  onFocus={(e) => e.target.select()}
                                />
                                {eI.installments && <div style={errStyle}>{eI.installments.message}</div>}
                              </div>

                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Categoria *</label>
                                <select {...regI('category')} style={{ ...inputStyle, appearance: 'none' }}>
                                  <option value="">Selecione…</option>
                                  {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                {eI.category && <div style={errStyle}>{eI.category.message}</div>}
                              </div>

                              <button
                                type="submit"
                                disabled={addItemMut.isPending}
                                style={{
                                  gridColumn: '1 / -1', padding: '10px 0', borderRadius: 10,
                                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                  border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                {addItemMut.isPending ? 'Adicionando…' : '+ Adicionar item'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* ══════════ Create Bill Modal ══════════ */}
      {showBillModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, width: 440, padding: 28, position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          }}>
            <button
              onClick={() => setShowBillModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
            ><X size={16} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Receipt size={18} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Nova Fatura</div>
                <div style={{ fontSize: 11, color: '#475569' }}>A fatura será adicionada automaticamente em Despesas</div>
              </div>
            </div>

            <form onSubmit={hB((d) => createBillMut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Cartão *</label>
                <select {...regB('cardId')} style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Selecione um cartão…</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.lastDigits ? ` ••${c.lastDigits}` : ''}</option>
                  ))}
                </select>
                {eB.cardId && <div style={errStyle}>{eB.cardId.message}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Mês *</label>
                  <select {...regB('month', { valueAsNumber: true })} style={{ ...inputStyle, appearance: 'none' }}>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Ano *</label>
                  <input {...regB('year', { valueAsNumber: true })} type="number" min={2020} max={2099} style={inputStyle} />
                  {eB.year && <div style={errStyle}>{eB.year.message}</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Valor total da fatura (R$) *</label>
                <input
                  {...regB('amount', { valueAsNumber: true })}
                  type="number" step="0.01" placeholder="0,00"
                  style={inputStyle}
                  onFocus={(e) => e.target.select()}
                />
                {eB.amount && <div style={errStyle}>{eB.amount.message}</div>}
              </div>

              <div>
                <label style={labelStyle}>Vencimento</label>
                <input {...regB('dueDate')} type="date" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button" onClick={() => setShowBillModal(false)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  type="submit" disabled={createBillMut.isPending}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {createBillMut.isPending ? 'Salvando…' : 'Registrar Fatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
