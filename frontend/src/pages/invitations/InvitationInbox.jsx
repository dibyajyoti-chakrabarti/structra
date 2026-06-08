import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Inbox, Mail, UserCheck, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AuthenticatedNavbar from '../../components/AuthenticatedNavbar';
import LoadingState from '../../components/LoadingState';
import api from '../../api';

const formatExpiry = (isoDate) => {
  if (!isoDate) return 'No expiry date';
  const timestamp = new Date(isoDate);
  if (Number.isNaN(timestamp.getTime())) return 'Unknown expiry';
  return `Expires ${formatDistanceToNow(timestamp, { addSuffix: true })}`;
};

export default function InvitationInbox() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionToken, setActionToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isActive = true;

    const fetchInvites = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('invitations/');
        if (!isActive) return;
        setInvites(response.data || []);
      } catch (err) {
        if (!isActive) return;
        setError(err?.response?.data?.error || 'Unable to load invitations.');
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchInvites();
    return () => {
      isActive = false;
    };
  }, []);

  const pendingCount = invites.length;

  const cards = useMemo(
    () =>
      invites.map((invite) => ({
        ...invite,
        workspace_label: invite.workspace_name || 'Workspace',
        invited_by: invite.inviter_name || 'Workspace admin',
        expiry_label: formatExpiry(invite.expires_at),
      })),
    [invites],
  );

  const handleAccept = async (token) => {
    if (!token) return;
    setActionToken(token);
    setError('');
    setSuccess('');
    try {
      const response = await api.post('invitations/accept/', { token });
      setInvites((prev) => prev.filter((item) => item.token !== token));
      setSuccess(response.data?.message || 'Invitation accepted.');
      const workspaceId = response.data?.workspace_id;
      if (workspaceId) {
        navigate(`/app/ws/${workspaceId}`);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to accept invitation.');
    } finally {
      setActionToken('');
    }
  };

  const handleReject = async (token) => {
    if (!token) return;
    setActionToken(token);
    setError('');
    setSuccess('');
    try {
      await api.post('invitations/reject/', { token });
      setInvites((prev) => prev.filter((item) => item.token !== token));
      setSuccess('Invitation rejected.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reject invitation.');
    } finally {
      setActionToken('');
    }
  };

  if (loading) {
    return <LoadingState message="Loading invitations" minHeight="100vh" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="sticky top-0 z-40">
        <AuthenticatedNavbar />
      </div>

      <main className="px-4 pb-12 pt-8 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Inbox size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Workspace Invites</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Accept an invite here instead of email. You can still join with email invites too.
                  </p>
                </div>
              </div>
              <div className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                {pendingCount} Pending
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </div>
            )}

            <div className="mt-8 grid gap-4">
              {cards.map((invite) => (
                <div
                  key={invite.token}
                  className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-blue-200"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">{invite.workspace_label}</h2>
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <Mail size={12} />
                          Invited
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck size={14} className="text-gray-400" />
                          {invite.invited_by}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} className="text-gray-400" />
                          {invite.expiry_label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(invite.token)}
                        disabled={actionToken === invite.token}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <CheckCircle2 size={16} />
                        {actionToken === invite.token ? 'Joining...' : 'Accept'}
                        <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(invite.token)}
                        disabled={actionToken === invite.token}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!loading && cards.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                  <p className="text-sm font-medium text-gray-600">No pending invitations right now.</p>
                  <p className="mt-2 text-xs text-gray-500">
                    Ask your workspace admin to invite you or check your email for a fresh link.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
