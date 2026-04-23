import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-indigo-600">💰 FinanceApp</span>
          <nav className="flex gap-2">
            <NavLink to="/" end className={navClass}>
              <LayoutDashboard size={16} />
              Dashboard
            </NavLink>
            <NavLink to="/expenses" className={navClass}>
              <ArrowDownCircle size={16} />
              Despesas
            </NavLink>
            <NavLink to="/incomes" className={navClass}>
              <ArrowUpCircle size={16} />
              Receitas
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
