type Props = {
  label: string;
  value: string | number;
  tone: 'healthy' | 'warning' | 'critical' | 'neutral';
  detail?: string;
};

const toneStyles: Record<Props['tone'], string> = {
  healthy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  neutral: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
};

export function HealthCard({ label, value, tone, detail }: Props) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-normal text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full border ${toneStyles[tone]}`} />
      </div>
      {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
    </section>
  );
}
