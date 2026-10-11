import { useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import useBackendStatus from "../backend/useBackendStatus";
import { isStaticPublicPath, statusLine } from "../backend/health";

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4" data-theme="light">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-blue-100/70">
        <img src={logo} alt="Structra" className="mx-auto mb-5 h-10 w-auto object-contain" />
        {children}
      </div>
    </div>
  );
}

function Waking({ elapsed }) {
  return (
    <Shell>
      <div role="status" aria-live="polite">
        <span
          className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"
          aria-hidden="true"
        />
        <h1 className="text-lg font-bold text-slate-900">Getting things ready</h1>
        <p className="mt-1 text-3xl font-black tabular-nums text-blue-600">{elapsed}s</p>
        <p className="mt-3 min-h-[3rem] text-sm text-slate-500">{statusLine(elapsed)}</p>
      </div>
    </Shell>
  );
}

function Failed({ onRetry }) {
  return (
    <Shell>
      <h1 className="text-lg font-bold text-slate-900">We could not reach the server</h1>
      <p className="mt-2 text-sm text-slate-500">
        It may still be starting up. Wait a moment and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
      >
        Try again
      </button>
    </Shell>
  );
}

// Free hosting puts the API to sleep when idle and a first request can take a minute. This
// gate pings the API as soon as the app loads (which also wakes it) and shows a loader only
// for pages that need it. Static public pages render straight away.
export default function BackendGate({ children }) {
  const { pathname } = useLocation();
  const { status, elapsed, reconnecting, retry } = useBackendStatus();

  if (status === "ready" || isStaticPublicPath(pathname)) {
    return (
      <>
        {reconnecting && (
          <div
            role="status"
            className="fixed inset-x-0 top-0 z-[100] bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900"
          >
            Reconnecting to the server
          </div>
        )}
        {children}
      </>
    );
  }
  if (status === "failed") return <Failed onRetry={retry} />;
  if (status === "waking") return <Waking elapsed={elapsed} />;
  return <div className="min-h-screen bg-slate-50" data-theme="light" />;
}
