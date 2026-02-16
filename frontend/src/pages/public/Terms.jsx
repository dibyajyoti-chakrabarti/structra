import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-blue-500/30">
      {/* Top Navigation Bar */}
      <nav className="border-b border-[#1f1f1f] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#a3a3a3] hover:text-white transition-colors group"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-[#2a2a2a] hidden sm:block" />

            {/* Brand Logo & Name */}
            <button
              onClick={() => {
                const isAuthenticated = localStorage.getItem("access");
                navigate(isAuthenticated ? "/app" : "/");
              }}
              className="flex items-center gap-3 transition-transform active:scale-95"
            >
              <img
                src={logo}
                alt="Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-xl font-extrabold tracking-tighter text-white">
                structra<span className="text-blue-500">.cloud</span>
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Body */}
      <main className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        {/* Header Section */}
        <header className="mb-16 border-b border-[#1f1f1f] pb-10">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white mb-6">
            Terms of Service
          </h1>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
            <span>Effective: Jan 2024</span>
            <span className="w-1 h-1 bg-[#2a2a2a] rounded-full" />
            <span className="text-[#6b6b6b]">Version 1.0.1</span>
          </div>
        </header>

        {/* Legal Content with Standardized Spacing */}
        <div className="space-y-16">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3 tracking-tight">
              <span className="text-blue-500 text-sm font-mono">01.</span>
              Acceptance of Terms
            </h2>
            <div className="text-[#a3a3a3] text-base leading-loose">
              <p>
                By accessing or using Structra.cloud, you agree to be bound by
                these Terms of Service. Our platform provides enterprise-grade
                system modeling and decision intelligence tools. If you do not
                agree to these terms, please discontinue use of the platform
                immediately.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3 tracking-tight">
              <span className="text-blue-500 text-sm font-mono">02.</span>
              User Accounts
            </h2>
            <div className="text-[#a3a3a3] text-base leading-loose">
              <p>
                Users must provide accurate information when creating an
                account. You are responsible for maintaining the security of
                your workspace, API keys, and password. Structra Cloud cannot be
                held liable for any loss or damage from your failure to comply
                with this security obligation.
              </p>
            </div>
          </section>

          {/* ... Follow this pattern for sections 03-09 ... */}

          <section className="pt-10 border-t border-[#1f1f1f]">
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-2">
                Legal Inquiry?
              </h3>
              <p className="text-sm text-[#6b6b6b] mb-6">
                Reach out to our compliance department for specific regulatory
                or enterprise agreement questions.
              </p>
              <a
                href="mailto:support@structra.cloud"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 transition-all"
              >
                Contact Legal Team
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
