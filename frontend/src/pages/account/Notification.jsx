import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, AlertTriangle, X, XCircle } from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import api from '../../api';

const iconByStatus = {
  success: CheckCheck,
  warning: AlertTriangle,
  error: XCircle,
};

const toRelativeTime = (isoDate) => {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return '-';

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 2 * day) return 'Yesterday';
  return `${Math.floor(diffMs / day)}d ago`;
};

const parseError = (error) => error?.response?.data?.detail || 'Failed to load notifications.';

export function NotificationDrawer({ isOpen, onClose, onUnreadCountChange }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const syncUnreadCount = useCallback((count) => {
    setUnreadCount(count);
    if (onUnreadCountChange) onUnreadCountChange(count);
  }, [onUnreadCountChange]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('notifications/feed/', { params: { limit: 80 } });
      const feedItems = response.data?.items || [];
      const unread = response.data?.unread_count || 0;
      setItems(feedItems);
      syncUnreadCount(unread);
      setError('');
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  }, [syncUnreadCount]);

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications();

    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [isOpen, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.post('notifications/mark-all-read/');
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      syncUnreadCount(0);
    } catch (e) {
      setError(parseError(e));
    }
  };

  const markOneRead = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current || current.is_read) return;

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    syncUnreadCount(Math.max(0, unreadCount - 1));

    try {
      await api.post(`notifications/${id}/read/`);
    } catch (e) {
      setError(parseError(e));
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: false } : item)));
      syncUnreadCount(unreadCount);
    }
  };

  const renderedItems = useMemo(
    () => items.map((item) => ({ ...item, relative_time: toRelativeTime(item.created_at) })),
    [items],
  );

  return (
    <div
      className={`fixed inset-0 z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <style>{`
        .notif-overlay { background: rgba(2, 6, 23, 0.42); }
        .notif-drawer {
          background: var(--surface);
          border-left: 1px solid var(--border);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
        }
        .notif-head { border-bottom: 1px solid var(--border); }
        .notif-title { color: var(--text); }
        .notif-subtitle { color: var(--text-muted); }
        .notif-close {
          color: var(--text-subtle);
          background: transparent;
          border: 1px solid transparent;
        }
        .notif-close:hover {
          color: var(--text);
          background: var(--surface-2);
          border-color: var(--border);
        }
        .notif-toolbar { border-bottom: 1px solid var(--border); }
        .notif-mark-all { color: var(--accent); }
        .notif-mark-all:hover { color: color-mix(in srgb, var(--accent), #fff 14%); }
        .notif-live { color: var(--text-subtle); }
        .notif-error {
          color: var(--danger);
          border-bottom: 1px solid color-mix(in srgb, var(--danger), transparent 74%);
          background: color-mix(in srgb, var(--danger), transparent 92%);
        }
        .notif-empty { color: var(--text-muted); }
        .notif-card {
          border: 1px solid var(--border);
          background: var(--surface);
        }
        .notif-card:hover { background: var(--surface-2); }
        .notif-card.unread {
          border-color: color-mix(in srgb, var(--accent), transparent 68%);
          background: color-mix(in srgb, var(--accent), transparent 88%);
        }
        .notif-card.unread:hover {
          background: color-mix(in srgb, var(--accent), transparent 84%);
        }
        .notif-card-title { color: var(--text); }
        .notif-card-body { color: var(--text-muted); }
        .notif-card-time { color: var(--text-subtle); }
        .notif-unread-dot { background: var(--accent); }

        .notif-icon { border: 1px solid var(--border); }
        .notif-icon.success {
          color: #10b981;
          background: color-mix(in srgb, #10b981, transparent 88%);
          border-color: color-mix(in srgb, #10b981, transparent 68%);
        }
        .notif-icon.warning {
          color: #f59e0b;
          background: color-mix(in srgb, #f59e0b, transparent 88%);
          border-color: color-mix(in srgb, #f59e0b, transparent 68%);
        }
        .notif-icon.error {
          color: #ef4444;
          background: color-mix(in srgb, #ef4444, transparent 88%);
          border-color: color-mix(in srgb, #ef4444, transparent 68%);
        }
      `}</style>
      <div className="notif-overlay absolute inset-0" onClick={onClose} />

      <aside
        className={`notif-drawer absolute right-0 top-16 bottom-0 w-full max-w-md transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="notif-head px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="notif-title text-base font-semibold">Notifications</h2>
              <p className="notif-subtitle text-xs mt-0.5">{unreadCount} unread</p>
            </div>
            <button
              onClick={onClose}
              className="notif-close p-2 rounded-md transition-colors"
              title="Close notifications"
            >
              <X size={18} />
            </button>
          </div>

          <div className="notif-toolbar px-5 py-3 flex items-center justify-between">
            <button
              onClick={markAllRead}
              className="notif-mark-all text-sm font-medium"
            >
              Mark all as read
            </button>
            <span className="notif-live text-xs flex items-center gap-1">
              <Clock size={12} />
              Live updates
            </span>
          </div>

          {error && <div className="notif-error px-5 py-2 text-xs">{error}</div>}

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && renderedItems.length === 0 && (
              <div className="notif-empty text-sm px-2 py-3">Loading notifications...</div>
            )}

            {!loading && renderedItems.length === 0 && (
              <div className="notif-empty text-sm px-2 py-3">No notifications yet.</div>
            )}

            {renderedItems.map((item) => {
              const Icon = iconByStatus[item.status] || Bell;
              return (
                <button
                  key={item.id}
                  onClick={() => markOneRead(item.id)}
                  className={`notif-card w-full text-left p-3 rounded-md transition-colors ${item.is_read ? '' : 'unread'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`notif-icon mt-0.5 w-8 h-8 rounded-md flex items-center justify-center ${item.status || ''}`}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="notif-card-title text-sm font-medium truncate">{item.title}</p>
                        {!item.is_read && <span className="notif-unread-dot w-2 h-2 rounded-full mt-1.5 flex-shrink-0" />}
                      </div>
                      <p className="notif-card-body text-sm mt-1">{item.body}</p>
                      <p className="notif-card-time text-xs mt-2">{item.relative_time}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function NotificationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AuthenticatedNavbar />
      <NotificationDrawer isOpen={true} onClose={() => navigate('/app')} />
    </div>
  );
}
