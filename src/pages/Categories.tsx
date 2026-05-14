import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Trash2, AlertCircle } from 'lucide-react';
import { categoryService } from '../services/api';

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 10, fontSize: 13,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
};

const DEFAULT_COLOR = '#6366f1';

export default function Categories() {
  const qc = useQueryClient();
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [error, setError]       = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.list,
  });

  const createMut = useMutation({
    mutationFn: () => categoryService.create({ name: newName.trim(), color: newColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      setNewColor(DEFAULT_COLOR);
      setError('');
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'Erro ao criar categoria');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  function handleAdd() {
    if (!newName.trim()) { setError('Informe um nome'); return; }
    createMut.mutate();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Categorias</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          Gerencie as categorias usadas em despesas e faturas
        </div>
      </div>

      {/* Add row */}
      <div style={{
        padding: '18px 20px', borderRadius: 16,
        background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Nova Categoria
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ex: Streaming, Academia…"
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 5 }}>Cor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{
                  width: 42, height: 42, borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'none', padding: 2,
                }}
              />
              <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{newColor}</span>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={createMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 12, height: 42,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              flexShrink: 0,
            }}
          >
            <Plus size={14} />
            {createMut.isPending ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <AlertCircle size={13} color="#f43f5e" />
            <span style={{ fontSize: 12, color: '#f43f5e' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: '#0d1117', borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto',
          padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          fontSize: 10, fontWeight: 700, color: '#334155',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <span>Categoria</span>
          <span>Ação</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
            Carregando…
          </div>
        ) : categories.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Tag size={32} color="#1f2937" style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: '#334155' }}>Nenhuma categoria ainda</div>
            <div style={{ fontSize: 11, color: '#1f2937', marginTop: 4 }}>
              Use o formulário acima para adicionar a primeira
            </div>
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                alignItems: 'center', padding: '13px 20px',
                borderBottom: idx < categories.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Name + color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 4,
                  background: cat.color, flexShrink: 0,
                  boxShadow: `0 0 8px ${cat.color}66`,
                }} />
                <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{cat.name}</span>
                <span style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace' }}>{cat.color}</span>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteMut.mutate(cat.id)}
                disabled={deleteMut.isPending}
                title="Remover categoria"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                  color: '#374151', borderRadius: 8, display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#374151')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ fontSize: 11, color: '#334155' }}>
        {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'} cadastradas
      </div>
    </div>
  );
}
