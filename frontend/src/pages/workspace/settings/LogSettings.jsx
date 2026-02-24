import React, { useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Search, Download, AlertCircle, CheckCircle, Clock, Filter, FileText, Activity, ShieldOff } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
  .ls-root { font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif; }

  .ls-page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
  .ls-page-title { font-size: 18px; font-weight: 750; letter-spacing: -0.4px; color: #0a0a0a; margin: 0 0 4px; }
  .ls-page-sub { font-size: 13px; color: #64748b; margin: 0; }
  .ls-export-btn {
    height: 36px; padding: 0 14px;
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-weight: 600; color: #475569;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; gap: 7px;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
    white-space: nowrap; flex-shrink: 0;
  }
  .ls-export-btn:hover { border-color: #cbd5e1; color: #0a0a0a; background: #f8fafc; }

  /* Stats */
  .ls-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  @media (max-width: 640px) { .ls-stats { grid-template-columns: 1fr; } }

  .ls-stat {
    background: #fff; border: 1.5px solid #e2e8f0; border-radius: 11px; padding: 18px 20px;
    position: relative; overflow: hidden;
  }
  .ls-stat.red { border-color: #fecaca; }
  .ls-stat.blue { border-color: #bfdbfe; }
  .ls-stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .ls-stat.default::before { background: #e2e8f0; }
  .ls-stat.red::before { background: #dc2626; }
  .ls-stat.blue::before { background: #2563eb; }
  .ls-stat-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 8px; }
  .ls-stat.red .ls-stat-label { color: #f87171; }
  .ls-stat.blue .ls-stat-label { color: #60a5fa; }
  .ls-stat-value { font-size: 26px; font-weight: 800; letter-spacing: -0.8px; color: #0a0a0a; margin: 0; }
  .ls-stat.red .ls-stat-value { color: #dc2626; }
  .ls-stat.blue .ls-stat-value { color: #2563eb; }

  /* Filters */
  .ls-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .ls-filter-input-wrap { flex: 1; min-width: 200px; position: relative; }
  .ls-filter-input-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .ls-filter-input {
    width: 100%; height: 38px; padding: 0 14px 0 34px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-family: inherit; background: #fff;
    color: #0a0a0a; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ls-filter-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .ls-filter-input::placeholder { color: #94a3b8; }

  .ls-filter-select-wrap { position: relative; min-width: 160px; }
  .ls-filter-select-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .ls-filter-select {
    width: 100%; height: 38px; padding: 0 14px 0 34px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 13px; font-family: inherit; background: #fff;
    color: #1e293b; outline: none; appearance: none; cursor: pointer;
    transition: border-color 0.15s;
  }
  .ls-filter-select:focus { border-color: #2563eb; }

  /* Table */
  .ls-table-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; }

  .ls-table-head {
    display: grid; grid-template-columns: 2.5fr 1.5fr 1fr auto;
    padding: 10px 18px; border-bottom: 1.5px solid #f1f5f9;
    background: #fafafa;
  }
  .ls-table-head-cell { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; }
  .ls-table-head-cell.right { text-align: right; }
  @media (max-width: 640px) { .ls-table-head { display: none; } }

  .ls-table-row {
    display: grid; grid-template-columns: 2.5fr 1.5fr 1fr auto;
    padding: 13px 18px; border-bottom: 1.5px solid #f8fafc;
    transition: background 0.1s; align-items: center; gap: 12px;
  }
  .ls-table-row:last-child { border-bottom: none; }
  .ls-table-row:hover { background: #fafcff; }
  @media (max-width: 640px) {
    .ls-table-row { grid-template-columns: 1fr; gap: 6px; padding: 14px 16px; }
  }

  .ls-activity-cell { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .ls-activity-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ls-activity-icon.neutral { background: #f1f5f9; color: #64748b; }
  .ls-activity-icon.error { background: #fef2f2; color: #dc2626; }
  .ls-activity-icon.warning { background: #fef9c3; color: #b45309; }
  .ls-activity-icon.success { background: #ecfdf5; color: #16a34a; }

  .ls-action { font-size: 13.5px; font-weight: 650; color: #0a0a0a; letter-spacing: -0.1px; }
  .ls-target { font-size: 12px; color: #94a3b8; margin-top: 2px; }

  .ls-user-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .ls-user-avatar {
    width: 24px; height: 24px; border-radius: 6px;
    background: #eff6ff; color: #1d4ed8;
    display: flex; align-items: center; justify-content: center;
    font-size: 10.5px; font-weight: 800; flex-shrink: 0;
  }
  .ls-user-name { font-size: 13px; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .ls-date-cell { display: flex; flex-direction: column; }
  .ls-date-main { font-size: 13px; font-weight: 500; color: #1e293b; }
  .ls-date-sub { font-size: 11.5px; color: #94a3b8; margin-top: 1px; }

  .ls-status-cell { display: flex; justify-content: flex-end; }
  .ls-status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px; border: 1.5px solid;
    font-size: 11.5px; font-weight: 700; white-space: nowrap;
  }
  .ls-status-badge.success { background: #ecfdf5; border-color: #bbf7d0; color: #15803d; }
  .ls-status-badge.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .ls-status-badge.warning { background: #fef9c3; border-color: #fde68a; color: #854d0e; }

  .ls-table-footer {
    padding: 13px 18px; border-top: 1.5px solid #f1f5f9;
    background: #fafafa; text-align: center;
  }
  .ls-load-more {
    background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 650;
    color: #64748b; transition: color 0.1s;
  }
  .ls-load-more:hover { color: #0a0a0a; }

  /* Access restricted */
  .ls-restricted {
    background: #fef2f2; border: 1.5px solid #fecaca;
    border-radius: 12px; padding: 24px;
  }
  .ls-restricted-title { font-size: 14.5px; font-weight: 750; color: #dc2626; margin: 0 0 6px; display: flex; align-items: center; gap: 8px; }
  .ls-restricted-sub { font-size: 13px; color: #b91c1c; margin: 0 0 16px; }
  .ls-restricted-btn {
    height: 36px; padding: 0 14px;
    background: #fff; border: 1.5px solid #fca5a5; border-radius: 8px;
    font-size: 13px; font-weight: 600; color: #dc2626;
    cursor: pointer; font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .ls-restricted-btn:hover { background: #dc2626; color: #fff; }
`;

const logs = [
  { id: 1, action: 'System Created', target: 'Supply Chain Model', user: 'Alex Rivera', time: '10:42 AM', date: 'Today', status: 'success' },
  { id: 2, action: 'Permission Updated', target: 'Financial Pipeline', user: 'Jordan Smyth', time: '09:15 AM', date: 'Today', status: 'success' },
  { id: 3, action: 'Failed Login Attempt', target: 'N/A', user: 'Unknown IP', time: '02:30 AM', date: 'Today', status: 'error' },
  { id: 4, action: 'Workspace Renamed', target: 'Structra Engineering', user: 'Alex Rivera', time: '4:50 PM', date: 'Yesterday', status: 'success' },
  { id: 5, action: 'Member Removed', target: 'Sam Chen', user: 'Alex Rivera', time: '11:20 AM', date: 'Yesterday', status: 'warning' },
];

const LogSettings = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { isAdmin } = useOutletContext();
  const [filter, setFilter] = useState('all');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={13} />;
      case 'error': return <AlertCircle size={13} />;
      case 'warning': return <Clock size={13} />;
      default: return <Activity size={13} />;
    }
  };

  const getIconVariant = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'neutral';
    }
  };

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

  return (
    <div className="ls-root">
      <style>{styles}</style>

      <div className="ls-page-head">
        <div>
          <h2 className="ls-page-title">Audit Logs</h2>
          <p className="ls-page-sub">Track all activities and system changes within this workspace.</p>
        </div>
        <button className="ls-export-btn">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="ls-stats">
        <div className="ls-stat default">
          <p className="ls-stat-label">Total Events (30d)</p>
          <p className="ls-stat-value">2,845</p>
        </div>
        <div className="ls-stat red">
          <p className="ls-stat-label">Failed Actions</p>
          <p className="ls-stat-value">12</p>
        </div>
        <div className="ls-stat blue">
          <p className="ls-stat-label">Active Users</p>
          <p className="ls-stat-value">8</p>
        </div>
      </div>

      <div className="ls-filters">
        <div className="ls-filter-input-wrap">
          <Search size={14} className="ls-filter-input-icon" />
          <input
            className="ls-filter-input"
            type="text"
            placeholder="Search by user, action, or resource…"
          />
        </div>
        <div className="ls-filter-select-wrap">
          <Filter size={14} className="ls-filter-select-icon" />
          <select
            className="ls-filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="security">Security</option>
            <option value="system">System</option>
            <option value="user">User Actions</option>
          </select>
        </div>
      </div>

      <div className="ls-table-card">
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
                <div className="ls-target">Target: {log.target}</div>
              </div>
            </div>

            <div className="ls-user-cell">
              <div className="ls-user-avatar">{log.user[0]}</div>
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

        <div className="ls-table-footer">
          <button className="ls-load-more">Load more events</button>
        </div>
      </div>
    </div>
  );
};

export default LogSettings;