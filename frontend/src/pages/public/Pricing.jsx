import { useNavigate } from 'react-router-dom';

export default function Pricing() {
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

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-16">
        <h1 className="text-4xl font-semibold tracking-tight">
          Pricing
        </h1>
        <p className="mt-3 text-[#a3a3a3] max-w-2xl">
          Choose the plan that matches your system complexity, collaboration needs,
          and governance requirements.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Core Tier */}
        <div className="border border-[#2a2a2a] rounded-lg p-8 bg-[#0f0f0f] flex flex-col">
          <div>
            <h2 className="text-2xl font-medium">Core</h2>
            <p className="mt-2 text-sm text-[#a3a3a3]">
              For individual engineers and early-stage system modeling.
            </p>
          </div>

          <ul className="mt-8 space-y-3 text-sm text-[#a3a3a3]">
            <li>• Visual system modeling canvas</li>
            <li>• Relationship & assumption modeling</li>
            <li>• AI-assisted evaluation (limited)</li>
            <li>• Single workspace</li>
            <li>• Standard documentation</li>
            <li>• Community support</li>
          </ul>

          <div className="mt-auto pt-8">
            <button
              disabled
              className="w-full px-4 py-2 border border-[#2a2a2a] text-[#6b6b6b] rounded-md cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>
        </div>

        {/* Enterprise Tier */}
        <div className="border border-white rounded-lg p-8 bg-[#0a0a0a] flex flex-col">
          <div>
            <h2 className="text-2xl font-medium">Enterprise</h2>
            <p className="mt-2 text-sm text-[#a3a3a3]">
              For teams that require governance, collaboration, and advanced analysis.
            </p>
          </div>

          <ul className="mt-8 space-y-3 text-sm text-[#a3a3a3]">
            <li>• Everything in Core</li>
            <li>• Advanced AI evaluation workflows</li>
            <li>• Risk & trade-off analysis</li>
            <li>• Role-based access control (RBAC)</li>
            <li>• Audit logs & activity history</li>
            <li>• Multiple workspaces</li>
            <li>• Visibility & governance policies</li>
            <li>• Executive presentation mode</li>
            <li>• Priority support</li>
          </ul>

          <div className="mt-auto pt-8">
            <button
              className="w-full px-4 py-2 bg-white text-black rounded-md font-medium hover:bg-neutral-200 transition"
            >
              Upgrade to Enterprise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
