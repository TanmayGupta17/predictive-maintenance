type Props = {
  variant: 'loading' | 'error';
  message: string;
  onRetry?: () => void;
};

/**
 * Consistent full-width panel for loading and error states so a backend
 * outage surfaces a retry affordance instead of an indefinite spinner.
 */
export function StatePanel({ variant, message, onRetry }: Props) {
  const isError = variant === 'error';

  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-md border p-6 text-sm sm:flex-row sm:items-center sm:justify-between ${
        isError
          ? 'border-red-500/30 bg-red-500/5 text-red-200'
          : 'border-slate-800 bg-slate-900 text-slate-400'
      }`}
    >
      <div className="flex items-center gap-3">
        {isError ? (
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" aria-hidden />
        )}
        <span>{message}</span>
      </div>
      {isError && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/10"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
