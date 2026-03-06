import { Sparkles } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-gray-900/40 p-3 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-lg bg-sky-50 p-2 text-sky-700">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Run AI Evaluation?</h2>
            <p className="mt-1 text-sm text-gray-600">
              This will generate architecture suggestions using AI and consume <span className="font-semibold">1 Insight Token</span>.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
          Insight Tokens Remaining: <span className="font-semibold">{remaining}</span>
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
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || noTokens}
            className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Running...' : 'Confirm Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
}
