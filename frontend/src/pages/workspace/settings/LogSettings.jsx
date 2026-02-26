import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Search, Download, AlertCircle, CheckCircle, Clock, Filter, FileText, Activity, ShieldOff } from 'lucide-react';
import api from '../../../api';
import LoadingState from '../../../components/LoadingState';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
  .ls-root { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; }

  .ls-page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .ls-page-title { font-size: 18px; font-weight: 750; letter-spacing: -0.4px; color: var(--text); margin: 0 0 4px; }
  .ls-page-sub { font-size: 13px; color: var(--text-muted); margin: 0; }
  .ls-export-btn {
    height: 36px; padding: 0 14px;
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 8px;
    font-size: 13px; font-weight: 600; color: var(--text-muted);
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 7px;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
    white-space: nowrap; flex-shrink: 0;
  }
  .ls-export-btn:hover { border-color: var(--border-strong); color: var(--text); background: var(--surface-2); }

  .ls-section { margin-top: 20px; }
  .ls-section:first-of-type { margin-top: 0; }
  .ls-section-head { margin-bottom: 14px; }
  .ls-section-title { margin: 0; font-size: 15px; font-weight: 730; letter-spacing: -0.2px; color: var(--text); display: flex; align-items: center; gap: 8px; }
  .ls-section-sub { margin: 5px 0 0; font-size: 12.5px; color: var(--text-muted); }

  .ls-error {
    margin: 0 0 16px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
    font-size: 12.5px;
    font-weight: 600;
  }

  .ls-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 640px) { .ls-stats { grid-template-columns: 1fr; } }

  .ls-stat {
    background: var(--surface); border: 1.5px solid var(--border); border-radius: 11px; padding: 18px 20px;
    position: relative; overflow: hidden;
  }
  .ls-stat.red { border-color: rgba(239, 68, 68, 0.35); }
  .ls-stat.blue { border-color: var(--accent-2); }
  .ls-stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .ls-stat.default::before { background: var(--border); }
  .ls-stat.red::before { background: var(--danger); }
  .ls-stat.blue::before { background: var(--accent); }
  .ls-stat-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-subtle); margin: 0 0 8px; }
  .ls-stat.red .ls-stat-label { color: var(--danger); }
  .ls-stat.blue .ls-stat-label { color: var(--accent-2); }
  .ls-stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.8px; color: var(--text); margin: 0; }
  .ls-stat.red .ls-stat-value { color: var(--danger); }
  .ls-stat.blue .ls-stat-value { color: var(--accent); }

  .ls-filters { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .ls-filter-input-wrap { flex: 1; min-width: 220px; position: relative; }
  .ls-filter-input-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); pointer-events: none; }
  .ls-filter-input {
    width: 100%; height: 38px; padding: 0 14px 0 34px;
    border: 1.5px solid var(--border); border-radius: 8px;
    font-size: 13px; font-family: inherit; background: var(--surface);
    color: var(--text); outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ls-filter-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .ls-filter-input::placeholder { color: var(--text-subtle); }

  .ls-filter-select-wrap { position: relative; min-width: 150px; }
  .ls-filter-select-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-subtle); pointer-events: none; }
  .ls-filter-select {
    width: 100%; height: 38px; padding: 0 14px 0 34px;
    border: 1.5px solid var(--border); border-radius: 8px;
    font-size: 13px; font-family: inherit; background: var(--surface);
    color: var(--text); outline: none; appearance: none; cursor: pointer;
    transition: border-color 0.15s;
  }
  .ls-filter-select:focus { border-color: var(--accent); }

  .ls-table-card { background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; }

  .ls-table-head {
    display: grid; grid-template-columns: 2.5fr 1.5fr 1fr auto;
    padding: 10px 18px; border-bottom: 1.5px solid var(--border);
    background: var(--surface-2);
  }
  .ls-table-head-cell { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-subtle); }
  .ls-table-head-cell.right { text-align: right; }
  @media (max-width: 640px) { .ls-table-head { display: none; } }

  .ls-table-row {
    display: grid; grid-template-columns: 2.5fr 1.5fr 1fr auto;
    padding: 13px 18px; border-bottom: 1.5px solid var(--border);
    transition: background 0.1s; align-items: center; gap: 12px;
  }
  .ls-table-row:last-child { border-bottom: none; }
  .ls-table-row:hover { background: var(--surface-2); }
  @media (max-width: 640px) {
    .ls-table-row { grid-template-columns: 1fr; gap: 6px; padding: 14px 16px; }
  }

  .ls-activity-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .ls-activity-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ls-activity-icon.neutral { background: var(--surface-2); color: var(--text-muted); }
  .ls-activity-icon.error { background: rgba(239, 68, 68, 0.12); color: var(--danger); }
  .ls-activity-icon.warning { background: rgba(251, 191, 36, 0.14); color: var(--warning); }
  .ls-activity-icon.success { background: rgba(22, 163, 74, 0.14); color: #16a34a; }

  .ls-action { font-size: 13.5px; font-weight: 650; color: var(--text); letter-spacing: -0.1px; }
  .ls-target { font-size: 12px; color: var(--text-subtle); margin-top: 2px; }

  .ls-user-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .ls-user-avatar {
    width: 24px; height: 24px; border-radius: 6px;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 10.5px; font-weight: 800; flex-shrink: 0;
  }
  .ls-user-name { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .ls-date-cell { display: flex; flex-direction: column; }
  .ls-date-main { font-size: 13px; font-weight: 500; color: var(--text); }
  .ls-date-sub { font-size: 11.5px; color: var(--text-subtle); margin-top: 1px; }

  .ls-status-cell { display: flex; justify-content: flex-end; }
  .ls-status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px; border: 1.5px solid;
    font-size: 11.5px; font-weight: 700; white-space: nowrap;
  }
  .ls-status-badge.success { background: rgba(22, 163, 74, 0.14); border-color: rgba(22, 163, 74, 0.35); color: #16a34a; }
  .ls-status-badge.error { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.35); color: var(--danger); }
  .ls-status-badge.warning { background: rgba(251, 191, 36, 0.14); border-color: rgba(251, 191, 36, 0.35); color: var(--warning); }

  .ls-empty {
    padding: 26px 18px;
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    background: var(--surface);
  }

  .ls-table-footer {
    padding: 13px 18px; border-top: 1.5px solid var(--border);
    background: var(--surface-2); text-align: center;
    font-size: 12px;
    color: var(--text-subtle);
  }

  .ls-restricted {
    background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.35);
    border-radius: 12px; padding: 24px;
  }
  .ls-restricted-title { font-size: 14.5px; font-weight: 750; color: var(--danger); margin: 0 0 6px; display: flex; align-items: center; gap: 8px; }
  .ls-restricted-sub { font-size: 13px; color: var(--danger); margin: 0 0 16px; opacity: 0.8; }
  .ls-restricted-btn {
    height: 36px; padding: 0 14px;
    background: var(--surface); border: 1.5px solid rgba(239, 68, 68, 0.35); border-radius: 8px;
    font-size: 13px; font-weight: 600; color: var(--danger);
    cursor: pointer; font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .ls-restricted-btn:hover { background: var(--danger); color: #fff; }
`;

const formatDateParts = (iso) => {
  const createdAt = new Date(iso);
  if (Number.isNaN(createdAt.getTime())) {
    return { date: '-', time: '-' };
  }

  const now = new Date();
  const sameDay = createdAt.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  let dateLabel = createdAt.toLocaleDateString();
  if (sameDay) dateLabel = 'Today';
  if (createdAt.toDateString() === yesterday.toDateString()) dateLabel = 'Yesterday';

  const timeLabel = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { date: dateLabel, time: timeLabel };
};

const toLogRow = (raw) => {
  const dateParts = formatDateParts(raw.created_at);
  return {
    id: raw.id,
    action: raw.action || 'Untitled event',
    target: raw.target_name || raw.message || 'N/A',
    user: raw.actor_name || 'System',
    status: raw.status || 'success',
    system: raw.system_name || null,
    date: dateParts.date,
    time: dateParts.time,
  };
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'success':
      return <CheckCircle size={13} />;
    case 'error':
      return <AlertCircle size={13} />;
    case 'warning':
      return <Clock size={13} />;
    default:
      return <Activity size={13} />;
  }
};

const getIconVariant = (status) => {
  switch (status) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'neutral';
  }
};

const emptySummary = { total_events_30d: 0, failed_actions_30d: 0, active_users_30d: 0 };

const LogStats = ({ summary }) => (
  <div className="ls-stats">
    <div className="ls-stat default">
      <p className="ls-stat-label">Total Events (30d)</p>
      <p className="ls-stat-value">{summary.total_events_30d.toLocaleString()}</p>
    </div>
    <div className="ls-stat red">
      <p className="ls-stat-label">Failed Actions</p>
      <p className="ls-stat-value">{summary.failed_actions_30d}</p>
    </div>
    <div className="ls-stat blue">
      <p className="ls-stat-label">Active Users</p>
      <p className="ls-stat-value">{summary.active_users_30d}</p>
    </div>
  </div>
);

const LogTable = ({ logs, showSystemColumn = false }) => {
  if (!logs.length) {
    return <div className="ls-empty">No events match the selected filters.</div>;
  }

  return (
    <>
      <div className="ls-table-head">
        <div className="ls-table-head-cell">Activity</div>
        <div className="ls-table-head-cell">User</div>
        <div className="ls-table-head-cell">Date</div>
        <div className="ls-table-head-cell right">Status</div>
      </div>

      {logs.map((log) => (
        <div key={log.id} className="ls-table-row">
          <div className="ls-activity-cell">
            <div className={`ls-activity-icon ${getIconVariant(log.status)}`}>
              <FileText size={15} />
            </div>
            <div>
              <div className="ls-action">{log.action}</div>
              <div className="ls-target">
                {showSystemColumn && log.system ? `System: ${log.system} - ` : ''}
                Target: {log.target}
              </div>
            </div>
          </div>

          <div className="ls-user-cell">
            <div className="ls-user-avatar">{log.user[0] || 'S'}</div>
            <span className="ls-user-name">{log.user}</span>
          </div>

          <div className="ls-date-cell">
            <span className="ls-date-main">{log.date}</span>
            <span className="ls-date-sub">{log.time}</span>
          </div>

          <div className="ls-status-cell">
            <span className={`ls-status-badge ${log.status}`}>
              {getStatusIcon(log.status)}
              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
            </span>
          </div>
        </div>
      ))}

      <div className="ls-table-footer">Showing latest {logs.length} events</div>
    </>
  );
};

const parseApiError = (error) => error?.response?.data?.detail || 'Failed to load audit logs.';

const exportCsv = (workspaceRows, systemRows) => {
  const headers = ['section', 'action', 'target', 'user', 'status', 'system', 'date', 'time'];
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

  const rows = [
    ...workspaceRows.map((row) => ['workspace', row.action, row.target, row.user, row.status, row.system || '', row.date, row.time]),
    ...systemRows.map((row) => ['system', row.action, row.target, row.user, row.status, row.system || '', row.date, row.time]),
  ];

  const csvContent = [headers, ...rows].map((cols) => cols.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workspace-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const LogSettings = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { isAdmin } = useOutletContext();

  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [workspaceQuery, setWorkspaceQuery] = useState('');

  const [systemFilter, setSystemFilter] = useState('all');
  const [systemQuery, setSystemQuery] = useState('');
  const [systemName, setSystemName] = useState('all');

  const [workspaceLogs, setWorkspaceLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [workspaceSummary, setWorkspaceSummary] = useState(emptySummary);
  const [systemSummary, setSystemSummary] = useState(emptySummary);
  const [systems, setSystems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const fetchSystems = async () => {
      try {
        const res = await api.get(`workspaces/${workspaceId}/audit/systems/`);
        if (ignore) return;
        setSystems(res.data || []);
      } catch (e) {
        if (!ignore) setError(parseApiError(e));
      }
    };

    fetchSystems();
    return () => {
      ignore = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    const fetchWorkspaceSection = async () => {
      const params = { scope: 'workspace', limit: 200 };
      if (workspaceFilter !== 'all') params.category = workspaceFilter;
      if (workspaceQuery.trim()) params.q = workspaceQuery.trim();

      const [summaryRes, logsRes] = await Promise.all([
        api.get(`workspaces/${workspaceId}/audit/summary/`, { params }),
        api.get(`workspaces/${workspaceId}/audit/logs/`, { params }),
      ]);

      if (ignore) return;
      setWorkspaceSummary(summaryRes.data || emptySummary);
      setWorkspaceLogs((logsRes.data || []).map(toLogRow));
    };

    const fetchSystemSection = async () => {
      const params = { scope: 'system', limit: 200 };
      if (systemFilter !== 'all') params.category = systemFilter;
      if (systemQuery.trim()) params.q = systemQuery.trim();
      if (systemName !== 'all') params.system_id = systemName;

      const [summaryRes, logsRes] = await Promise.all([
        api.get(`workspaces/${workspaceId}/audit/summary/`, { params }),
        api.get(`workspaces/${workspaceId}/audit/logs/`, { params }),
      ]);

      if (ignore) return;
      setSystemSummary(summaryRes.data || emptySummary);
      setSystemLogs((logsRes.data || []).map(toLogRow));
    };

    Promise.all([fetchWorkspaceSection(), fetchSystemSection()])
      .then(() => {
        if (!ignore) setError('');
      })
      .catch((e) => {
        if (!ignore) setError(parseApiError(e));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [workspaceId, workspaceFilter, workspaceQuery, systemFilter, systemQuery, systemName]);

  const availableSystems = useMemo(
    () => [{ id: 'all', name: 'All Systems' }, ...systems],
    [systems],
  );

  if (!isAdmin) {
    return (
      <div>
        <style>{styles}</style>
        <div className="ls-restricted">
          <h2 className="ls-restricted-title"><ShieldOff size={16} /> Access Restricted</h2>
          <p className="ls-restricted-sub">Audit logs are only accessible to workspace admins.</p>
          <button className="ls-restricted-btn" onClick={() => navigate(`/app/ws/${workspaceId}/settings`)}>
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ls-root">
        <style>{styles}</style>
        <LoadingState message="Loading audit logs" minHeight={340} />
      </div>
    );
  }

  return (
    <div className="ls-root">
      <style>{styles}</style>

      <div className="ls-page-head">
        <div>
          <h2 className="ls-page-title">Audit Logs</h2>
          <p className="ls-page-sub">Track workspace activity and monitor system-specific operational changes.</p>
        </div>
        <button className="ls-export-btn" onClick={() => exportCsv(workspaceLogs, systemLogs)}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error && <div className="ls-error">{error}</div>}

      <section className="ls-section">
        <div className="ls-section-head">
          <h3 className="ls-section-title"><Activity size={15} /> Workspace Logs</h3>
          <p className="ls-section-sub">Member actions and workspace-level configuration events.</p>
        </div>

        <LogStats summary={workspaceSummary} />

        <div className="ls-filters">
          <div className="ls-filter-input-wrap">
            <Search size={14} className="ls-filter-input-icon" />
            <input
              className="ls-filter-input"
              type="text"
              value={workspaceQuery}
              onChange={(e) => setWorkspaceQuery(e.target.value)}
              placeholder="Search by user, action, or resource..."
            />
          </div>
          <div className="ls-filter-select-wrap">
            <Filter size={14} className="ls-filter-select-icon" />
            <select
              className="ls-filter-select"
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
            >
              <option value="all">All Events</option>
              <option value="security">Security</option>
              <option value="workspace">Workspace</option>
              <option value="user">User Actions</option>
              <option value="system">System</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        <div className="ls-table-card">
          <LogTable logs={workspaceLogs} />
        </div>
      </section>

      <section className="ls-section">
        <div className="ls-section-head">
          <h3 className="ls-section-title"><FileText size={15} /> System Logs</h3>
          <p className="ls-section-sub">Runtime and service events grouped by system inside this workspace.</p>
        </div>

        <LogStats summary={systemSummary} />

        <div className="ls-filters">
          <div className="ls-filter-input-wrap">
            <Search size={14} className="ls-filter-input-icon" />
            <input
              className="ls-filter-input"
              type="text"
              value={systemQuery}
              onChange={(e) => setSystemQuery(e.target.value)}
              placeholder="Search by system, action, user, or target..."
            />
          </div>

          <div className="ls-filter-select-wrap">
            <Filter size={14} className="ls-filter-select-icon" />
            <select
              className="ls-filter-select"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
            >
              {availableSystems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ls-filter-select-wrap">
            <Filter size={14} className="ls-filter-select-icon" />
            <select
              className="ls-filter-select"
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
            >
              <option value="all">All Event Types</option>
              <option value="security">Security</option>
              <option value="system">System</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        <div className="ls-table-card">
          <LogTable logs={systemLogs} showSystemColumn />
        </div>
      </section>
    </div>
  );
};

export default LogSettings;
