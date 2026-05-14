import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PiggyBank, Plus, Trash2, ArrowDownCircle, ArrowUpCircle, X, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { savingService } from '../services/api';
import type { Saving, SavingTransaction } from '../services/api';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/* ── schemas ── */
const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  targetAmount: z.union([z.number().positive('Valor deve ser positivo'), z.literal('')]).optional(),
  color: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const txSchema = z.object({
  amount: z.coerce.number().positive('Informe um valor positivo'),
  type: z.enum(['deposit', 'withdrawal']),
  description: z.string().optional(),
  createdAt: z.string().optional(),
});
type TxForm = z.infer<typeof txSchema>;

/* ── helpers ── */
const PRESET_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#06b6d4', '#6366f1'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#94a3b8', marginBottom: 5, display: 'block' };
const errStyle: React.CSSProperties = { fontSize: 11, color: '#f43f5e', marginTop: 4 };

/* ══════════════════════════════════════════════════════ */
export default function Savings() {
  const qc = useQueryClient();
  const { data: savings = [], isLoading } = useQuery({ queryKey: ['savings'], queryFn: savingService.list });

  const [showCreate, setShowCreate] = useState(false);
  const [txTarget, setTxTarget] = useState<Saving | null>(null);
  const [txMode, setTxMode] = useState<'deposit' | 'withdrawal'>('deposit');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [txHistory, setTxHistory] = useState<Record<string, SavingTransaction[]>>({});

  /* ── create saving ── */
  const { register: regCreate, handleSubmit: hCreate, reset: rCreate, watch: wCreate,
    setValue: svCreate, formState: { errors: eCreate } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { color: '#22c55e' },
  });
  const selectedColor = wCreate('color');

  const createMut = useMutation({
    mutationFn: (d: CreateForm) => savingService.create({
      name: d.name,
      description: d.description || undefined,
      targetAmount: d.targetAmount ? Number(d.targetAmount) : undefined,
      color: d.color || '#22c55e',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['savings'] }); setShowCreate(false); rCreate({ color: '#22c55e' }); },
  });

  /* ── delete saving ── */
  const deleteMut = useMutation({
    mutationFn: (id: string) => savingService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  });

  /* ── add transaction ── */
  const { register: regTx, handleSubmit: hTx, reset: rTx, formState: { errors: eTx } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: { type: 'deposit', amount: '' as any },
  });

  const txMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TxForm }) =>
      savingService.addTransaction(id, {
        amount: data.amount,
        type: data.type,
        description: data.description || undefined,
        createdAt: data.createdAt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['savings'] });
      if (txTarget) {
        loadHistory(txTarget.id);
      }
      setTxTarget(null);
      rTx({ type: 'deposit', amount: '' as any });
    },
  });

  /* ── load history ── */
  async function loadHistory(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    const txs = await savingService.listTransactions(id);
    setTxHistory((prev) => ({ ...prev, [id]: txs }));
    setExpanded(id);
  }

  const totalSaved = savings.reduce((s, v) => s + v.balance, 0);

  /* ── modal opener ── */
  function openTx(saving: Saving, mode: 'deposit' | 'withdrawal') {
    setTxTarget(saving);
    setTxMode(mode);
    rTx({ type: mode, amount: '' as any, description: '', createdAt: '' });
  }

  /* ════════════════════ render ════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Poupança</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Gerencie suas reservas financeiras</div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
          }}
        >
          <Plus size={15} /> Nova Poupança
        </button>
      </div>

      {/* ── Total card ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,163,74,0.06))',
        border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: 18, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 18,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
        }}>
          <PiggyBank size={24} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total em Poupança</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f0fdf4', letterSpacing: '-0.03em', marginTop: 2 }}>{fmt(totalSaved)}</div>
          <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>{savings.length} {savings.length === 1 ? 'reserva' : 'reservas'} ativas</div>
        </div>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>Carregando…</div>
      ) : savings.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#0d1117', borderRadius: 18, border: '1px dashed rgba(255,255,255,0.08)',
        }}>
          <PiggyBank size={40} color="#1f2937" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, color: '#374151' }}>Nenhuma poupança ainda</div>
          <div style={{ fontSize: 12, color: '#1f2937', marginTop: 4 }}>Crie sua primeira reserva financeira</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {savings.map((s) => {
            const pct = s.targetAmount && s.targetAmount > 0 ? Math.min(100, (s.balance / s.targetAmount) * 100) : null;
            return (
              <div key={s.id} style={{
                background: '#0d1117', borderRadius: 18,
                border: `1px solid ${s.color}30`,
                overflow: 'hidden',
              }}>
                {/* Color bar */}
                <div style={{ height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}99)` }} />

                <div style={{ padding: '18px 20px' }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: `${s.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <PiggyBank size={18} color={s.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{s.name}</div>
                        {s.description && <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{s.description}</div>}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMut.mutate(s.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 4 }}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Balance */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Saldo atual</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{fmt(s.balance)}</div>
                    {s.targetAmount && (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Target size={11} />
                        Meta: {fmt(s.targetAmount)}
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  {pct !== null && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: '#475569' }}>Progresso</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: s.color }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${s.color}, ${s.color}bb)`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button
                      onClick={() => openTx(s, 'deposit')}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', borderRadius: 10,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                        color: '#22c55e', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <ArrowDownCircle size={14} /> Depositar
                    </button>
                    <button
                      onClick={() => openTx(s, 'withdrawal')}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px 0', borderRadius: 10,
                        background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                        color: '#f43f5e', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <ArrowUpCircle size={14} /> Retirar
                    </button>
                  </div>

                  {/* History toggle */}
                  <button
                    onClick={() => loadHistory(s.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '7px 0', borderRadius: 10, background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.06)', color: '#475569',
                      fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    {expanded === s.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {expanded === s.id ? 'Ocultar histórico' : 'Ver histórico'}
                  </button>

                  {/* History list */}
                  {expanded === s.id && txHistory[s.id] && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {txHistory[s.id].length === 0 ? (
                        <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', padding: '8px 0' }}>Nenhuma transação</div>
                      ) : (
                        txHistory[s.id].map((t) => (
                          <div key={t.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.02)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: t.type === 'deposit' ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.1)',
                              }}>
                                {t.type === 'deposit'
                                  ? <ArrowDownCircle size={14} color="#22c55e" />
                                  : <ArrowUpCircle size={14} color="#f43f5e" />}
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.description || (t.type === 'deposit' ? 'Depósito' : 'Retirada')}</div>
                                <div style={{ fontSize: 10, color: '#374151' }}>{new Date(t.createdAt).toLocaleDateString('pt-BR')}</div>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: t.type === 'deposit' ? '#22c55e' : '#f43f5e' }}>
                              {t.type === 'deposit' ? '+' : '-'}{fmt(t.amount)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ Create Saving Modal ══════════ */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, width: 420, padding: 28, position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          }}>
            <button
              onClick={() => setShowCreate(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
            ><X size={16} /></button>

            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 20 }}>Nova Poupança</div>

            <form onSubmit={hCreate((d) => createMut.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input {...regCreate('name')} placeholder="Ex: Viagem, Reserva de emergência…" style={inputStyle} />
                {eCreate.name && <div style={errStyle}>{eCreate.name.message}</div>}
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <input {...regCreate('description')} placeholder="Opcional" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Meta (R$)</label>
                <input
                  {...regCreate('targetAmount', { setValueAs: (v) => v === '' ? '' : Number(v) })}
                  type="number" step="0.01" placeholder="Ex: 10000"
                  style={inputStyle}
                  onFocus={(e) => e.target.select()}
                />
                {eCreate.targetAmount && <div style={errStyle}>{(eCreate.targetAmount as any).message}</div>}
              </div>

              <div>
                <label style={labelStyle}>Cor</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      onClick={() => svCreate('color', c)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, background: c, border: 'none', cursor: 'pointer',
                        outline: selectedColor === c ? `2px solid white` : '2px solid transparent',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {createMut.isPending ? 'Criando…' : 'Criar Poupança'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ Transaction Modal ══════════ */}
      {txTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, width: 400, padding: 28, position: 'relative',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          }}>
            <button
              onClick={() => setTxTarget(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
            ><X size={16} /></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: txMode === 'deposit' ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {txMode === 'deposit'
                  ? <ArrowDownCircle size={18} color="#22c55e" />
                  : <ArrowUpCircle size={18} color="#f43f5e" />}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                  {txMode === 'deposit' ? 'Depositar em' : 'Retirar de'} {txTarget.name}
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>Saldo atual: {fmt(txTarget.balance)}</div>
              </div>
            </div>

            <form onSubmit={hTx((d) => txMut.mutate({ id: txTarget.id, data: d }))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="hidden" {...regTx('type')} value={txMode} />

              <div>
                <label style={labelStyle}>Valor (R$) *</label>
                <input
                  {...regTx('amount', { setValueAs: (v) => v === '' ? '' : Number(v) })}
                  type="number" step="0.01" placeholder="0,00"
                  style={inputStyle}
                  onFocus={(e) => e.target.select()}
                />
                {eTx.amount && <div style={errStyle}>{eTx.amount.message}</div>}
              </div>

              <div>
                <label style={labelStyle}>Descrição</label>
                <input {...regTx('description')} placeholder="Opcional" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Data</label>
                <input {...regTx('createdAt')} type="date" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setTxTarget(null)}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  type="submit"
                  disabled={txMut.isPending}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 12,
                    background: txMode === 'deposit'
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                    border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {txMut.isPending ? 'Salvando…' : (txMode === 'deposit' ? 'Depositar' : 'Retirar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
