import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleGoogleLogin = () => {
    // Assume OAuth success
    navigate('/app');
  };

  const handlePasswordLogin = () => {
    // Assume JWT login success
    navigate('/app');
  };

  const handleSendOtp = () => {
    // Assume OTP sent
    setOtpSent(true);
  };

  const handleVerifyOtp = () => {
    // Assume OTP verified + JWT issued
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] p-8">
      
      {/* Top Bar with Close */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={() => navigate(-1)}
          className="text-[#a3a3a3] hover:text-white transition text-xl"
        >
          ✕
        </button>

        <div className="text-sm text-[#6b6b6b]">
          structra.cloud
        </div>

        <div />
      </div>

      {/* Auth Container */}
      <div className="max-w-md mx-auto border border-[#1f1f1f] rounded-lg bg-[#0f0f0f] p-8">
        <h1 className="text-2xl font-semibold mb-2">
          Sign in
        </h1>
        <p className="text-sm text-[#a3a3a3] mb-8">
          Access your workspaces and system models.
        </p>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full mb-6 px-4 py-2 border border-[#2a2a2a] rounded-md hover:bg-[#111111] transition text-sm"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#1f1f1f]" />
          <span className="text-xs text-[#6b6b6b]">or</span>
          <div className="flex-1 h-px bg-[#1f1f1f]" />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs text-[#a3a3a3] mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
            placeholder="you@company.com"
          />
        </div>

        {/* Password or OTP Toggle */}
        {!otpMode && (
          <>
            <div className="mb-6">
              <label className="block text-xs text-[#a3a3a3] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handlePasswordLogin}
              className="w-full mb-4 px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
            >
              Sign in with Password
            </button>
          </>
        )}

        {/* OTP Flow */}
        {otpMode && (
          <>
            {!otpSent && (
              <button
                onClick={handleSendOtp}
                className="w-full mb-4 px-4 py-2 border border-[#2a2a2a] rounded-md hover:bg-[#111111] transition text-sm"
              >
                Send one-time code
              </button>
            )}

            {otpSent && (
              <>
                <div className="mb-4">
                  <label className="block text-xs text-[#a3a3a3] mb-1">
                    One-time code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                    placeholder="Enter code"
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  className="w-full mb-4 px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
                >
                  Verify & Sign in
                </button>
              </>
            )}
          </>
        )}

        {/* Toggle Auth Mode */}
        <button
          onClick={() => {
            setOtpMode(!otpMode);
            setOtpSent(false);
          }}
          className="w-full text-xs text-[#a3a3a3] hover:text-white transition mt-2"
        >
          {otpMode
            ? 'Use password instead'
            : 'Use one-time code instead'}
        </button>

        {/* Footer Links */}
        <div className="mt-8 text-xs text-[#6b6b6b] flex justify-between">
          <button onClick={() => navigate('/signup')} className="hover:text-white transition">
            Create account
          </button>
          <button onClick={() => navigate('/privacy')} className="hover:text-white transition">
            Privacy
          </button>
        </div>
      </div>
    </div>
  );
}
