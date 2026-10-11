import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png";
import LoginIllustration from "../../assets/login-illustration.svg";
import EmailCodeForm from "../../auth/EmailCodeForm";
import SocialLoginButtons from "../../auth/SocialLoginButtons";
import { resolvePostAuthRoute } from "../../auth/postAuth";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token") || "";
  const inviteEmail = searchParams.get("invite_email") || "";
  const initialEmail = searchParams.get("email") || inviteEmail || "";
  const { signIn } = useAuth();
  // Set by the OAuth callback page when a Google or GitHub sign in fails.
  const authError = location.state?.authError || "";
  const [illustrationSrc, setIllustrationSrc] = useState(
    "/src/assets/login-illustration.svg"
  );

  const handleSignedIn = (payload) => {
    const user = signIn(payload);
    navigate(resolvePostAuthRoute(user, inviteToken), { replace: true });
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 lg:overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 px-4 py-4 sm:px-6 lg:h-screen lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-3">
        <section className="flex flex-col">
          <div className="mb-4 lg:mb-3">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>

          <div className="flex flex-1 items-center lg:min-h-0">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-blue-100/70 sm:p-7 lg:max-h-[calc(100vh-5.25rem)] lg:overflow-auto">
              <div className="mb-6 flex flex-col items-center text-center">
                <img src={logo} alt="Logo" className="mb-3 h-10 w-auto object-contain" />
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  Welcome back to{" "}
                  <span className="text-blue-600">Structra</span>
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Sign in to continue your architecture workspaces.
                </p>
                {!!inviteToken && (
                  <p className="mt-2 text-sm text-blue-600">
                    Log in to accept your workspace invitation.
                  </p>
                )}
              </div>

              <div className="space-y-6">
                {authError && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {authError}
                  </p>
                )}

                <SocialLoginButtons inviteToken={inviteToken} />

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    or continue with email
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <EmailCodeForm
                  mode="login"
                  initialEmail={initialEmail}
                  lockEmail={!!inviteEmail}
                  onSignedIn={handleSignedIn}
                />

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        inviteToken
                          ? `/signup?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(inviteEmail)}`
                          : "/signup"
                      )
                    }
                    className="text-xs font-bold text-blue-700 transition hover:text-blue-800"
                  >
                    Don&apos;t have an account? Create one
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:flex lg:min-h-0 lg:items-center lg:justify-center">
          <img
            src={illustrationSrc}
            alt="Structra login illustration"
            className="h-full max-h-[92vh] w-full object-contain"
            onError={() => setIllustrationSrc(LoginIllustration)}
          />
        </aside>
      </div>
    </div>
  );
}
