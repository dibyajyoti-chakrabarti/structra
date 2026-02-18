import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, Info, AlertTriangle, X } from 'lucide-react';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';

const DUMMY_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Workspace invite accepted',
    body: 'Sam Chen joined New Test Workspace.',
    type: 'info',
    time: '2m ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'System evaluation completed',
    body: 'Networking and Caching Integration evaluation is ready.',
    type: 'success',
    time: '14m ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'Permission changed',
    body: 'Editor access granted to jordan@structra.cloud.',
    type: 'warning',
    time: '1h ago',
    read: true,
  },
  {
    id: 'n4',
    title: 'Workspace backup',
    body: 'Nightly backup completed successfully.',
    type: 'success',
    time: 'Yesterday',
    read: true,
  },
];

const iconByType = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCheck,
};

const iconColorByType = {
  info: 'text-blue-600 bg-blue-50 border-blue-100',
  warning: 'text-amber-600 bg-amber-50 border-amber-100',
  success: 'text-emerald-600 bg-emerald-50 border-emerald-100',
};

export function NotificationDrawer({ isOpen, onClose }) {
  const [items, setItems] = useState(DUMMY_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const markOneRead = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

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
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount} unread
              </p>
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

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.map((item) => {
              const Icon = iconByType[item.type] || Bell;
              return (
                <button
                  key={item.id}
                  onClick={() => markOneRead(item.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${item.read ? 'bg-white border-gray-200 hover:bg-gray-50' : 'bg-blue-50/50 border-blue-200 hover:bg-blue-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-8 h-8 rounded-md border flex items-center justify-center ${iconColorByType[item.type] || 'text-gray-600 bg-gray-50 border-gray-100'}`}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.title}
                        </p>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.body}</p>
                      <p className="text-xs text-gray-400 mt-2">{item.time}</p>
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
