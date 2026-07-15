import { NavLink, Outlet } from 'react-router-dom';

import { useRealtimeContext } from '../context/RealtimeContext';

const navItems = [
  { label: 'Fleet Overview', to: '/dashboard' },
  { label: 'Devices', to: '/devices' },
  { label: 'Alerts', to: '/alerts' },
];

export function MainLayout() {
  const { connected } = useRealtimeContext();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-semibold text-slate-50">Predictive Maintenance</h1>
              <p className="text-xs text-slate-500">Industrial monitoring operations console</p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                connected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-600/40 bg-slate-700/20 text-slate-400'
              }`}
              title={connected ? 'Realtime stream connected' : 'Realtime stream disconnected'}
            >
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-500'}`}
                aria-hidden
              />
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
          <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md border px-3 py-2 text-sm ${
                  isActive
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-800 text-slate-300 hover:bg-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}
