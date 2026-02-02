import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-blue-500/30">
      {/* Top Navigation Bar */}
      <nav className="border-b border-[#1f1f1f] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
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
            <div className="h-6 w-px bg-[#2a2a2a] hidden sm:block" />
            <button
              onClick={() => {
                // Check if user is authenticated (adjust 'token' if your key is named differently)
                const isAuthenticated = localStorage.getItem("token");
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
            Privacy Policy
          </h1>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
            <span>Effective: Jan 2026</span>
            <span className="w-1 h-1 bg-[#2a2a2a] rounded-full" />
            <span className="text-[#6b6b6b]">Version 1.0.0</span>
          </div>
        </header>

        {/* Text Layout Fixes */}
        <div className="space-y-16">
          <section className="group">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3 tracking-tight">
              <span className="text-blue-500 text-sm font-mono">01.</span>
              Data Collection
            </h2>
            <div className="text-[#a3a3a3] text-base leading-loose space-y-4">
              <p>
                We collect information necessary to provide system modeling
                services, including account identifiers, workspace
                configurations, and technical telemetry.
              </p>
              <p>
                Our primary goal is to provide a seamless{" "}
                <span className="text-white">Decision Intelligence</span>
                experience while ensuring your architectural data remains
                isolated and secure.
              </p>
            </div>
          </section>

          <section className="group">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3 tracking-tight">
              <span className="text-blue-500 text-sm font-mono">02.</span>
              Information Security
            </h2>
            <div className="text-[#a3a3a3] text-base leading-loose">
              <p>
                Structra.cloud employs industry-standard AES-256 encryption at
                rest and TLS 1.3 in transit. We conduct regular third-party
                security audits to maintain enterprise-grade protection for your
                intelligence assets.
              </p>
            </div>
          </section>

          {/* Contact Section - Stylized for the footer of the page */}
          <section className="pt-10 border-t border-[#1f1f1f]">
            <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-2">
                Questions regarding privacy?
              </h3>
              <p className="text-sm text-[#6b6b6b] mb-6">
                Our legal and security teams are here to help.
              </p>
              <a
                href="mailto:support@structra.cloud"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-200 transition-all"
              >
                Contact Security Team
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
