import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      
      {/* Top Navigation Bar (matches Pricing.jsx) */}
      <nav className="border-b border-[#1f1f1f] bg-[#0a0a0a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm hidden sm:inline">Back</span>
            </button>

            <div className="h-6 w-px bg-[#2a2a2a] hidden sm:block" />

            <button
              onClick={() => navigate('/')}
              className="text-lg sm:text-xl font-semibold tracking-tight text-white hover:text-[#a3a3a3] transition-colors"
            >
              structra.cloud
            </button>
          </div>

          <button
            onClick={() => navigate('/signup')}
            className="px-4 sm:px-5 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition-all text-sm"
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* Header Section (matches Pricing header style) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
            Terms of Service
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#a3a3a3] leading-relaxed">
            Effective date: January 2026
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-12 text-sm leading-relaxed text-[#a3a3a3]">
          
          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Structra.cloud, you agree to be bound by
              these Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              2. Use of the Platform
            </h2>
            <p>
              You may use Structra.cloud solely for lawful business and
              engineering purposes. You agree not to misuse, disrupt, or
              attempt to gain unauthorized access to the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              3. Accounts & Access
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              4. Customer Content
            </h2>
            <p>
              You retain ownership of your system models, documentation, and
              other content submitted to Structra.cloud. You grant Structra.cloud
              a limited license to process such content solely to provide and
              operate the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              5. AI & Evaluation Outputs
            </h2>
            <p>
              AI-generated evaluations and recommendations are provided for
              decision support purposes only. You remain solely responsible for
              final decisions and outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              6. Availability & Changes
            </h2>
            <p>
              We may modify, suspend, or discontinue any part of the platform
              at any time. We do not guarantee uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Structra.cloud shall not
              be liable for any indirect, incidental, or consequential damages
              arising from use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              8. Termination
            </h2>
            <p>
              We may suspend or terminate access for violations of these Terms
              or for conduct that poses a risk to the platform or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              9. Governing Law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with
              applicable laws, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              10. Contact
            </h2>
            <p>
              For questions regarding these Terms, contact us at{' '}
              <span className="text-white">support@structra.cloud</span>.
            </p>
          </section>

        </div>
      </div>

    </div>
  );
}
