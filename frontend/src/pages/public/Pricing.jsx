import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
      {/* Top Navigation Bar - Fixed Height, Flex-none */}
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

      {/* Main Content Body - Scrollable */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl mx-auto pb-12">
          {/* Header Section */}
          <header className="mb-8 sm:mb-10 border-b border-[#1f1f1f] pb-6 sm:pb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white mb-4 sm:mb-6">
              Pricing Plans
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <span>Monthly Billing</span>
                <span className="w-1 h-1 bg-[#2a2a2a] rounded-full" />
                <span className="text-[#6b6b6b]">Cancel Anytime</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-[#a3a3a3] leading-relaxed max-w-xl">
              Choose the plan that matches your system complexity and governance
              requirements.
            </p>
          </header>

          {/* Pricing Cards Grid - Stacks on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Core Tier */}
            <div className="border border-[#2a2a2a] rounded-2xl p-5 sm:p-6 bg-[#0f0f0f] flex flex-col hover:border-[#3a3a3a] transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">
                    Core
                  </h2>
                  <p className="text-xs text-[#a3a3a3]">
                    For individual engineers
                  </p>
                </div>
                <div className="px-2 py-1 bg-[#1f1f1f] rounded-full text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                  Free
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tighter">
                    $0
                  </span>
                  <span className="text-[#6b6b6b] text-xs font-medium">
                    /month
                  </span>
                </div>
              </div>

              <div className="mb-6 flex-1">
                <ul className="space-y-3">
                  {[
                    "Visual system modeling canvas",
                    "Relationship & assumption modeling",
                    "AI-assisted evaluation (limited)",
                    "Single workspace",
                    "Community support",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-2.5 h-2.5 text-[#a3a3a3]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-[#a3a3a3] leading-tight">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                disabled
                className="w-full py-2.5 border border-[#2a2a2a] text-[#6b6b6b] rounded-lg cursor-not-allowed text-xs font-bold uppercase tracking-wider"
              >
                Current Plan
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="border-2 border-white rounded-2xl p-5 sm:p-6 bg-[#0a0a0a] flex flex-col relative shadow-2xl shadow-white/5 mt-4 lg:mt-0">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                Most Popular
              </div>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">
                    Enterprise
                  </h2>
                  <p className="text-xs text-[#a3a3a3]">
                    For teams requiring governance
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tighter">
                    Custom
                  </span>
                </div>
              </div>

              <div className="mb-6 flex-1">
                <ul className="space-y-3">
                  {[
                    "Advanced AI evaluation workflows",
                    "Role-based access control (RBAC)",
                    "Audit logs & activity history",
                    "Multiple workspaces",
                    "SSO & advanced security",
                    "Dedicated success manager",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg
                          className="w-2.5 h-2.5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="text-sm text-[#f5f5f5] leading-tight">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => navigate("/signup")}
                className="w-full py-2.5 bg-white text-black rounded-lg font-bold hover:bg-neutral-200 transition-all duration-200 text-xs uppercase tracking-wider"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
