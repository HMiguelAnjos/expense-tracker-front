import type { ReactNode } from 'react';

type Props = {
  title: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  accent: string;       // hex color e.g. '#6366f1'
  accentTo?: string;    // second gradient color
  delay?: number;
};

export default function StatCard({ title, value, sub, icon, accent, accentTo, delay = 0 }: Props) {
  const to = accentTo || accent;
  return (
    <div
      className={`fade-up fade-up-${delay + 1}`}
      style={{
        borderRadius: 20,
        padding: '24px 26px',
        background: `linear-gradient(145deg, ${accent}22 0%, ${to}10 100%)`,
        border: `1px solid ${accent}33`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${accent}25`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>{sub}</div>
          )}
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: `linear-gradient(135deg, ${accent}, ${to})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${accent}50`,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
