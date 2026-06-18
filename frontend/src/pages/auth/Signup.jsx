import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  signUp,
  confirmSignUp,
  signIn,
  signInWithRedirect,
} from "aws-amplify/auth";
import { storeOAuthProvider } from "./CognitoCallback";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Github,
  Chrome,
  KeyRound,
} from "lucide-react";
import logo from "../../assets/logo.png";
import SignupIllustration from "../../assets/signup-illustration.svg";
import CtaIllustration from "../../assets/cta-illustration.svg";
import api from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token") || "";
  const inviteEmail = searchParams.get("invite_email") || "";
  const { refreshUserProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inviteEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState("password");
  const [verifyCode, setVerifyCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [illustrationSrc, setIllustrationSrc] = useState(SignupIllustration);

  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  const resolvePostSignupRoute = (isNewUser) => {
    if (inviteToken) {
      navigate(`/invite/${encodeURIComponent(inviteToken)}/respond`);
      return;
    }
    navigate(isNewUser ? "/app/onboarding" : "/app");
  };

  const finishAuth = async () => {
    await refreshUserProfile();
    const profile = await api.get("auth/profile/");
    resolvePostSignupRoute(profile.data?.is_new !== false);
  };

  // --- Google ---
  const handleGoogleSignup = async () => {
    setError("");
    try {
      storeOAuthProvider("Google");
      await signInWithRedirect({ provider: "Google" });
    } catch (err) {
      setError("Google signup failed. Please try again.");
      console.error(err);
    }
  };

  // --- GitHub ---
  const handleGitHubSignup = async () => {
    setError("");
    try {
      storeOAuthProvider({ custom: "GitHub" });
      await signInWithRedirect({ provider: { custom: "GitHub" } });
    } catch (err) {
      setError("GitHub signup failed. Please try again.");
      console.error(err);
    }
  };

  // --- Password signup: step 1 register, step 2 verify code ---
  const handlePasswordSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email, name: fullName },
        },
      });

      if (result.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setCodeSent(true);
        setCodeMessage("Verification code sent to your email.");
      } else if (result.isSignUpComplete) {
        await signIn({ username: email, password });
        await finishAuth();
      }
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        setError("An account with this email already exists. Please sign in.");
      } else {
        console.error(err);
        setError(err.message || "Registration failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: verifyCode });
      // Sign in right after confirmation
      await signIn({ username: email, password });
      await finishAuth();
    } catch (err) {
      console.error(err);
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const DUMMY_PW_PREFIX = "Str@ctr@-";
  const handleOtpSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signUp({
        username: email,
        password: `${DUMMY_PW_PREFIX}${crypto.randomUUID()}`,
        options: {
          userAttributes: { email, name: fullName },
        },
      });
      if (result.nextStep?.signUpStep === "DONE" || result.isSignUpComplete) {
        // Auto-confirmed — go straight to OTP sign-in
        const params = new URLSearchParams({ method: "otp", email });
        if (inviteToken) {
          params.set("invite_token", inviteToken);
          params.set("invite_email", email);
        }
        navigate(`/login?${params.toString()}`);
      } else if (result.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        // Fallback for edge cases (e.g. admin-created accounts)
        setCodeSent(true);
        setCodeMessage("Verification code sent to your email. It expires shortly.");
      }
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        setError("An account with this email already exists. Please sign in.");
      } else {
        console.error(err);
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtpCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: verifyCode });
      // After OTP signup, user logs in via OTP login flow
      navigate(
        inviteToken
          ? `/login?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(email)}`
          : "/login"
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
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
                  Create your{" "}
                  <span className="text-blue-600">structra.cloud</span> account
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
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <Chrome size={14} /> Google
                  </button>
                  <button
                    type="button"
                    onClick={handleGitHubSignup}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <Github size={14} /> GitHub
                  </button>
                </div>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    or create with email
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => { setSignupMethod("password"); setError(""); setCodeMessage(""); setCodeSent(false); }}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      signupMethod === "password"
                        ? "bg-blue-600 text-white"
                        : "text-slate-500 hover:text-blue-700"
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSignupMethod("otp"); setError(""); setCodeMessage(""); setCodeSent(false); }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                      signupMethod === "otp"
                        ? "bg-blue-600 text-white"
                        : "text-slate-500 hover:text-blue-700"
                    }`}
                  >
                    <KeyRound size={12} /> Email OTP
                  </button>
                </div>

                <form
                  onSubmit={
                    signupMethod === "password"
                      ? codeSent ? handleConfirmCode : handlePasswordSignup
                      : codeSent ? handleConfirmOtpCode : handleOtpSignup
                  }
                  className="space-y-3.5"
                >
                  {!codeSent && (
                    <>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          type="text"
                          placeholder="Full name"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                        />
                      </div>

                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          placeholder="Work email"
                          required
                          readOnly={!!inviteEmail}
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                        />
                      </div>

                      {signupMethod === "password" && (
                        <>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                              onClick={() => setShowPassword((p) => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              required
                              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((p) => !p)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {codeSent && (
                    <>
                      {codeMessage && (
                        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                          {codeMessage}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Can&apos;t find it? Check your spam or junk folder.
                      </p>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value)}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Enter 6-digit verification code"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                        />
                      </div>
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
                      : codeSent
                      ? "Verify & Complete Signup"
                      : signupMethod === "password"
                      ? "Create Account"
                      : "Send Verification Code"}
                  </button>
                </form>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        inviteToken
                          ? `/login?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(email)}`
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
