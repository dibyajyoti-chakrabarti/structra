import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatDateLabel, getDaysRemaining } from "../utils/dateUtils";

export default function PlanExpirationBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  const isAuthenticated = Boolean(localStorage.getItem("access"));
  const currentPlan = (user?.current_plan || "CORE").toUpperCase();
  const expiresAt = user?.plan_expires_at || null;
  const daysRemaining = useMemo(() => getDaysRemaining(expiresAt), [expiresAt]);

  if (!isVisible) return null;
  if (!isAuthenticated) return null;
  if (currentPlan === "CORE") return null;
  if (daysRemaining == null) return null;
  if (daysRemaining > 3) return null;

  const displayDays = Math.max(daysRemaining, 0);
  const displayDate = formatDateLabel(expiresAt);

  return (
    <div className="relative z-[130] w-full bg-red-600 text-white">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <p className="flex-1 text-sm font-semibold leading-tight">
          {`Your ${currentPlan} plan expires in ${displayDays} days on ${displayDate}. Avoid interruption.`}
        </p>
        <Link
          to="/pricing"
          className="rounded-md bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-red-700 transition hover:bg-red-100"
        >
          Renew Now
        </Link>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="rounded-md p-1 text-white/90 transition hover:bg-red-700 hover:text-white"
          aria-label="Dismiss plan expiration banner"
        >
          X
        </button>
      </div>
    </div>
  );
}
