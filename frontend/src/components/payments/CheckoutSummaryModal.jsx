import { Minus, Plus, X } from "lucide-react";

const PLAN_PRICES = {
  INDIVIDUAL: 599,
  TEAM: 349,
};

const PLAN_FEATURES = {
  INDIVIDUAL: [
    "50 AI credits per month",
    "Private workspaces with IAM controls",
    "Premium canvas evaluation features",
  ],
  TEAM: [
    "80 AI credits per purchased seat per month",
    "Real-time collaboration and governance",
    "Priority support with team controls",
  ],
};

const normalizePlan = (planName) => (planName || "INDIVIDUAL").toUpperCase();

export default function CheckoutSummaryModal({
  open,
  planName,
  quantity = 1,
  onQuantityChange,
  onClose,
  onProceed,
  isProcessing = false,
}) {
  if (!open) return null;

  const plan = normalizePlan(planName);
  const isTeam = plan === "TEAM";
  const unitPrice = PLAN_PRICES[plan] || PLAN_PRICES.INDIVIDUAL;
  const lockedQuantity = isTeam ? Math.max(Number(quantity) || 1, 1) : 1;
  const total = unitPrice * lockedQuantity;
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.INDIVIDUAL;

  const handleInputChange = (event) => {
    if (!isTeam) return;
    const parsed = Number.parseInt(event.target.value, 10);
    onQuantityChange(Number.isFinite(parsed) ? Math.max(parsed, 1) : 1);
  };

  const decrement = () => {
    if (!isTeam) return;
    onQuantityChange(Math.max(lockedQuantity - 1, 1));
  };

  const increment = () => {
    if (!isTeam) return;
    onQuantityChange(lockedQuantity + 1);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">Order Summary</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.08em] text-slate-500">Structra Billing</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close order summary"
            disabled={isProcessing}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Plan Tier</span>
              <span className="font-semibold text-slate-900">{plan}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Unit Price</span>
              <span className="font-semibold text-slate-900">₹{unitPrice}/month</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Quantity</span>
              {isTeam ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={decrement}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                    disabled={isProcessing}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={lockedQuantity}
                    onChange={handleInputChange}
                    className="h-8 w-16 rounded-md border border-slate-300 text-center text-sm font-semibold text-slate-900 outline-none focus:border-blue-500"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={increment}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100"
                    disabled={isProcessing}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ) : (
                <span className="font-semibold text-slate-900">1</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Billing Period</span>
              <span className="font-semibold text-slate-900">Monthly</span>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">You are unlocking</p>
            <ul className="mt-3 space-y-2">
              {features.map((feature) => (
                <li key={feature} className="text-sm text-slate-700">
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-b-xl border-t border-gray-200 bg-slate-50 px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Due Today</span>
            <span className="text-2xl font-black tracking-tight text-slate-900">₹{total}/month</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onProceed}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isProcessing}
            >
              {isProcessing ? "Opening Checkout..." : "Proceed to Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
