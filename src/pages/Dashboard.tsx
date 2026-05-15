import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseService, incomeService, savingService } from '../services/api';
import StatCard from '../components/StatCard';
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  PiggyBank, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#06b6d4', '#a855f7'];

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{fmt(p.value)}</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>{p.name === 'receitas' ? 'Receitas' : 'Despesas'}</span>
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{payload[0].name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{fmt(payload[0].value)}</div>
    </div>
  );
};

function prevMonth(m: number, y: number) {
  return m === 0 ? { m: 11, y: y - 1 } : { m: m - 1, y };
}
function nextMonth(m: number, y: number) {
  return m === 11 ? { m: 0, y: y + 1 } : { m: m + 1, y };
}

export default function Dashboard() {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());   // 0-indexed
  const [filterYear,  setFilterYear]  = useState(now.getFullYear());

  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: expenseService.list });
  const { data: incomes  = [] } = useQuery({ queryKey: ['incomes'],  queryFn: incomeService.list });
  const { data: savings  = [] } = useQuery({ queryKey: ['savings'],  queryFn: savingService.list });

  /* ── filtered data for the selected month ── */
  const filteredExp = expenses.filter((e) => {
    const d = new Date(e.createdAt);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });
  const filteredInc = incomes.filter((i) => {
    const d = new Date(i.createdAt);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  });

  const totalExp  = filteredExp.reduce((s, e) => s + e.amount, 0);
  const totalInc  = filteredInc.reduce((s, i) => s + i.amount, 0);
  const balance   = totalInc - totalExp;
  const savRate   = totalInc > 0 ? ((balance / totalInc) * 100).toFixed(0) : '0';
  const totalSaved = savings.reduce((s, v) => s + v.balance, 0);

  /* ── Last 6 months area (NOT filtered — always shows trend) ── */
  const months: Record<string, { month: string; receitas: number; despesas: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { month: d.toLocaleDateString('pt-BR', { month: 'short' }), receitas: 0, despesas: 0 };
  }
  expenses.forEach((e) => {
    const d = new Date(e.createdAt);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (months[k]) months[k].despesas += e.amount;
  });
  incomes.forEach((i) => {
    const d = new Date(i.createdAt);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (months[k]) months[k].receitas += i.amount;
  });
  const areaData = Object.values(months);

  /* ── Category donut — filtered ── */
  const byCat = filteredExp.reduce<Record<string, number>>(
    (a, e) => ({ ...a, [e.category]: (a[e.category] || 0) + e.amount }), {}
  );
  const catData = Object.entries(byCat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  /* ── Recent transactions — filtered ── */
  const recent = [
    ...filteredExp.map((e) => ({ id: e.id, type: 'exp' as const, label: e.title, sub: e.category, amount: e.amount, date: e.createdAt })),
    ...filteredInc.map((i) => ({ id: i.id, type: 'inc' as const, label: i.description, sub: i.source, amount: i.amount, date: i.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  const card = (s: string): React.CSSProperties => ({
    background: s, borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '22px 24px',
  });

  const navBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer', color: '#64748b',
  };

  const isCurrentMonth = filterMonth === now.getMonth() && filterYear === now.getFullYear();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Month filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Dashboard</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Visão geral do seu financeiro</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            style={navBtn}
            onClick={() => { const p = prevMonth(filterMonth, filterYear); setFilterMonth(p.m); setFilterYear(p.y); }}
          ><ChevronLeft size={16} /></button>

          <div style={{ textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
              {MONTHS[filterMonth]}
            </div>
            <div style={{ fontSize: 11, color: '#475569' }}>{filterYear}</div>
          </div>

          <button
            style={navBtn}
            onClick={() => { const n = nextMonth(filterMonth, filterYear); setFilterMonth(n.m); setFilterYear(n.y); }}
          ><ChevronRight size={16} /></button>

          {!isCurrentMonth && (
            <button
              onClick={() => { setFilterMonth(now.getMonth()); setFilterYear(now.getFullYear()); }}
              style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8',
              }}
            >Hoje</button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          title="Total Receitas" value={fmt(totalInc)}
          sub={`${filteredInc.length} lançamento${filteredInc.length !== 1 ? 's' : ''}`}
          icon={<TrendingUp size={20} color="white" />}
          accent="#10b981" accentTo="#059669" delay={0}
        />
        <StatCard
          title="Total Despesas" value={fmt(totalExp)}
          sub={`${filteredExp.length} lançamento${filteredExp.length !== 1 ? 's' : ''}`}
          icon={<TrendingDown size={20} color="white" />}
          accent="#f43f5e" accentTo="#e11d48" delay={1}
        />
        <StatCard
          title="Saldo do Mês" value={fmt(balance)}
          sub={`Taxa de economia: ${savRate}%`}
          icon={<Wallet size={20} color="white" />}
          accent={balance >= 0 ? '#6366f1' : '#f43f5e'}
          accentTo={balance >= 0 ? '#8b5cf6' : '#e11d48'}
          delay={2}
        />
        <StatCard
          title="Total em Poupança" value={fmt(totalSaved)}
          sub={`${savings.length} ${savings.length === 1 ? 'reserva' : 'reservas'}`}
          icon={<PiggyBank size={20} color="white" />}
          accent="#22c55e" accentTo="#16a34a" delay={3}
        />
      </div>

      {/* ── Main row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Area chart — always shows last 6 months for trend */}
        <div className="fade-up fade-up-4" style={card('#0d1117')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Fluxo Financeiro</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Receitas vs Despesas — últimos 6 meses</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[{ label: 'Receitas', color: '#10b981' }, { label: 'Despesas', color: '#6366f1' }].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData} margin={{ left: -10, right: 4 }}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2.5} fill="url(#gInc)" dot={false} />
              <Area type="monotone" dataKey="despesas" stroke="#6366f1" strokeWidth={2.5} fill="url(#gExp)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category donut — filtered */}
        <div className="fade-up fade-up-4" style={card('#0d1117')}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Por Categoria</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
            {MONTHS[filterMonth]} {filterYear}
          </div>
          {catData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#374151', fontSize: 13 }}>
              Nenhum gasto neste mês
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={4} strokeWidth={0}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {catData.slice(0, 5).map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>{fmt(c.value)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent transactions — filtered ── */}
      <div className="fade-up fade-up-5" style={card('#0d1117')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Transações do Mês</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
              {MONTHS[filterMonth]} {filterYear}
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 500 }}>{recent.length} registros</div>
        </div>

        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#374151', fontSize: 13 }}>
            Nenhuma transação em {MONTHS[filterMonth]}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recent.map((t) => (
              <div
                key={`${t.type}-${t.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 12px', borderRadius: 12, transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.type === 'exp' ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)',
                  }}>
                    {t.type === 'exp'
                      ? <ArrowDownRight size={16} color="#f43f5e" />
                      : <ArrowUpRight size={16} color="#10b981" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                      {t.sub} · {new Date(t.date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.type === 'exp' ? '#f43f5e' : '#10b981' }}>
                  {t.type === 'exp' ? '-' : '+'}{fmt(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
