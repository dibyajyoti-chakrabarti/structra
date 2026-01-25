import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';


export default function Lander() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      {/* Navbar */}
    <Navbar />
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 pt-24 pb-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Enterprise AI for<br />
            System Modeling &<br />
            Decision Intelligence
          </h1>

          <p className="mt-6 text-lg text-[#a3a3a3] leading-relaxed">
            Structra.cloud is an enterprise AI platform for modeling complex systems,
            evaluating trade-offs, and turning architectures into analyzable,
            decision-ready models.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-neutral-200 transition"
            >
              Request Access
            </button>

            <button
              onClick={() => navigate('/pricing')}
              className="px-6 py-3 border border-[#2a2a2a] text-white rounded-md hover:bg-[#111111] transition"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-lg font-medium">
              Visual System Modeling
            </h3>
            <p className="mt-3 text-sm text-[#a3a3a3] leading-relaxed">
              Design complex technical and business systems on a collaborative
              canvas with structured relationships and assumptions.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">
              AI-Driven Evaluation
            </h3>
            <p className="mt-3 text-sm text-[#a3a3a3] leading-relaxed">
              Analyze performance, risks, and trade-offs using AI-powered
              evaluation workflows built for engineering rigor.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium">
              Governance & Auditability
            </h3>
            <p className="mt-3 text-sm text-[#a3a3a3] leading-relaxed">
              Role-based access, visibility policies, and detailed activity logs
              ensure accountability and enterprise-grade collaboration.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="border-t border-[#1f1f1f] bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-3xl font-semibold">
              Built for Engineering,
              Architecture & Operations
            </h2>

            <p className="mt-5 text-[#a3a3a3] leading-relaxed">
              Structra.cloud supports the full lifecycle — from system design
              to AI-powered evaluation and executive-ready decision support.
              Documentation, governance, and presentation modes are first-class
              citizens.
            </p>
          </div>

          <div className="border border-[#1f1f1f] rounded-lg p-8 bg-[#0a0a0a]">
            <ul className="space-y-4 text-sm text-[#a3a3a3]">
              <li>• Workspaces & role-based access control</li>
              <li>• Visibility policies & audit logs</li>
              <li>• Integrated documentation</li>
              <li>• Evaluation workflows</li>
              <li>• Executive presentation modes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-8 py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold">
              Turn architectures into decision-ready systems.
            </h2>
            <p className="mt-2 text-[#a3a3a3]">
              Start modeling, evaluating, and governing complex systems with confidence.
            </p>
          </div>

          <button
            onClick={() => navigate('/signup')}
            className="px-6 py-3 bg-white text-black font-medium rounded-md hover:bg-neutral-200 transition"
          >
            Get Started
          </button>
        </div>
      </section>
      {/* Footer */}
    <Footer />
    </div>
  );
}
