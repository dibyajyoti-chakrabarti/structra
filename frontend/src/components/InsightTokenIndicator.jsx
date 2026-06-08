import { Coins } from 'lucide-react';

export default function InsightTokenIndicator({ remaining }) {
  const safeRemaining = Number.isFinite(Number(remaining)) ? Number(remaining) : 0;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">
      <Coins size={12} className="text-amber-500" />
      <span>{safeRemaining} Insight Tokens remaining today</span>
    </div>
  );
}
