import type { Alert } from '../types/domain';
import { formatDateTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';

type Props = {
  alerts: Alert[];
  title: string;
};

export function AlertsPanel({ alerts, title }: Props) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="divide-y divide-slate-800">
        {alerts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No alerts found.</p>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {alert.device?.name ?? alert.deviceId} / {formatDateTime(alert.createdAt)}
                  </p>
                </div>
                <StatusBadge value={alert.severity} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{alert.reason ?? alert.description}</p>
              {alert.confidenceScore !== null && alert.confidenceScore !== undefined ? (
                <p className="mt-2 text-xs text-slate-500">Confidence {alert.confidenceScore}%</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
