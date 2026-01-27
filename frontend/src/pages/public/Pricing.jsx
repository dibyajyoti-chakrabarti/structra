import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      {/* Top Navigation Bar */}
      <nav className="border-b border-[#1f1f1f] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            {/* Back Button */}
            <button
              onClick={() => navigate("/")}
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

            {/* Brand Logo & Name */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 transition-transform active:scale-95 group"
            >
              <img
                src={logo}
                alt="structra logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-xl font-extrabold tracking-tighter text-white">
                structra<span className="text-blue-500">.cloud</span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-[#a3a3a3] hover:text-white transition-colors mr-4"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-lg hover:bg-neutral-200 transition-all shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#a3a3a3] leading-relaxed">
            Choose the plan that matches your system complexity, collaboration
            needs, and governance requirements. Scale as you grow.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 max-w-6xl mx-auto">
          {/* Core Tier */}
          <div className="border border-[#2a2a2a] rounded-2xl p-6 sm:p-8 lg:p-10 bg-[#0f0f0f] flex flex-col hover:border-[#3a3a3a] transition-all duration-300">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium mb-2">Core</h2>
                <p className="text-sm sm:text-base text-[#a3a3a3]">
                  For individual engineers and early-stage system modeling
                </p>
              </div>
              <div className="px-3 py-1 bg-[#1f1f1f] rounded-full text-xs font-medium text-[#a3a3a3]">
                Current
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-light">$0</span>
                <span className="text-[#6b6b6b] text-sm">/month</span>
              </div>
              <p className="text-xs text-[#6b6b6b] mt-2">
                Free forever for core features
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-medium text-[#f5f5f5] mb-4">
                What's included:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-[#a3a3a3]"
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
                  <span className="text-sm text-[#a3a3a3]">
                    Visual system modeling canvas
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-[#a3a3a3]"
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
                  <span className="text-sm text-[#a3a3a3]">
                    Relationship & assumption modeling
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-[#a3a3a3]"
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
                  <span className="text-sm text-[#a3a3a3]">
                    AI-assisted evaluation (limited)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-[#a3a3a3]"
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
                  <span className="text-sm text-[#a3a3a3]">
                    Single workspace
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-[#a3a3a3]"
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
                  <span className="text-sm text-[#a3a3a3]">
                    Standard documentation
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-[#a3a3a3]"
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
                  <span className="text-sm text-[#a3a3a3]">
                    Community support
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-auto">
              <button
                disabled
                className="w-full px-4 py-3 border border-[#2a2a2a] text-[#6b6b6b] rounded-lg cursor-not-allowed text-sm font-medium"
              >
                Current Plan
              </button>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="border-2 border-white rounded-2xl p-6 sm:p-8 lg:p-10 bg-[#0a0a0a] flex flex-col relative hover:border-neutral-200 transition-all duration-300 shadow-lg shadow-white/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black rounded-full text-xs font-medium">
              Popular
            </div>

            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium mb-2">
                  Enterprise
                </h2>
                <p className="text-sm sm:text-base text-[#a3a3a3]">
                  For teams requiring governance and advanced analysis
                </p>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-light">Custom</span>
              </div>
              <p className="text-xs text-[#6b6b6b] mt-2">
                Contact us for pricing tailored to your needs
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-medium text-[#f5f5f5] mb-4">
                Everything in Core, plus:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Advanced AI evaluation workflows
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Risk & trade-off analysis
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Role-based access control (RBAC)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Audit logs & activity history
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Multiple workspaces
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Visibility & governance policies
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Executive presentation mode
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    Priority support & dedicated success manager
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3 text-green-500"
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
                  <span className="text-sm text-[#f5f5f5]">
                    SSO & advanced security
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-auto">
              <button
                onClick={() => navigate("/signup")}
                className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-all duration-200 shadow-lg text-sm"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 border-t border-[#1f1f1f]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-3">
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="text-[#a3a3a3] text-sm leading-relaxed">
                Yes, you can upgrade to Enterprise at any time. Contact our
                sales team to discuss your needs and we'll help you transition
                smoothly.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">
                What payment methods do you accept?
              </h3>
              <p className="text-[#a3a3a3] text-sm leading-relaxed">
                We accept all major credit cards, ACH transfers, and can arrange
                custom invoicing for Enterprise customers with annual contracts.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">
                Is there a free trial for Enterprise?
              </h3>
              <p className="text-[#a3a3a3] text-sm leading-relaxed">
                Yes, we offer a 14-day free trial of Enterprise features.
                Contact our sales team to get started with a demo and trial
                access.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">
                What kind of support do you offer?
              </h3>
              <p className="text-[#a3a3a3] text-sm leading-relaxed">
                Core users have access to community support and documentation.
                Enterprise customers receive priority email and chat support,
                plus a dedicated customer success manager.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 border-t border-[#1f1f1f]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-light mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg text-[#a3a3a3] mb-8">
            Join enterprise teams using Structra.cloud to model, evaluate, and
            govern complex systems.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-all duration-200 shadow-lg text-sm"
            >
              Start Free
            </button>
            <button
              onClick={() => navigate("/contact")}
              className="w-full sm:w-auto px-8 py-4 border-2 border-[#2a2a2a] text-white rounded-lg hover:bg-[#111111] transition-all duration-200 text-sm"
            >
              Talk to Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
