import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Lock,
  Github,
  Chrome,
  KeyRound,
} from "lucide-react";
import logo from "../../assets/logo.png";
import LoginIllustration from "../../assets/login-illustration.svg";
import api from "../../api";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token") || "";
  const inviteEmail = searchParams.get("invite_email") || "";

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [authMethod, setAuthMethod] = useState("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [illustrationSrc, setIllustrationSrc] = useState(
    "/src/assets/login-illustration.svg"
  );

  useEffect(() => {
    if (!inviteEmail) return;
    setFormData((prev) => ({ ...prev, email: prev.email || inviteEmail }));
  }, [inviteEmail]);

  const resolvePostAuthRoute = async (isNewUser) => {
    if (inviteToken) {
      try {
        const invitationRes = await api.post("invitations/accept/", { token: inviteToken });
        const workspaceId = invitationRes.data?.workspace_id;
        if (workspaceId) {
          navigate(`/app/ws/${workspaceId}`);
          return;
        }
      } catch (err) {
        console.error("Invitation accept after login failed", err);
      }
    }

    if (isNewUser) {
      navigate("/app/onboarding");
    } else {
      navigate("/app");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await api.post("auth/google/", {
          access_token: tokenResponse.access_token,
        });

        localStorage.setItem("access", res.data.access);
        localStorage.setItem("refresh", res.data.refresh);

        await resolvePostAuthRoute(res.data.user.is_new);
      } catch (err) {
        console.error("Google Login Failed", err);
        setError("Google login failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login failed"),
  });

  const handleGitHubLogin = () => {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const REDIRECT_URI = "http://localhost:5173/auth/github/callback";

    if (!CLIENT_ID) {
      alert("GitHub Client ID not loaded");
      return;
    }

    window.location.href =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=user:email`;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await api.post("auth/login/", formData);
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      const profileRes = await api.get("auth/profile/");
      await resolvePostAuthRoute(profileRes.data.is_new);
    } catch (err) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!formData.email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    setError("");
    setOtpMessage("");
    setLoading(true);
    try {
      const res = await api.post("auth/email-otp/request/", {
        email: formData.email,
        purpose: "login",
      });
      setOtpSent(true);
      setOtpMessage(
        `OTP sent. It expires in ${res.data.expires_in_minutes || 10} minutes.`
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.email.trim() || !otpCode.trim()) {
      setError("Please enter email and OTP.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await api.post("auth/email-otp/verify/", {
        email: formData.email,
        otp: otpCode,
        purpose: "login",
      });

      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      await resolvePostAuthRoute(response.data.user?.is_new);
    } catch (err) {
      setError(err.response?.data?.error || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    if (authMethod === "password") {
      await handleLogin(e);
      return;
    }

    e.preventDefault();
    if (!otpSent) {
      await handleRequestOtp();
      return;
    }
    await handleVerifyOtp();
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
              Back to Home
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
                    onClick={() => googleLogin()}
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
                    onClick={() => {
                      setAuthMethod("password");
                      setError("");
                      setOtpMessage("");
                    }}
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
                    onClick={() => {
                      setAuthMethod("otp");
                      setError("");
                      setOtpMessage("");
                    }}
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
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      type="email"
                      placeholder="Work email"
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
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        type="password"
                        placeholder="Password"
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                      />
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
                          ? `/signup?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(formData.email)}`
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
