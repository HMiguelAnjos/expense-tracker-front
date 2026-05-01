import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardService, CreateCardInput } from '../services/api';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
];

export default function Cards() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateCardInput>({ name: '', lastDigits: '', color: '#6366f1' });

  const { data: cards = [], isLoading } = useQuery({ queryKey: ['cards'], queryFn: cardService.list });

  const createMutation = useMutation({
    mutationFn: cardService.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cards'] }); setShowModal(false); setForm({ name: '', lastDigits: '', color: '#6366f1' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: cardService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({ name: form.name, lastDigits: form.lastDigits || undefined, color: form.color });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Cartões</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Gerencie seus cartões de crédito e débito</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 10,
            color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          }}
        >
          <Plus size={15} /> Novo cartão
        </button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Carregando...</p>
      ) : cards.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 0', color: 'var(--text-muted)',
        }}>
          <CreditCard size={40} color="#334155" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Nenhum cartão cadastrado ainda</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Clique em "Novo cartão" para adicionar</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {cards.map((card) => (
            <div key={card.id} style={{
              position: 'relative',
              background: `linear-gradient(135deg, ${card.color}22, ${card.color}11)`,
              border: `1px solid ${card.color}44`,
              borderRadius: 16, padding: '20px 20px',
              overflow: 'hidden',
            }}>
              {/* decorative circle */}
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 100, height: 100, borderRadius: '50%',
                background: `${card.color}22`,
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 16px ${card.color}44`,
                }}>
                  <CreditCard size={18} color="white" />
                </div>
                <button
                  onClick={() => deleteMutation.mutate(card.id)}
                  style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#f87171',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{card.name}</div>
                {card.lastDigits && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.1em' }}>
                    •••• •••• •••• {card.lastDigits}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Novo cartão</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Nome do cartão *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Nubank, Inter, Itaú..."
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Últimos 4 dígitos (opcional)</label>
                <input
                  value={form.lastDigits}
                  onChange={(e) => setForm({ ...form, lastDigits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="1234"
                  maxLength={4}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, color: '#f1f5f9', fontSize: 14, outline: 'none', letterSpacing: '0.2em' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>Cor</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: c, border: form.color === c ? '3px solid white' : '3px solid transparent',
                        cursor: 'pointer', outline: 'none',
                        boxShadow: form.color === c ? `0 0 10px ${c}88` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={createMutation.isPending} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
