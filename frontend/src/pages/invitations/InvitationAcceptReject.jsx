import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function InvitationAcceptReject() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await api.get('invitations/details/', {
          params: { token },
        });
        setDetails(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid invitation link.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [token]);

  const handleAccept = async () => {
    const isAuthenticated = !!localStorage.getItem('access');
    if (!isAuthenticated) {
      if (details?.has_account) {
        navigate(
          `/login?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(details?.email || '')}`
        );
      } else {
        navigate(
          `/signup?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(details?.email || '')}`
        );
      }
      return;
    }

    setAccepting(true);
    setError('');
    try {
      const response = await api.post('invitations/accept/', { token });
      const workspaceId = response.data?.workspace_id;
      if (workspaceId) {
        navigate(`/app/ws/${workspaceId}`);
        return;
      }
      navigate('/app');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || 'Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setError('');
    try {
      await api.post('invitations/reject/', { token });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject invitation.');
    } finally {
      setRejecting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Accept Invitation</h1>
      {loading && <p className="text-gray-600">Loading invitation details...</p>}
      {!loading && details && (
        <>
          <p className="text-gray-600">
            Join <span className="font-semibold">{details.workspace_name}</span> invited by{' '}
            <span className="font-semibold">{details.inviter_name}</span>.
          </p>
          {!details.has_account && (
            <p className="text-gray-600">You need to create a Structra account to continue.</p>
          )}
        </>
      )}
      {!!error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-4">
        <button
          onClick={handleAccept}
          disabled={loading || !!error || accepting}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-60"
        >
          {accepting ? 'Accepting...' : 'Accept Invitation'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading || rejecting}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-60"
        >
          {rejecting ? 'Rejecting...' : 'Reject Invitation'}
        </button>
      </div>
    </div>
  );
}
