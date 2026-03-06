import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCcw, XCircle } from 'lucide-react';
import api from '../../api';
import LoadingState from '../../components/LoadingState';
import StructuredReport from '../../components/StructuredReport';

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

export default function WorkspaceEvaluations() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [selectedRunId, setSelectedRunId] = useState(null);
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
      setSelectedRunId((prev) => {
        if (!nextRuns.length) return null;
        if (prev && nextRuns.some((run) => run.id === prev)) return prev;
        return nextRuns[0].id;
      });
    } catch {
      setError('Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

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
          <p className="text-sm text-gray-500">Select an evaluation metadata button to open the full report.</p>
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
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {runs.map((run) => {
              const isActive = run.id === selectedRunId;
              return (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedRunId(run.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    isActive
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-900">
                      {statusIcon(run.status)}
                      {statusLabel(run.status)}
                    </div>
                    <span className="text-[11px] text-gray-500">{formatTime(run.createdAt)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-700">
                    <span>System: <strong>{run.systemId}</strong></span>
                    <span>Score: <strong>{run.score ?? '—'}</strong></span>
                    <span>Tier: <strong>{run.workspaceTier || '—'}</strong></span>
                    <span>Tokens: <strong>{run.insightTokensRemaining ?? run.creditsRemaining ?? '—'}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRun && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Evaluation Report</h2>
                  <p className="text-xs text-gray-500">Run: {selectedRun.id}</p>
                </div>
                <Link
                  to={`/app/ws/${workspaceId}/systems/${selectedRun.systemId}`}
                  className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open System
                </Link>
              </div>

              {selectedRun.error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {selectedRun.error}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <StructuredReport text={selectedRun.suggestions || 'No AI report was generated for this evaluation run.'} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
