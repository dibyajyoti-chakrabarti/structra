import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  LogIn,
  Mail,
  ShieldCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import api from '../../api';
import LoadingState from '../../components/LoadingState';
import logo from '../../assets/logo.png';

export default function InvitationExperience() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('invitations/details/', { params: { token } });
        setDetails(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired invitation link.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [token]);

  const primaryCtaLabel = useMemo(() => {
    if (!details) return 'Accept Invitation';
    const isAuthenticated = !!localStorage.getItem('access');
    if (isAuthenticated) return 'Accept Invitation';
    return details.has_account ? 'Sign in & Accept' : 'Create account & Accept';
  }, [details]);

  const handleAccept = async () => {
    const isAuthenticated = !!localStorage.getItem('access');

    if (!details) return;

    if (!isAuthenticated) {
      if (details.has_account) {
        navigate(
          `/login?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(details.email)}`
        );
      } else {
        navigate(
          `/signup?invite_token=${encodeURIComponent(token)}&invite_email=${encodeURIComponent(details.email)}`
        );
      }
      return;
    }

    setAccepting(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post('invitations/accept/', { token });
      setSuccess(response.data?.message || 'Invitation accepted. Redirecting...');
      const workspaceId = response.data?.workspace_id;
      if (workspaceId) {
        navigate(`/app/ws/${workspaceId}`);
      } else {
        navigate('/app');
      }
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
    setSuccess('');

    try {
      await api.post('invitations/reject/', { token });
      setSuccess('Invitation rejected.');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject invitation.');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoadingState message="Loading invitation details" minHeight="100vh" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-[22rem] w-[22rem] rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-center">
        <header className="mb-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
          >
            <Home size={15} />
            Home
          </button>
          <img src={logo} alt="Structra" className="h-9 w-auto object-contain" />
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-blue-100/60 sm:p-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <ShieldCheck size={14} />
              Secure workspace invite
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              You are invited to join{' '}
              <span className="text-blue-600">{details?.workspace_name || 'a workspace'}</span>
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              <span className="font-semibold text-slate-800">{details?.inviter_name}</span> invited you on Structra.
              Accept to get immediate access to the shared architecture workspace.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Building2 size={14} />
                  Workspace
                </div>
                <p className="truncate text-sm font-semibold text-slate-800">{details?.workspace_name}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Mail size={14} />
                  Invited email
                </div>
                <p className="truncate text-sm font-semibold text-slate-800">{details?.email}</p>
              </div>
            </div>

            {!!error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {!!success && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-700">
                {success}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleAccept}
                disabled={!!error || accepting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {!details?.has_account && !localStorage.getItem('access') ? <UserPlus size={15} /> : <LogIn size={15} />}
                {accepting ? 'Processing...' : primaryCtaLabel}
                {!accepting && <ArrowRight size={15} />}
              </button>
              <button
                onClick={() => setShowRejectConfirm((prev) => !prev)}
                disabled={!!error || rejecting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={15} />
                {showRejectConfirm ? 'Cancel reject' : 'Reject invitation'}
              </button>
            </div>

            {showRejectConfirm && !error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3.5">
                <p className="text-sm text-red-700">
                  This invite will be marked as rejected. You can still request a fresh invite later.
                </p>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle size={14} />
                  {rejecting ? 'Rejecting...' : 'Confirm reject'}
                </button>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-blue-100/50 sm:p-6">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">What happens next</h2>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 text-blue-600" size={16} />
                Accepting immediately adds you as a workspace member.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 text-blue-600" size={16} />
                If you are not signed in, you will be redirected with this token preserved.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 text-blue-600" size={16} />
                This invitation is tied to <span className="font-semibold text-slate-800">{details?.email}</span>.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
