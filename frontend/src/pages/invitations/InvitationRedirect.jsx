import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function InvitationRedirect() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
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

  const handleContinue = () => {
    if (!details) return;
    const isAuthenticated = !!localStorage.getItem('access');

    if (!details.has_account) {
      navigate(
        `/signup?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(details.email)}`
      );
      return;
    }

    if (!isAuthenticated) {
      navigate(
        `/login?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(details.email)}`
      );
      return;
    }

    navigate(`/invite/${token}/respond`);
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">Workspace Invitation</h1>
      {loading && <p className="text-gray-600">Loading invitation details...</p>}
      {!loading && error && <p className="text-red-600">{error}</p>}
      {!loading && details && (
        <>
          <p className="text-gray-600">
            <span className="font-semibold">{details.inviter_name}</span> invited you to join{' '}
            <span className="font-semibold">{details.workspace_name}</span>.
          </p>
          <p className="text-gray-600">Invited email: {details.email}</p>
          {!details.has_account && (
            <p className="text-gray-600">Create a Structra account first to accept this invitation.</p>
          )}
        </>
      )}
      <div className="flex gap-4">
        <button
          onClick={handleContinue}
          className="px-4 py-2 bg-blue-500 text-white rounded"
          disabled={loading || !!error}
        >
          Continue
        </button>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-500 text-white rounded">Go Home</button>
      </div>
    </div>
  );
}
