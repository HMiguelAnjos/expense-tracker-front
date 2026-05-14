import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Receipt, Plus, Trash2, X, CreditCard, AlertCircle,
  Pencil, Check, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { cardService, cardBillService, categoryService } from '../services/api';
import type { CardBill, CardBillItem } from '../services/api';

/* ── helpers ── */
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function prevMonth(m: number, y: number) {
  if (m === 1) return { month: 12, year: y - 1 };
  return { month: m - 1, year: y };
}
function nextMonth(m: number, y: number) {
  if (m === 12) return { month: 1, year: y + 1 };
  return { month: m + 1, year: y };
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties  = { fontSize: 12, color: '#94a3b8', marginBottom: 5, display: 'block' };
const errStyle: React.CSSProperties    = { fontSize: 11, color: '#f43f5e', marginTop: 4 };

/* ── schemas ── */
const createBillSchema = z.object({
  amount:  z.number().min(0, 'Informe um valor'),
  dueDate: z.string().optional(),
});
type CreateBillForm = z.infer<typeof createBillSchema>;

const itemSchema = z.object({
  description:  z.string().min(1, 'Descrição obrigatória'),
  amount:       z.number().positive('Informe um valor positivo'),
  category:     z.string().min(1, 'Selecione uma categoria'),
  installments: z.number().int().min(1).max(48),
});
type ItemForm = z.infer<typeof itemSchema>;

const editItemSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount:      z.number().positive('Informe um valor positivo'),
  category:    z.string().min(1, 'Selecione uma categoria'),
});
type EditItemForm = z.infer<typeof editItemSchema>;

/* ══════════════════════════════════════════════════════════════ */
export default function Faturas() {
  const qc  = useQueryClient();
  const now = new Date();

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  /* items cache per bill id */
  const [itemsMap, setItemsMap]   = useState<Record<string, CardBillItem[]>>({});
  const [loadedBills, setLoadedBills] = useState<Set<string>>(new Set());

  /* inline amount editing */
  const [editingAmount, setEditingAmount] = useState(false);
  const [editAmountVal, setEditAmountVal] = useState('');

  /* item editing */
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  /* add-item form open */
  const [showAddItem, setShowAddItem] = useState(false);
  /* installment input mode */
  const [inputMode, setInputMode] = useState<'per_installment' | 'total'>('per_installment');

  /* ── data ── */
  const { data: cards = [] } = useQuery({ queryKey: ['cards'], queryFn: cardService.list });
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['card-bills'],
    queryFn: cardBillService.list,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.list,
  });

  /* select first card automatically */
  useEffect(() => {
    if (cards.length > 0 && !selectedCard) setSelectedCard(cards[0].id);
  }, [cards, selectedCard]);

  /* current bill */
  const currentBill: CardBill | undefined = bills.find(
    (b) => b.cardId === selectedCard && b.month === month && b.year === year,
  );

  /* load items when bill is in view */
  useEffect(() => {
    if (!currentBill || loadedBills.has(currentBill.id)) return;
    cardBillService.listItems(currentBill.id).then((items) => {
      setItemsMap((p) => ({ ...p, [currentBill.id]: items }));
      setLoadedBills((p) => new Set(p).add(currentBill.id));
    });
  }, [currentBill, loadedBills]);

  const currentItems = currentBill ? (itemsMap[currentBill.id] ?? []) : [];
  const selectedCardObj = cards.find((c) => c.id === selectedCard);

  /* ── create bill ── */
  const { register: regC, handleSubmit: hC, reset: rC, formState: { errors: eC } } =
    useForm<CreateBillForm>({
      resolver: zodResolver(createBillSchema),
      defaultValues: { amount: 0 },
    });

  const createBillMut = useMutation({
    mutationFn: (d: CreateBillForm) =>
      cardBillService.create({
        cardId: selectedCard!,
        cardName: selectedCardObj?.name ?? '',
        amount: d.amount,
        month,
        year,
        dueDate: d.dueDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-bills'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      rC();
    },
  });

  /* ── delete bill ── */
  const deleteBillMut = useMutation({
    mutationFn: (id: string) => cardBillService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-bills'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  /* ── update bill amount ── */
  async function saveAmount() {
    if (!currentBill) return;
    const val = parseFloat(editAmountVal.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      await cardBillService.updateAmount(currentBill.id, val, currentBill.cardName);
      qc.invalidateQueries({ queryKey: ['card-bills'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    }
    setEditingAmount(false);
  }

  /* ── add item ── */
  const { register: regI, handleSubmit: hI, reset: rI, formState: { errors: eI } } =
    useForm<ItemForm>({
      resolver: zodResolver(itemSchema),
      defaultValues: { installments: 1 },
    });

  const addItemMut = useMutation({
    mutationFn: (d: ItemForm) => {
      if (!currentBill) return Promise.reject();
      const totalAmount =
        inputMode === 'per_installment' ? d.amount * d.installments : d.amount;
      return cardBillService.addItem(currentBill.id, {
        description: d.description,
        totalAmount,
        category: d.category,
        installments: d.installments,
      });
    },
    onSuccess: async () => {
      if (!currentBill) return;
      const items = await cardBillService.listItems(currentBill.id);
      setItemsMap((p) => ({ ...p, [currentBill.id]: items }));
      qc.invalidateQueries({ queryKey: ['card-bills'] });
      rI({ installments: 1 });
    },
  });

  /* ── delete item ── */
  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) =>
      cardBillService.removeItem(currentBill!.id, itemId),
    onSuccess: async () => {
      if (!currentBill) return;
      const items = await cardBillService.listItems(currentBill.id);
      setItemsMap((p) => ({ ...p, [currentBill.id]: items }));
      qc.invalidateQueries({ queryKey: ['card-bills'] });
    },
  });

  /* ── edit item ── */
  const { register: regE, handleSubmit: hE, reset: rE, formState: { errors: eE } } =
    useForm<EditItemForm>({ resolver: zodResolver(editItemSchema) });

  function startEdit(item: CardBillItem) {
    setEditingItemId(item.id);
    rE({ description: item.description, amount: item.amount, category: item.category });
  }

  const updateItemMut = useMutation({
    mutationFn: (d: EditItemForm) =>
      cardBillService.updateItem(currentBill!.id, editingItemId!, d),
    onSuccess: async () => {
      if (!currentBill) return;
      const items = await cardBillService.listItems(currentBill.id);
      setItemsMap((p) => ({ ...p, [currentBill.id]: items }));
      setEditingItemId(null);
    },
  });

  /* ── nav ── */
  function goBack() {
    const p = prevMonth(month, year);
    setMonth(p.month); setYear(p.year);
    setShowAddItem(false); setEditingItemId(null); setEditingAmount(false);
  }
  function goForward() {
    const n = nextMonth(month, year);
    setMonth(n.month); setYear(n.year);
    setShowAddItem(false); setEditingItemId(null); setEditingAmount(false);
  }

  const cardColor = selectedCardObj?.color ?? '#6366f1';

  /* ══════════════════ render ══════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Faturas</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Acompanhe os gastos dos seus cartões</div>
      </div>

      {/* ── No cards warning ── */}
      {cards.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14,
        }}>
          <AlertCircle size={18} color="#fbbf24" />
          <div style={{ fontSize: 13, color: '#fbbf24' }}>
            Cadastre um cartão em <strong>Cartões</strong> para poder gerenciar faturas.
          </div>
        </div>
      )}

      {/* ── Card selector ── */}
      {cards.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedCard(c.id); setShowAddItem(false); setEditingItemId(null); setEditingAmount(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: selectedCard === c.id ? `${c.color}22` : 'rgba(255,255,255,0.04)',
                border: selectedCard === c.id ? `2px solid ${c.color}88` : '2px solid transparent',
                color: selectedCard === c.id ? c.color : '#64748b',
                transition: 'all 0.15s',
              }}
            >
              <CreditCard size={14} />
              {c.name}{c.lastDigits ? ` ••${c.lastDigits}` : ''}
            </button>
          ))}
        </div>
      )}

      {/* ── Month navigator ── */}
      {selectedCard && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <button
            onClick={goBack}
            style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', color: '#64748b',
            }}
          ><ChevronLeft size={18} /></button>

          <div style={{ textAlign: 'center', minWidth: 160 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              {MONTHS[month - 1]}
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>{year}</div>
          </div>

          <button
            onClick={goForward}
            style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', color: '#64748b',
            }}
          ><ChevronRight size={18} /></button>
        </div>
      )}

      {/* ── Bill panel ── */}
      {selectedCard && !billsLoading && (
        <>
          {!currentBill ? (
            /* ─ No bill for this month ─ */
            <div style={{
              background: '#0d1117', borderRadius: 18,
              border: `1px dashed ${cardColor}44`, padding: '32px 28px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            }}>
              <div style={{ textAlign: 'center' }}>
                <Receipt size={36} color={`${cardColor}55`} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                  Nenhuma fatura para {selectedCardObj?.name} em {MONTHS[month - 1]} {year}
                </div>
                <div style={{ fontSize: 12, color: '#1f2937', marginTop: 4 }}>
                  Informe o valor total da fatura para adicioná-la em Despesas
                </div>
              </div>

              <form
                onSubmit={hC((d) => createBillMut.mutate(d))}
                style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 380 }}
              >
                <div>
                  <label style={labelStyle}>Valor total da fatura (R$)</label>
                  <input
                    {...regC('amount', { valueAsNumber: true })}
                    type="number" step="0.01" placeholder="0,00"
                    style={inputStyle}
                    onFocus={(e) => e.target.select()}
                  />
                  {eC.amount && <div style={errStyle}>{eC.amount.message}</div>}
                </div>
                <div>
                  <label style={labelStyle}>Vencimento (opcional)</label>
                  <input {...regC('dueDate')} type="date" style={inputStyle} />
                </div>
                <button
                  type="submit"
                  disabled={createBillMut.isPending}
                  style={{
                    padding: '11px 0', borderRadius: 12,
                    background: `linear-gradient(135deg, ${cardColor}, ${cardColor}aa)`,
                    border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: `0 4px 20px ${cardColor}44`,
                  }}
                >
                  <Plus size={15} />
                  {createBillMut.isPending ? 'Criando…' : `Informar Fatura de ${MONTHS[month - 1]}`}
                </button>
              </form>
            </div>
          ) : (
            /* ─ Bill exists ─ */
            <div style={{
              background: '#0d1117', borderRadius: 18,
              border: `1px solid ${cardColor}33`, overflow: 'hidden',
            }}>
              {/* Color bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${cardColor}, ${cardColor}55)` }} />

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Bill header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                      Total da fatura
                    </div>
                    {editingAmount ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <input
                          autoFocus
                          value={editAmountVal}
                          onChange={(e) => setEditAmountVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveAmount(); if (e.key === 'Escape') setEditingAmount(false); }}
                          style={{ ...inputStyle, width: 160, padding: '8px 12px', fontSize: 18, fontWeight: 800 }}
                          placeholder="0,00"
                        />
                        <button onClick={saveAmount} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}>
                          <Check size={18} />
                        </button>
                        <button onClick={() => setEditingAmount(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: cardColor, letterSpacing: '-0.02em' }}>
                          {currentBill.amount === 0 && !currentBill.expenseId ? '—' : fmt(currentBill.amount)}
                        </div>
                        <button
                          onClick={() => { setEditingAmount(true); setEditAmountVal(String(currentBill.amount)); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4 }}
                          title="Editar valor"
                        ><Pencil size={13} /></button>
                      </div>
                    )}
                    {currentBill.dueDate && (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        Vence em {new Date(currentBill.dueDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                      border: '1px solid rgba(99,102,241,0.2)',
                    }}>
                      {currentItems.length} {currentItems.length === 1 ? 'item' : 'itens'} · {fmt(currentItems.reduce((s, i) => s + i.amount, 0))}
                    </div>
                    <button
                      onClick={() => { if (window.confirm('Excluir esta fatura?')) deleteBillMut.mutate(currentBill.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                        color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    ><Trash2 size={12} /> Excluir fatura</button>
                  </div>
                </div>

                {/* ── Items table ── */}
                {currentItems.length > 0 && (
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Table head */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 90px 80px 60px',
                      padding: '9px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: 10, fontWeight: 700, color: '#334155',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>
                      <span>Descrição</span>
                      <span>Categoria</span>
                      <span style={{ textAlign: 'right' }}>Valor</span>
                      <span style={{ textAlign: 'center' }}>Parcela</span>
                      <span style={{ textAlign: 'right' }}>Ação</span>
                    </div>

                    {currentItems.map((item, idx) => {
                      const catObj = categories.find((c) => c.name === item.category);
                      const catColor = catObj?.color ?? '#64748b';
                      const isEditing = editingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          style={{
                            borderBottom: idx < currentItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          }}
                        >
                          {isEditing ? (
                            /* ── edit row ── */
                            <form
                              onSubmit={hE((d) => updateItemMut.mutate(d))}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 140px 90px 80px 60px',
                                gap: 8, alignItems: 'start',
                                padding: '10px 16px',
                                background: 'rgba(99,102,241,0.05)',
                              }}
                            >
                              <div>
                                <input
                                  {...regE('description')}
                                  style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}
                                  placeholder="Descrição"
                                />
                                {eE.description && <div style={errStyle}>{eE.description.message}</div>}
                              </div>
                              <div>
                                <select {...regE('category')} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, appearance: 'none' }}>
                                  <option value="">Categoria…</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                  ))}
                                </select>
                                {eE.category && <div style={errStyle}>{eE.category.message}</div>}
                              </div>
                              <div>
                                <input
                                  {...regE('amount', { valueAsNumber: true })}
                                  type="number" step="0.01"
                                  style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }}
                                  placeholder="0,00"
                                  onFocus={(e) => e.target.select()}
                                />
                                {eE.amount && <div style={errStyle}>{eE.amount.message}</div>}
                              </div>
                              <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', paddingTop: 10 }}>
                                {item.installmentNumber}/{item.installments}x
                              </div>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', paddingTop: 6 }}>
                                <button type="submit" disabled={updateItemMut.isPending}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e' }}>
                                  <Check size={15} />
                                </button>
                                <button type="button" onClick={() => setEditingItemId(null)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                                  <X size={14} />
                                </button>
                              </div>
                            </form>
                          ) : (
                            /* ── normal row ── */
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 140px 90px 80px 60px',
                                alignItems: 'center', padding: '11px 16px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 7, height: 7, borderRadius: 2, background: catColor, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{item.description}</span>
                              </div>
                              <div>
                                <span style={{
                                  display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                                  fontSize: 11, fontWeight: 600, color: catColor,
                                  background: `${catColor}18`,
                                }}>
                                  {item.category}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#f43f5e' }}>
                                {fmt(item.amount)}
                              </div>
                              <div style={{ textAlign: 'center', fontSize: 11, color: item.installments > 1 ? '#818cf8' : '#334155', fontWeight: 600 }}>
                                {item.installmentNumber}/{item.installments}x
                              </div>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => startEdit(item)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 4 }}
                                  title="Editar"
                                ><Pencil size={12} /></button>
                                <button
                                  onClick={() => deleteItemMut.mutate(item.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4 }}
                                  title="Remover"
                                ><Trash2 size={12} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentItems.length === 0 && (
                  <div style={{ fontSize: 12, color: '#374151', textAlign: 'center', padding: '8px 0' }}>
                    Nenhum item adicionado — use o formulário abaixo para detalhar a fatura
                  </div>
                )}

                {/* ── Add item toggle ── */}
                <button
                  onClick={() => setShowAddItem((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 16px', borderRadius: 12, cursor: 'pointer',
                    background: showAddItem ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                    border: showAddItem ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    color: showAddItem ? '#818cf8' : '#64748b', fontSize: 12, fontWeight: 600,
                    width: 'fit-content',
                  }}
                >
                  <Plus size={13} />
                  {showAddItem ? 'Ocultar formulário' : 'Adicionar item à fatura'}
                </button>

                {/* ── Add item form ── */}
                {showAddItem && (
                  <div style={{
                    padding: '18px 20px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                  }}>
                    {/* Input mode toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Modo de entrada
                      </span>
                      <button
                        type="button"
                        onClick={() => setInputMode((m) => m === 'per_installment' ? 'total' : 'per_installment')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                          color: '#818cf8', fontSize: 12, fontWeight: 600,
                        }}
                      >
                        {inputMode === 'per_installment'
                          ? <><ToggleLeft size={14} /> Valor por parcela</>
                          : <><ToggleRight size={14} /> Valor total</>
                        }
                      </button>
                      <span style={{ fontSize: 11, color: '#334155' }}>
                        {inputMode === 'per_installment'
                          ? '→ valor é por parcela, multiplicado pelo nº de parcelas'
                          : '→ valor total é dividido pelo nº de parcelas'}
                      </span>
                    </div>

                    <form
                      onSubmit={hI((d) => addItemMut.mutate(d))}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                    >
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Descrição *</label>
                        <input {...regI('description')} placeholder="Ex: Netflix, Tênis Nike…" style={inputStyle} />
                        {eI.description && <div style={errStyle}>{eI.description.message}</div>}
                      </div>

                      <div>
                        <label style={labelStyle}>
                          {inputMode === 'per_installment' ? 'Valor por parcela (R$) *' : 'Valor total (R$) *'}
                        </label>
                        <input
                          {...regI('amount', { valueAsNumber: true })}
                          type="number" step="0.01" placeholder="0,00"
                          style={inputStyle}
                          onFocus={(e) => e.target.select()}
                        />
                        {eI.amount && <div style={errStyle}>{eI.amount.message}</div>}
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
                          {categories.map((c) => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                        {eI.category && <div style={errStyle}>{eI.category.message}</div>}
                      </div>

                      <button
                        type="submit"
                        disabled={addItemMut.isPending}
                        style={{
                          gridColumn: '1 / -1', padding: '11px 0', borderRadius: 10,
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {addItemMut.isPending ? 'Adicionando…' : '+ Adicionar item'}
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {billsLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>Carregando…</div>
      )}
    </div>
  );
}
