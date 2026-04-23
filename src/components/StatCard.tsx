type Props = {
  title: string;
  value: string;
  color: 'green' | 'red' | 'indigo';
  icon: React.ReactNode;
};

const colorMap = {
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

export default function StatCard({ title, value, color, icon }: Props) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${colorMap[color]}`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
