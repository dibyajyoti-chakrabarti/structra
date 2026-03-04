import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCcw, XCircle } from 'lucide-react';
import api from '../../api';
import LoadingState from '../../components/LoadingState';

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
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setError('');
      const [workspaceRes, evalRes] = await Promise.all([
        api.get(`workspaces/${workspaceId}/`, { cache: false }),
        api.get(`workspaces/${workspaceId}/evaluations/`, { cache: false }),
      ]);
      setWorkspace(workspaceRes.data);
      setRuns(Array.isArray(evalRes.data?.runs) ? evalRes.data.runs : []);
      setActiveCount(Number(evalRes.data?.activeCount || 0));
    } catch {
      setError('Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  useEffect(() => {
    if (activeCount <= 0) return undefined;
    const timer = setInterval(loadData, 2500);
    return () => clearInterval(timer);
  }, [activeCount, workspaceId]);

  const completedCount = useMemo(
    () => runs.filter((run) => run.status === 'completed').length,
    [runs]
  );

  if (loading) return <LoadingState message="Loading evaluations" minHeight={360} />;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{workspace?.name || workspaceId} Evaluations</h1>
          <p className="text-sm text-gray-500">Background evaluation runs across systems in this workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate(`/app/ws/${workspaceId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Workspace
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Runs</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{runs.length}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 inline-flex items-center gap-2">
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
          {runs.map((run) => (
            <div key={run.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {statusIcon(run.status)}
                  <span className="text-sm font-semibold text-gray-900">{statusLabel(run.status)}</span>
                  <span className="text-xs text-gray-500">System: {run.systemId}</span>
                </div>
                <div className="text-xs text-gray-500">{formatTime(run.createdAt)}</div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="text-gray-500">Score</p>
                  <p className="text-sm font-semibold text-gray-900">{run.score ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="text-gray-500">Tier</p>
                  <p className="text-sm font-semibold text-gray-900">{run.workspaceTier || '—'}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2.5">
                  <p className="text-gray-500">Credits Remaining</p>
                  <p className="text-sm font-semibold text-gray-900">{run.creditsRemaining ?? '—'}</p>
                </div>
              </div>

              {run.error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  {run.error}
                </div>
              )}

              {run.suggestions && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-xs text-gray-700 whitespace-pre-wrap break-words">
                  {run.suggestions.slice(0, 500)}{run.suggestions.length > 500 ? '…' : ''}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Link
                  to={`/app/ws/${workspaceId}/systems/${run.systemId}`}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Open System
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
