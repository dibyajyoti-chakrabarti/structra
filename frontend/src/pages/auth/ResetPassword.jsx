import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import logo from "../../assets/logo.png";
import LoginIllustration from "../../assets/login-illustration.svg";
import api from "../../api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uid = (searchParams.get("uid") || "").trim();
  const token = (searchParams.get("token") || "").trim();
  const canValidate = useMemo(() => Boolean(uid && token), [uid, token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [illustrationSrc, setIllustrationSrc] = useState("/src/assets/login-illustration.svg");

  useEffect(() => {
    const validateLink = async () => {
      if (!canValidate) {
        setIsValidating(false);
        setIsLinkValid(false);
        setError("This reset link is invalid.");
        return;
      }

      setIsValidating(true);
      setError("");
      try {
        await api.post("auth/password-reset/validate/", { uid, token });
        setIsLinkValid(true);
      } catch (err) {
        setIsLinkValid(false);
        setError(err.response?.data?.error || "Invalid or expired reset link.");
      } finally {
        setIsValidating(false);
      }
    };

    validateLink();
  }, [canValidate, uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("auth/password-reset/confirm/", { uid, token, password });
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password.");
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
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </div>

          <div className="flex flex-1 items-center lg:min-h-0">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-blue-100/70 sm:p-7 lg:max-h-[calc(100vh-5.25rem)] lg:overflow-auto">
              <div className="mb-6 flex flex-col items-center text-center">
                <img src={logo} alt="Logo" className="mb-3 h-10 w-auto object-contain" />
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  Set a new password
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Choose a new password for your Structra account.
                </p>
              </div>

              {isValidating ? (
                <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  Validating reset link...
                </p>
              ) : isSuccess ? (
                <div className="space-y-3.5">
                  <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                    Password reset successful. You can now log in with your new password.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                  >
                    Go to login
                  </button>
                </div>
              ) : !isLinkValid ? (
                <div className="space-y-3.5">
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error || "Invalid or expired reset link."}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                  >
                    Request a new reset link
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
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

                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

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
                    {loading ? "Updating password..." : "Update password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:flex lg:min-h-0 lg:items-center lg:justify-center">
          <img
            src={illustrationSrc}
            alt="Structra reset password illustration"
            className="h-full max-h-[92vh] w-full object-contain"
            onError={() => setIllustrationSrc(LoginIllustration)}
          />
        </aside>
      </div>
    </div>
  );
}
