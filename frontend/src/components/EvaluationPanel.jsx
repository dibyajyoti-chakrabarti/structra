import { Activity, Clock3, ExternalLink, Sparkles, XCircle } from 'lucide-react';
import InsightTokenIndicator from './InsightTokenIndicator';

const statusClass = (status) => {
  if (status === 'completed') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (status === 'failed') return 'text-red-700 bg-red-50 border-red-200';
  if (status === 'running') return 'text-blue-700 bg-blue-50 border-blue-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
};

const statusLabel = (status) => {
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'running') return 'Evaluating';
  return 'Queued';
};

const formatTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString();
};

const hasReportData = (run) =>
  Boolean(run?.suggestions) ||
  (Array.isArray(run?.results) && run.results.length > 0) ||
  (run?.summary && typeof run.summary === 'object' && Object.keys(run.summary).length > 0) ||
  Number.isFinite(run?.score);

const isCorruptedRun = (run) =>
  run?.status === 'failed' || (Boolean(run?.error) && !hasReportData(run));

export default function EvaluationPanel({
  insightTokensRemaining,
  onClose,
  onEvaluate,
  isEvaluateDisabled,
  isLoadingRuns,
  runs,
  onOpenRun,
}) {
  const hasRuns = Array.isArray(runs) && runs.length > 0;

  return (
    <aside className="canvas-evaluation-panel absolute top-0 right-0 z-40 flex h-full w-[380px] max-w-[92vw] flex-col border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Evaluation</p>
          <p className="text-xs text-gray-500">Run evaluation and view previous runs</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          title="Close evaluation panel"
        >
          <XCircle size={14} className="mx-auto" />
        </button>
      </div>

      <div className="space-y-3 border-b border-gray-200 p-4">
        <InsightTokenIndicator remaining={insightTokensRemaining} />
        <button
          type="button"
          onClick={onEvaluate}
          disabled={isEvaluateDisabled}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles size={14} />
          Evaluate
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Previous Evaluations</p>
          {isLoadingRuns && <Activity size={13} className="animate-pulse text-gray-400" />}
        </div>

        {!hasRuns && !isLoadingRuns && (
          <div className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">
            No evaluations for this canvas yet.
          </div>
        )}

        <div className="space-y-2">
          {(runs || []).map((run) => {
            const isCorrupted = isCorruptedRun(run);
            const canOpen = !run.isLocalPending && !isCorrupted;
            const badgeClass = isCorrupted ? 'text-red-700 bg-red-50 border-red-200' : statusClass(run.status);
            const badgeLabel = isCorrupted ? 'Corrupted' : statusLabel(run.status);
            return (
            <button
              key={run.id}
              type="button"
              onClick={() => canOpen && onOpenRun?.(run)}
              disabled={!canOpen}
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-gray-300 hover:bg-gray-50 disabled:cursor-default disabled:opacity-70"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                  {badgeLabel}
                </span>
                <span className="text-[11px] text-gray-500">{formatTime(run.createdAt)}</span>
              </div>
              <div className="mt-2 text-xs text-gray-700">
                <p>
                  Score: <span className="font-semibold">{run.score ?? '—'}</span>
                </p>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                {canOpen ? (
                  <>
                    Open full report <ExternalLink size={11} />
                  </>
                ) : (
                  <>{run.isLocalPending ? 'Evaluating...' : 'Corrupted - cannot open'}</>
                )}
              </div>
            </button>
          );
          })}
        </div>

        {isLoadingRuns && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500">
            <Clock3 size={12} /> Loading evaluations...
          </div>
        )}
      </div>
    </aside>
  );
}
