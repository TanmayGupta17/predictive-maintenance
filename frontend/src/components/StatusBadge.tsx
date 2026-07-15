import type { AlertSeverity, DeviceStatus } from '../types/domain';

const statusStyles: Record<DeviceStatus, string> = {
  ONLINE: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  WARNING: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  CRITICAL: 'border-red-500/40 bg-red-500/10 text-red-300',
  OFFLINE: 'border-slate-500/40 bg-slate-600/20 text-slate-300',
  MAINTENANCE: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  DECOMMISSIONED: 'border-zinc-500/40 bg-zinc-600/20 text-zinc-300',
};

const severityStyles: Record<AlertSeverity, string> = {
  INFO: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  WARNING: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  CRITICAL: 'border-red-500/40 bg-red-500/10 text-red-300',
};

type Props = {
  value: DeviceStatus | AlertSeverity;
};

export function StatusBadge({ value }: Props) {
  const styles =
    value in statusStyles
      ? statusStyles[value as DeviceStatus]
      : severityStyles[value as AlertSeverity];

  return (
    <span className={`inline-flex h-6 items-center rounded border px-2 text-xs font-medium ${styles}`}>
      {value}
    </span>
  );
}
