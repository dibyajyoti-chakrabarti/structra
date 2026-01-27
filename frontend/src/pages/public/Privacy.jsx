import { useNavigate } from 'react-router-dom';

export default function Privacy() {
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

      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#a3a3a3] leading-relaxed">
            Effective date: January 2026
          </p>
        </div>
      </div>

      {/* Privacy Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-12 text-sm leading-relaxed text-[#a3a3a3]">
          
          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              1. Information We Collect
            </h2>
            <p>
              We collect information necessary to provide, operate, and improve
              Structra.cloud. This may include account information, usage data,
              system models, and technical metadata generated through platform use.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              2. How We Use Information
            </h2>
            <p>
              Information is used to operate the platform, provide AI-powered
              evaluation, improve system performance, ensure security, and
              support governance and auditability features.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              3. Data Ownership
            </h2>
            <p>
              Customers retain ownership of their system models, documentation,
              and associated data. Structra.cloud does not claim ownership over
              customer-submitted content.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              4. Data Security
            </h2>
            <p>
              We implement technical and organizational measures designed to
              protect customer data, including access controls, logging, and
              monitoring consistent with enterprise best practices.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              5. Data Sharing
            </h2>
            <p>
              We do not sell customer data. Data may be shared with trusted
              service providers solely to operate and support the platform,
              subject to confidentiality and security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              6. Compliance & Legal
            </h2>
            <p>
              Structra.cloud is designed to support enterprise compliance needs.
              We may disclose information where required by law or to protect
              platform security and integrity.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              7. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy periodically. Material changes
              will be reflected by updating the effective date.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-medium text-white mb-3">
              8. Contact
            </h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <span className="text-white">support@structra.cloud</span>.
            </p>
          </section>

        </div>
      </div>

    </div>
  );
}
