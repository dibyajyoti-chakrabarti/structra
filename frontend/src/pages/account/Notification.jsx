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

const iconColorByStatus = {
  success: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  warning: 'text-amber-600 bg-amber-50 border-amber-100',
  error: 'text-red-600 bg-red-50 border-red-100',
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
      <div className="absolute inset-0 bg-gray-900/20" onClick={onClose} />

      <aside
        className={`absolute right-0 top-16 bottom-0 w-full max-w-md bg-white border-l border-gray-200 shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Notifications</h2>
              <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              title="Close notifications"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={markAllRead}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Mark all as read
            </button>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              Live updates
            </span>
          </div>

          {error && <div className="px-5 py-2 text-xs text-red-600 border-b border-red-100 bg-red-50">{error}</div>}

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && renderedItems.length === 0 && (
              <div className="text-sm text-gray-500 px-2 py-3">Loading notifications...</div>
            )}

            {!loading && renderedItems.length === 0 && (
              <div className="text-sm text-gray-500 px-2 py-3">No notifications yet.</div>
            )}

            {renderedItems.map((item) => {
              const Icon = iconByStatus[item.status] || Bell;
              return (
                <button
                  key={item.id}
                  onClick={() => markOneRead(item.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${item.is_read ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-8 h-8 rounded-md border flex items-center justify-center ${iconColorByStatus[item.status] || 'text-gray-600 bg-gray-50 border-gray-100'}`}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        {!item.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{item.relative_time}</p>
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
    <div className="min-h-screen bg-gray-50">
      <AuthenticatedNavbar />
      <NotificationDrawer isOpen={true} onClose={() => navigate('/app')} />
    </div>
  );
}
