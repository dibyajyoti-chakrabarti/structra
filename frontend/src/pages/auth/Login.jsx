import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  signIn,
  confirmSignIn,
  signInWithRedirect,
  fetchAuthSession,
  signOut as amplifySignOut,
} from "aws-amplify/auth";
import { storeOAuthProvider } from "./CognitoCallback";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Github,
  Chrome,
  KeyRound,
} from "lucide-react";
import logo from "../../assets/logo.png";
import LoginIllustration from "../../assets/login-illustration.svg";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token") || "";
  const inviteEmail = searchParams.get("invite_email") || "";
  const { refreshUserProfile } = useAuth();

  const [identifier, setIdentifier] = useState(inviteEmail || "");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [illustrationSrc, setIllustrationSrc] = useState(
    "/src/assets/login-illustration.svg"
  );
  // Tracks a pending CUSTOM_AUTH challenge (waiting for OTP input)
  const [pendingSignIn, setPendingSignIn] = useState(null);

  useEffect(() => {
    if (inviteEmail) setIdentifier(inviteEmail);
  }, [inviteEmail]);

  const resolvePostAuthRoute = async (isNewUser) => {
    if (inviteToken) {
      navigate(`/invite/${encodeURIComponent(inviteToken)}/respond`);
      return;
    }
    navigate(isNewUser ? "/app/onboarding" : "/app");
  };

  const finishAuth = async () => {
    await refreshUserProfile();
    const profile = await api.get("auth/profile/");
    await resolvePostAuthRoute(profile.data?.is_new);
  };

  // --- Google ---
  const handleGoogleLogin = async () => {
    setError("");
    try {
      storeOAuthProvider("Google");
      await signInWithRedirect({ provider: "Google" });
    } catch (err) {
      if (err.name === 'UserAlreadyAuthenticatedException') {
        await amplifySignOut({ global: false });
        storeOAuthProvider("Google");
        await signInWithRedirect({ provider: "Google" });
        return;
      }
      setError("Google login failed. Please try again.");
      console.error(err);
    }
  };

  // --- GitHub ---
  const handleGitHubLogin = async () => {
    setError("");
    try {
      storeOAuthProvider({ custom: "GitHub" });
      await signInWithRedirect({ provider: { custom: "GitHub" } });
    } catch (err) {
      if (err.name === 'UserAlreadyAuthenticatedException') {
        await amplifySignOut({ global: false });
        storeOAuthProvider({ custom: "GitHub" });
        await signInWithRedirect({ provider: { custom: "GitHub" } });
        return;
      }
      setError("GitHub login failed. Please try again.");
      console.error(err);
    }
  };

  // --- Password login ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn({ username: identifier, password });
      if (result.isSignedIn) {
        await finishAuth();
      } else {
        setError("Sign-in incomplete. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- OTP: request (initiate CUSTOM_AUTH) ---
  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email first.");
      return;
    }
    setError("");
    setOtpMessage("");
    setLoading(true);
    try {
      const result = await signIn({
        username: identifier,
        options: { authFlowType: "CUSTOM_WITHOUT_SRP" },
      });
      if (result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
        setPendingSignIn(result);
        setOtpSent(true);
        setOtpMessage("OTP sent to your email. It expires in 10 minutes.");
      } else {
        setError("Unexpected auth step. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- OTP: verify ---
  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await confirmSignIn({ challengeResponse: otpCode });
      if (result.isSignedIn) {
        await finishAuth();
      } else {
        setError("OTP verification failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authMethod === "password") {
      await handlePasswordLogin(e);
    } else if (!otpSent) {
      await handleRequestOtp();
    } else {
      await handleVerifyOtp();
    }
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
                  <span className="text-blue-600">structra.cloud</span>
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
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <Chrome size={14} /> Google
                  </button>
                  <button
                    type="button"
                    onClick={handleGitHubLogin}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <Github size={14} /> GitHub
                  </button>
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    or continue with email
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod("password"); setError(""); setOtpMessage(""); }}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      authMethod === "password"
                        ? "bg-blue-600 text-white"
                        : "text-slate-500 hover:text-blue-700"
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod("otp"); setError(""); setOtpMessage(""); }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                      authMethod === "otp"
                        ? "bg-blue-600 text-white"
                        : "text-slate-500 hover:text-blue-700"
                    }`}
                  >
                    <KeyRound size={12} /> Email OTP
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      type="email"
                      placeholder="Email"
                      required
                      readOnly={!!inviteEmail}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>

                  {authMethod === "password" ? (
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ) : (
                    <>
                      {otpSent && (
                        <div className="relative">
                          <KeyRound
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                          <input
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            required
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                          />
                        </div>
                      )}
                      {otpMessage && (
                        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                          {otpMessage}
                        </p>
                      )}
                      {otpSent && (
                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Resend OTP
                        </button>
                      )}
                    </>
                  )}

                  {error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading
                      ? "Please wait..."
                      : authMethod === "password"
                      ? "Sign In"
                      : otpSent
                      ? "Verify OTP & Sign In"
                      : "Send OTP"}
                  </button>
                </form>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        inviteToken
                          ? `/signup?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(inviteEmail || identifier)}`
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
