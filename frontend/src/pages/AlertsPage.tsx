import { useCallback, useEffect, useState } from 'react';

import { getActiveAlerts, getAlertHistory } from '../api/alerts';
import { AlertsPanel } from '../components/AlertsPanel';
import { StatePanel } from '../components/StatePanel';
import type { Alert } from '../types/domain';

export function AlertsPage() {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<Alert[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    try {
      const [active, resolved] = await Promise.all([getActiveAlerts(), getAlertHistory()]);
      setActiveAlerts(active.data);
      setResolvedAlerts(resolved.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Alerts</h2>
        <p className="text-sm text-slate-500">Active predictive maintenance alerts and resolved alert history.</p>
      </div>
      {status === 'loading' ? (
        <StatePanel variant="loading" message="Loading alerts." />
      ) : status === 'error' ? (
        <StatePanel
          variant="error"
          message="Could not load alerts. The monitoring service may be unavailable."
          onRetry={() => void load()}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <AlertsPanel alerts={activeAlerts} title="Active Alerts" />
          <AlertsPanel alerts={resolvedAlerts} title="Alert Timeline" />
        </div>
      )}
    </div>
  );
}
