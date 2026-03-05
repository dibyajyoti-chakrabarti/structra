export default function PaymentSuccessOverlay({ open, message }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 px-4 backdrop-blur-md">
      <style>
        {`
          @keyframes payment-check-circle {
            from { stroke-dashoffset: 126; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes payment-check-path {
            from { stroke-dashoffset: 36; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes payment-soft-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
          }
        `}
      </style>

      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50" style={{ animation: "payment-soft-pulse 1.8s ease-in-out infinite" }}>
          <svg viewBox="0 0 52 52" className="h-12 w-12" fill="none" aria-hidden="true">
            <circle
              cx="26"
              cy="26"
              r="20"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="126"
              strokeDashoffset="126"
              style={{ animation: "payment-check-circle 0.55s ease-out forwards" }}
            />
            <path
              d="M17 26.5l6 6L35 20"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="36"
              strokeDashoffset="36"
              style={{ animation: "payment-check-path 0.45s ease-out 0.35s forwards" }}
            />
          </svg>
        </div>

        <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-900">Payment Successful</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {message || "Provisioning your workspace..."}
        </p>
      </div>
    </div>
  );
}
