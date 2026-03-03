import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import logo from "../../assets/logo.png";
import LoginIllustration from "../../assets/login-illustration.svg";
import api from "../../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [illustrationSrc, setIllustrationSrc] = useState("/src/assets/login-illustration.svg");

  useEffect(() => {
    const initialIdentifier = searchParams.get("identifier");
    if (initialIdentifier) setIdentifier(initialIdentifier);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!identifier.trim()) {
      setError("Please enter your email or username.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("auth/password-reset/request/", {
        identifier: identifier.trim(),
      });
      setMessage(
        res.data?.message ||
          "If an account exists, a reset link has been sent to your email."
      );
    } catch (err) {
      setError(
        err.response?.data?.error || "Unable to process your request right now."
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
                  Forgot your password?
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Enter your email or username and we&apos;ll send a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    type="text"
                    placeholder="Email or Username"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {error}
                  </p>
                )}

                {message && (
                  <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                    {message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Sending reset link..." : "Send reset link"}
                </button>
              </form>
            </div>
          </div>
        </section>

        <aside className="relative hidden lg:flex lg:min-h-0 lg:items-center lg:justify-center">
          <img
            src={illustrationSrc}
            alt="Structra forgot password illustration"
            className="h-full max-h-[92vh] w-full object-contain"
            onError={() => setIllustrationSrc(LoginIllustration)}
          />
        </aside>
      </div>
    </div>
  );
}
