import { useNavigate } from 'react-router-dom';

export default function Terms() {
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
          Terms of Service
        </h1>

        <p className="text-sm text-[#a3a3a3] mb-10">
          Effective date: January 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-[#a3a3a3]">
          
          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Structra.cloud, you agree to be bound by
              these Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              2. Use of the Platform
            </h2>
            <p>
              You may use Structra.cloud solely for lawful business and
              engineering purposes. You agree not to misuse, disrupt, or
              attempt to gain unauthorized access to the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              3. Accounts & Access
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
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
            <h2 className="text-lg font-medium text-white mb-2">
              5. AI & Evaluation Outputs
            </h2>
            <p>
              AI-generated evaluations and recommendations are provided for
              decision support purposes only. You remain solely responsible for
              final decisions and outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              6. Availability & Changes
            </h2>
            <p>
              We may modify, suspend, or discontinue any part of the platform
              at any time. We do not guarantee uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Structra.cloud shall not
              be liable for any indirect, incidental, or consequential damages
              arising from use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              8. Termination
            </h2>
            <p>
              We may suspend or terminate access for violations of these Terms
              or for conduct that poses a risk to the platform or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
              9. Governing Law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with
              applicable laws, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">
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
