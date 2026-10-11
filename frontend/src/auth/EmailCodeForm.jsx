import { useEffect, useState } from "react";
import { KeyRound, Mail, User } from "lucide-react";
import { friendlyAuthMessage, requestEmailCode, verifyEmailCode } from "./authClient";

const RESEND_COOLDOWN_SECONDS = 30;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none";

// Passwordless sign in: ask for an email, send a 6 digit code, verify it. Signing up and
// signing in are the same flow on the server, so `mode` only changes the copy and whether
// a name is collected.
export default function EmailCodeForm({ mode = "login", initialEmail = "", lockEmail = false, onSignedIn }) {
  const isSignup = mode === "signup";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    setError("");
    setLoading(true);
    try {
      await requestEmailCode(email.trim());
      setStep("code");
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setInfo(`We sent a 6 digit code to ${email.trim()}. It expires in 10 minutes.`);
    } catch (err) {
      setError(friendlyAuthMessage(err, "Could not send the code. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = await verifyEmailCode(email.trim(), code, isSignup ? fullName : "");
      onSignedIn(payload);
    } catch (err) {
      setError(friendlyAuthMessage(err, "Could not verify the code. Try again."));
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    if (step === "email") sendCode();
    else verify();
  };

  const submitLabel = () => {
    if (loading) return "Please wait";
    if (step === "email") return isSignup ? "Send verification code" : "Send login code";
    return isSignup ? "Verify and create account" : "Verify and sign in";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {step === "email" && isSignup && (
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            type="text"
            placeholder="Full name"
            autoComplete="name"
            required
            className={inputClass}
          />
        </div>
      )}

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder={isSignup ? "Work email" : "Email"}
          autoComplete="email"
          required
          readOnly={lockEmail || step === "code"}
          className={inputClass}
        />
      </div>

      {step === "code" && (
        <>
          {info && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
              {info}
            </p>
          )}
          <p className="text-xs text-slate-400">Can&apos;t find it? Check your spam or junk folder.</p>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="6 digit code"
              required
              pattern="\d{6}"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={sendCode}
              disabled={loading || cooldown > 0}
              className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            {!lockEmail && (
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                  setInfo("");
                }}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-50"
              >
                Use a different email
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
      >
        {submitLabel()}
      </button>
    </form>
  );
}
