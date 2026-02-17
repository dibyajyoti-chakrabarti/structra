import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Github,
  Chrome,
  KeyRound,
} from "lucide-react";
import logo from "../../assets/logo.png";
import api from "../../api";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token") || "";
  const inviteEmail = searchParams.get("invite_email") || "";

  const [formData, setFormData] = useState({
    full_name: "",
    email: inviteEmail,
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState("password");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [illustrationSrc, setIllustrationSrc] = useState(
    "/src/assets/signup-illustration.svg"
  );

  useEffect(() => {
    if (!inviteEmail) return;
    setFormData((prev) => ({ ...prev, email: inviteEmail }));
  }, [inviteEmail]);

  const resolvePostSignupRoute = (isNewUser) => {
    if (inviteToken) {
      navigate(`/invite/${encodeURIComponent(inviteToken)}/respond`);
      return;
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

        resolvePostSignupRoute(res.data.user.is_new);
      } catch (err) {
        console.error("Google Signup Failed", err);
        setError("Google signup failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google signup failed"),
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("auth/register/", formData);
      if (inviteToken) {
        navigate(
          `/login?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(formData.email)}`
        );
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setOtpMessage("");

    if (!formData.full_name.trim()) {
      setError("Full name is required for OTP signup.");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required for OTP signup.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("auth/email-otp/request/", {
        email: formData.email,
        purpose: "signup",
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otpCode.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("auth/email-otp/verify/", {
        email: formData.email,
        otp: otpCode,
        purpose: "signup",
        full_name: formData.full_name,
      });

      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      resolvePostSignupRoute(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "OTP verification failed. Please try again."
      );
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
              Back to Home
            </button>
          </div>

          <div className="flex flex-1 items-center lg:min-h-0">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-blue-100/70 sm:p-7 lg:max-h-[calc(100vh-5.25rem)] lg:overflow-auto">
              <div className="mb-6 flex flex-col items-center text-center">
                <img
                  src={logo}
                  alt="Logo"
                  className="mb-3 h-10 w-auto object-contain"
                />
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
                    or create with email
                  </span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupMethod("password");
                      setError("");
                      setOtpMessage("");
                    }}
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
                    onClick={() => {
                      setSignupMethod("otp");
                      setError("");
                      setOtpMessage("");
                    }}
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
                      ? handleSubmit
                      : otpSent
                      ? handleVerifyOtp
                      : handleRequestOtp
                  }
                  className="space-y-3.5"
                >
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      type="text"
                      placeholder="Full name"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                    />
                  </div>

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

                  {signupMethod === "password" ? (
                    <>
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
                      <div className="relative">
                        <Lock
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          size={16}
                        />
                        <input
                          name="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          type="password"
                          placeholder="Confirm password"
                          required
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                        />
                      </div>
                    </>
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
                      : signupMethod === "password"
                      ? "Create Account"
                      : otpSent
                      ? "Verify OTP & Create Account"
                      : "Send OTP"}
                  </button>
                </form>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        inviteToken
                          ? `/login?invite_token=${encodeURIComponent(inviteToken)}&invite_email=${encodeURIComponent(formData.email)}`
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
            onError={() => setIllustrationSrc("/src/assets/cta-illustration.svg")}
          />
        </aside>
      </div>
    </div>
  );
}
