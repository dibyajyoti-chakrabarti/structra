import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeOAuthTicket, friendlyAuthMessage } from "../../auth/authClient";
import { resolvePostAuthRoute, takePostAuth } from "../../auth/postAuth";
import { useAuth } from "../../contexts/AuthContext";

// Codes sent back by the backend's OAuth callback, mapped to something a person can act on.
const ERROR_MESSAGES = {
  access_denied: "Sign in was cancelled.",
  email_not_verified:
    "Your account with that provider has no verified email address. Verify it with the provider, then try again.",
  identity_conflict:
    "This email is already linked to a different Google or GitHub account. Sign in with the one you used before, or use an email code.",
  account_disabled: "This account has been disabled.",
  provider_not_configured: "That sign in option is not available yet. Use an email code instead.",
  invalid_state: "That sign in attempt expired. Please try again.",
  exchange_failed: "The provider did not accept the sign in. Please try again.",
  provider_error: "The provider could not be reached. Please try again.",
};
const GENERIC_ERROR = "Sign in did not complete. Please try again.";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    // The ticket is single use, so it must only ever be exchanged once.
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("code");
    const errorCode = params.get("error");
    // Keep the ticket out of history and out of any later copy of the address bar.
    window.history.replaceState(null, "", window.location.pathname);

    const fail = (message) => navigate("/login", { replace: true, state: { authError: message } });

    if (errorCode) {
      takePostAuth();
      fail(ERROR_MESSAGES[errorCode] || GENERIC_ERROR);
      return;
    }
    if (!ticket) {
      fail(GENERIC_ERROR);
      return;
    }

    exchangeOAuthTicket(ticket)
      .then((payload) => {
        const { inviteToken } = takePostAuth();
        const user = signIn(payload);
        navigate(resolvePostAuthRoute(user, inviteToken), { replace: true });
      })
      .catch((err) => fail(friendlyAuthMessage(err, GENERIC_ERROR)));
  }, [navigate, signIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p role="status" className="text-sm text-slate-500">
        Completing sign in
      </p>
    </div>
  );
}
