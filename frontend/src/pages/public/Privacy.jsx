import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

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

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">
          Privacy Policy
        </h1>

        <p className="text-sm text-[#a3a3a3] mb-10">
          Effective date: January 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-[#a3a3a3]">
          
          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              1. Information We Collect
            </h2>
            <p>
              We collect information necessary to provide, operate, and improve
              Structra.cloud. This may include account information, usage data,
              system models, and technical metadata generated through platform use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              2. How We Use Information
            </h2>
            <p>
              Information is used to operate the platform, provide AI-powered
              evaluation, improve system performance, ensure security, and
              support governance and auditability features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              3. Data Ownership
            </h2>
            <p>
              Customers retain ownership of their system models, documentation,
              and associated data. Structra.cloud does not claim ownership over
              customer-submitted content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              4. Data Security
            </h2>
            <p>
              We implement technical and organizational measures designed to
              protect customer data, including access controls, logging, and
              monitoring consistent with enterprise best practices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              5. Data Sharing
            </h2>
            <p>
              We do not sell customer data. Data may be shared with trusted
              service providers solely to operate and support the platform,
              subject to confidentiality and security obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              6. Compliance & Legal
            </h2>
            <p>
              Structra.cloud is designed to support enterprise compliance needs.
              We may disclose information where required by law or to protect
              platform security and integrity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              7. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy periodically. Material changes
              will be reflected by updating the effective date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
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
