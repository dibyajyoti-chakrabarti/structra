import { Coins, Sparkles } from 'lucide-react';

export default function EvaluationConfirmModal({
  isOpen,
  tokensRemaining,
  onCancel,
  onConfirm,
  isSubmitting,
}) {
  if (!isOpen) return null;

  const remaining = Number.isFinite(Number(tokensRemaining)) ? Number(tokensRemaining) : 0;
  const noTokens = remaining <= 0;
  const nextRemaining = Math.max(remaining - 1, 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-lg bg-sky-50 p-2 text-sky-700">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Run AI Evaluation?</h2>
            <p className="mt-1 text-sm text-slate-600">
              One Insight Token is deducted immediately on confirmation. If the run is corrupted or Gemini returns no response, it is refunded.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Coins size={14} className="text-amber-500" />
              Tokens now
            </span>
            <span className="font-semibold">{remaining}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>After confirmation</span>
            <span>{nextRemaining}</span>
          </div>
        </div>

        {noTokens && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            No Insight Tokens remaining today. Tokens reset tomorrow.
          </p>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || noTokens}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!isSubmitting && <Sparkles size={13} />}
            {isSubmitting ? 'Running...' : 'Confirm Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
}
