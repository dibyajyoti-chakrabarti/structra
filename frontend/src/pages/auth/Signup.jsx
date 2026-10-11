import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "../../assets/logo.png";
import SignupIllustration from "../../assets/signup-illustration.svg";
import CtaIllustration from "../../assets/cta-illustration.svg";
import EmailCodeForm from "../../auth/EmailCodeForm";
import SocialLoginButtons from "../../auth/SocialLoginButtons";
import { resolvePostAuthRoute } from "../../auth/postAuth";
import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token") || "";
  const inviteEmail = searchParams.get("invite_email") || "";
  const { signIn } = useAuth();
  const [illustrationSrc, setIllustrationSrc] = useState(SignupIllustration);

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
                  Create your{" "}
                  <span className="text-blue-600">Structra</span> account
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Start modeling architecture and making smarter decisions.
                </p>
                {!!inviteToken && (
                  <p className="mt-2 text-sm text-blue-600">
                    Complete signup to accept your workspace invitation.
                  </p>
                )}
              </div>

              <div className="space-y-6">
                <SocialLoginButtons inviteToken={inviteToken} />

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    or create with email
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <EmailCodeForm
                  mode="signup"
                  initialEmail={inviteEmail}
                  lockEmail={!!inviteEmail}
                  onSignedIn={handleSignedIn}
                />

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        inviteToken
                          ? `/login?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(inviteEmail)}`
                          : "/login"
                      )
                    }
                    className="text-xs font-bold text-blue-700 transition hover:text-blue-800"
                  >
                    Already have an account? Log in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:flex lg:min-h-0 lg:items-center lg:justify-center">
          <img
            src={illustrationSrc}
            alt="Structra signup illustration"
            className="h-full max-h-[92vh] w-full object-contain"
            onError={() => setIllustrationSrc(CtaIllustration)}
          />
        </aside>
      </div>
    </div>
  );
}
