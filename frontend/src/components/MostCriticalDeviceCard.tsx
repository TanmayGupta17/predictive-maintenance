import { Link } from 'react-router-dom';

import type { MostCriticalDevice, RiskLevel } from '../types/domain';
import { StatusBadge } from './StatusBadge';

type Props = {
  device: MostCriticalDevice | null;
};

const riskStyles: Record<RiskLevel, string> = {
  LOW: 'text-emerald-300',
  MODERATE: 'text-cyan-300',
  HIGH: 'text-amber-300',
  CRITICAL: 'text-red-300',
};

export function MostCriticalDeviceCard({ device }: Props) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Most Critical Device</h2>
      </div>
      {device === null ? (
        <p className="px-4 py-6 text-sm text-slate-500">No devices monitored.</p>
      ) : (
        <div className="space-y-4 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                to={`/devices/${device.device.id}`}
                className="font-medium text-cyan-300 hover:text-cyan-200"
              >
                {device.device.name}
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                {device.device.type} / {device.device.location}
              </p>
            </div>
            <StatusBadge value={device.device.status} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs uppercase tracking-normal text-slate-500">Health</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{device.healthScore}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-normal text-slate-500">Risk</p>
              <p className={`mt-1 text-xl font-semibold ${riskStyles[device.riskLevel]}`}>
                {device.riskLevel}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-normal text-slate-500">Active Alerts</p>
              <p className="mt-1 text-xl font-semibold text-slate-50">{device.activeAlertCount}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
