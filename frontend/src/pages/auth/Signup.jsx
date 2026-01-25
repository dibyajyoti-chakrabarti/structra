import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Signup() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSignup = () => {
    // Assume account created + verification email sent
    setSubmitted(true);
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
        {!submitted ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">
              Create your account
            </h1>
            <p className="text-sm text-[#a3a3a3] mb-8">
              Create a Structra.cloud account. You will need to verify your email
              before signing in.
            </p>

            {/* First Name */}
            <div className="mb-4">
              <label className="block text-xs text-[#a3a3a3] mb-1">
                First name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                placeholder="First name"
              />
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <label className="block text-xs text-[#a3a3a3] mb-1">
                Last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                placeholder="Last name"
              />
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

            {/* Password */}
            <div className="mb-4">
              <label className="block text-xs text-[#a3a3a3] mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                placeholder="Create a strong password"
              />
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-xs text-[#a3a3a3] mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-md text-sm focus:outline-none focus:border-white"
                placeholder="Re-enter password"
              />
            </div>

            <button
              onClick={handleSignup}
              className="w-full mb-4 px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
            >
              Create account
            </button>

            <p className="text-xs text-[#6b6b6b] mt-4">
              By creating an account, you agree to our{' '}
              <button
                onClick={() => navigate('/terms')}
                className="hover:text-white underline"
              >
                Terms
              </button>{' '}
              and{' '}
              <button
                onClick={() => navigate('/privacy')}
                className="hover:text-white underline"
              >
                Privacy Policy
              </button>.
            </p>

            <div className="mt-6 text-xs text-[#6b6b6b]">
              <button
                onClick={() => navigate('/login')}
                className="hover:text-white transition"
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-4">
              Verify your email
            </h1>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">
              We’ve sent a verification link to <span className="text-white">{email}</span>.
              Please check your inbox and verify your email before signing in.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="w-full mt-8 px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
            >
              Go to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
