import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCcw, X, XCircle } from 'lucide-react';
import api from '../../api';
import LoadingState from '../../components/LoadingState';
import StructuredReport from '../../components/StructuredReport';
import { useTheme } from '../../contexts/ThemeContext';

const statusIcon = (status) => {
  if (status === 'completed') return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />;
  if (status === 'running') return <Activity size={14} className="text-blue-500" />;
  return <Clock3 size={14} className="text-amber-500" />;
};

const statusLabel = (status) => {
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'running') return 'Running';
  return 'Queued';
};

const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const isCorruptedRun = (run) =>
  run?.status === 'failed' || Boolean(run?.geminiError) || (Boolean(run?.error) && !run?.suggestions);

export default function WorkspaceEvaluations() {
  const { workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setError('');
      const [workspaceRes, evalRes] = await Promise.all([
        api.get(`workspaces/${workspaceId}/`, { cache: false }),
        api.get(`workspaces/${workspaceId}/evaluations/`, { cache: false }),
      ]);
      const nextRuns = Array.isArray(evalRes.data?.runs) ? evalRes.data.runs : [];
      setWorkspace(workspaceRes.data);
      setRuns(nextRuns);
      setActiveCount(Number(evalRes.data?.activeCount || 0));
      const requestedRunId = searchParams.get('runId');
      setSelectedRunId((prev) => {
        if (!nextRuns.length) return null;
        if (
          requestedRunId &&
          nextRuns.some((run) => run.id === requestedRunId && !isCorruptedRun(run))
        ) {
          return requestedRunId;
        }
        if (prev && nextRuns.some((run) => run.id === prev)) return prev;
        const firstOpenable = nextRuns.find((run) => !isCorruptedRun(run));
        return firstOpenable ? firstOpenable.id : nextRuns[0].id;
      });
      if (
        requestedRunId &&
        nextRuns.some((run) => run.id === requestedRunId && !isCorruptedRun(run))
      ) {
        setIsReportOpen(true);
      }
    } catch {
      setError('Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  }, [searchParams, workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeCount <= 0) return undefined;
    const timer = setInterval(loadData, 2500);
    return () => clearInterval(timer);
  }, [activeCount, loadData]);

  const completedCount = useMemo(
    () => runs.filter((run) => run.status === 'completed').length,
    [runs]
  );

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  if (loading) return <LoadingState message="Loading evaluations" minHeight={360} />;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{workspace?.name || workspaceId} Evaluations</h1>
          <p className="text-sm text-gray-500">Click any evaluation row to open its full report.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Workspace
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Runs</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{runs.length}</p>
        </div>
      </div>

      {error && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {runs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          No evaluation runs yet. Trigger one from any system canvas.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => {
            const corrupted = isCorruptedRun(run);
            const runStatusLabel = corrupted ? 'Corrupted' : statusLabel(run.status);
            return (
            <button
              key={run.id}
              type="button"
              onClick={() => {
                if (corrupted) return;
                setSelectedRunId(run.id);
                setIsReportOpen(true);
                setSearchParams((prevParams) => {
                  const nextParams = new URLSearchParams(prevParams);
                  nextParams.set('runId', run.id);
                  return nextParams;
                });
              }}
              disabled={corrupted}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-65"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                  {statusIcon(run.status)}
                  {runStatusLabel}
                </div>
                <span className="text-xs text-gray-500">{formatTime(run.createdAt)}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700 md:grid-cols-4">
                <span>System: <strong>{run.systemId}</strong></span>
                <span>Score: <strong>{run.score ?? '—'}</strong></span>
                <span>Tier: <strong>{run.workspaceTier || '—'}</strong></span>
                <span>Tokens: <strong>{run.insightTokensRemaining ?? run.creditsRemaining ?? '—'}</strong></span>
              </div>
              {corrupted && (
                <div className="mt-2 text-xs font-semibold text-red-600">Corrupted run. Report unavailable.</div>
              )}
            </button>
          );
          })}
        </div>
      )}

      {isReportOpen && selectedRun && !isCorruptedRun(selectedRun) && (
        <div
          className={`fixed inset-0 z-[100] flex items-start justify-center px-4 pb-4 pt-20 backdrop-blur-sm ${
            isDarkTheme ? 'bg-black/45' : 'bg-slate-900/35'
          }`}
          onClick={() => {
            setIsReportOpen(false);
            setSearchParams((prevParams) => {
              const nextParams = new URLSearchParams(prevParams);
              nextParams.delete('runId');
              return nextParams;
            });
          }}
        >
          <div
            className={`max-h-[calc(100vh-6rem)] w-full max-w-6xl overflow-hidden rounded-2xl border shadow-2xl ${
              isDarkTheme ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex items-start justify-between border-b px-6 py-5 ${
                isDarkTheme ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div>
                <h2 className={`text-xl font-semibold tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-slate-900'}`}>
                  Evaluation Report
                </h2>
                <p className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Run: {selectedRun.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReportOpen(false);
                  setSearchParams((prevParams) => {
                    const nextParams = new URLSearchParams(prevParams);
                    nextParams.delete('runId');
                    return nextParams;
                  });
                }}
                className={`rounded-lg border p-1.5 ${
                  isDarkTheme
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
                aria-label="Close report modal"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[calc(88vh-82px)] space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                <div className={`rounded-lg border px-3 py-2 ${isDarkTheme ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>Status: <strong className={isDarkTheme ? 'text-slate-100' : 'text-slate-900'}>{statusLabel(selectedRun.status)}</strong></div>
                <div className={`rounded-lg border px-3 py-2 ${isDarkTheme ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>System: <strong className={isDarkTheme ? 'text-slate-100' : 'text-slate-900'}>{selectedRun.systemId}</strong></div>
                <div className={`rounded-lg border px-3 py-2 ${isDarkTheme ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>Score: <strong className={isDarkTheme ? 'text-slate-100' : 'text-slate-900'}>{selectedRun.score ?? '—'}</strong></div>
                <div className={`rounded-lg border px-3 py-2 ${isDarkTheme ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>Tier: <strong className={isDarkTheme ? 'text-slate-100' : 'text-slate-900'}>{selectedRun.workspaceTier || '—'}</strong></div>
              </div>

              {selectedRun.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {selectedRun.error}
                </div>
              )}

              <div className={`rounded-xl border p-6 shadow-sm ${isDarkTheme ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <StructuredReport text={selectedRun.suggestions || 'No AI report was generated for this evaluation run.'} />
              </div>

              <div className="flex justify-end">
                <Link
                  to={`/app/ws/${workspaceId}/systems/${selectedRun.systemId}`}
                  className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open System
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
