import type { RiskDistribution as RiskDistributionData, RiskLevel } from '../types/domain';

type Props = {
  distribution: RiskDistributionData;
};

const levels: Array<{ key: RiskLevel; label: string; bar: string; dot: string }> = [
  { key: 'LOW', label: 'Low', bar: 'bg-emerald-500', dot: 'bg-emerald-400' },
  { key: 'MODERATE', label: 'Moderate', bar: 'bg-cyan-500', dot: 'bg-cyan-400' },
  { key: 'HIGH', label: 'High', bar: 'bg-amber-500', dot: 'bg-amber-400' },
  { key: 'CRITICAL', label: 'Critical', bar: 'bg-red-500', dot: 'bg-red-400' },
];

export function RiskDistribution({ distribution }: Props) {
  const total = distribution.total;

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Prediction Risk Distribution</h2>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          {total === 0
            ? null
            : levels.map((level) => {
                const count = distribution[level.key];
                if (count === 0) {
                  return null;
                }
                return (
                  <div
                    key={level.key}
                    className={level.bar}
                    style={{ width: `${(count / total) * 100}%` }}
                    title={`${level.label}: ${count}`}
                  />
                );
              })}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {levels.map((level) => (
            <div key={level.key} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${level.dot}`} aria-hidden />
              <div>
                <p className="text-lg font-semibold text-slate-50">{distribution[level.key]}</p>
                <p className="text-xs text-slate-500">{level.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
