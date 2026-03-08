import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import useRazorpayCheckout from "../../hooks/useRazorpayCheckout";
import CheckoutSummaryModal from "../../components/payments/CheckoutSummaryModal";
import PaymentSuccessOverlay from "../../components/payments/PaymentSuccessOverlay";
import { useAuth } from "../../contexts/AuthContext";

const plans = [
  {
    name: "CORE",
    label: "Core",
    price: "₹0",
    interval: "/month",
    subtitle: "Student and explorer tier",
    cta: "Start Free",
    highlighted: false,
    features: [
      "1 personal workspace",
      "Up to 3 systems per workspace",
      "20 basic evaluation rules",
      "5 AI evaluation credits / month",
      "Public workspace option",
      "Cannot invite members",
      "Community support",
    ],
  },
  {
    name: "INDIVIDUAL",
    label: "Individual",
    price: "₹599",
    interval: "/month",
    subtitle: "Serious solo architecture work",
    cta: "Start Individual Plan",
    highlighted: false,
    features: [
      "Up to 5 workspaces",
      "All 50+ evaluation rules",
      "50 AI credits / month",
      "Invite up to 3 members (+₹249/seat)",
      "Private workspaces + full IAM",
      "Version history (60 days)",
      "Advanced architecture templates",
      "Priority community support",
    ],
  },
  {
    name: "TEAM",
    label: "Team",
    price: "₹349",
    interval: "/seat/month",
    subtitle: "Collaboration-first plan",
    cta: "Start with your team",
    highlighted: true,
    features: [
      "Unlimited workspaces and systems",
      "All 50+ evaluation rules",
      "80 AI credits/seat shared pool",
      "Overage toggle: ₹4/credit",
      "Real-time co-editing + governance",
      "Version history (90 days)",
      "Invite members up to purchased seat count",
      "Priority email support",
    ],
    note: "Starts at ₹698/month for 2 prepaid seats",
  },
  {
    name: "ENTERPRISE",
    label: "Enterprise",
    price: "Custom",
    interval: "",
    subtitle: "For organizations with compliance and scale needs",
    cta: "Contact Sales",
    highlighted: false,
    features: [
      "Everything in Team",
      "SSO (SAML / OIDC)",
      "SOC2-ready audit logs",
      "Data residency options",
      "99.9% uptime SLA",
      "Custom rules and policies",
      "Custom onboarding and training",
      "Dedicated success manager",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    startCheckout,
    isLoading: isCheckoutLoading,
    showSuccessOverlay,
    successOverlayMessage,
  } = useRazorpayCheckout();
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isCheckoutSummaryOpen, setIsCheckoutSummaryOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState(2);
  const isAuthenticated = Boolean(localStorage.getItem("access"));
  const currentPlan = isAuthenticated
    ? (user?.current_plan || "CORE").toUpperCase()
    : "CORE";

  const closePaymentModal = () => {
    setPaymentStatus("idle");
    setStatusMessage("");
  };

  const openCheckoutSummary = (planName) => {
    const normalizedPlan = (planName || "INDIVIDUAL").toUpperCase();
    setCheckoutPlan(normalizedPlan);
    setCheckoutQuantity(normalizedPlan === "TEAM" ? 2 : 1);
    setPaymentStatus("idle");
    setStatusMessage("");
    setIsCheckoutSummaryOpen(true);
  };

  const closeCheckoutSummary = () => {
    if (isCheckoutLoading) return;
    setIsCheckoutSummaryOpen(false);
  };

  const handleProceedToPayment = async () => {
    if (!checkoutPlan) return;
    const resolvedQuantity =
      checkoutPlan === "TEAM" ? Math.max(Number(checkoutQuantity) || 1, 1) : 1;

    setIsCheckoutSummaryOpen(false);
    setPaymentStatus("processing");
    setStatusMessage("Opening secure checkout...");
    const result = await startCheckout(checkoutPlan, resolvedQuantity);
    if ((result?.status || "failed") === "failed") {
      setPaymentStatus("failed");
      setStatusMessage(result?.message || "Unable to complete checkout.");
    } else {
      setPaymentStatus("idle");
      setStatusMessage("");
    }
  };

  const handlePlanCta = async (planName) => {
    const normalizedPlan = (planName || "CORE").toUpperCase();

    if (normalizedPlan === "ENTERPRISE") {
      window.location.href = "mailto:support@structra.cloud";
      return;
    }

    if (normalizedPlan === currentPlan) {
      if (normalizedPlan === "INDIVIDUAL" || normalizedPlan === "TEAM") {
        navigate("/app/profile");
      }
      return;
    }

    if (normalizedPlan === "INDIVIDUAL" || normalizedPlan === "TEAM") {
      if (!localStorage.getItem("access")) {
        setPaymentStatus("failed");
        setStatusMessage("Please log in first to continue with payment.");
        return;
      }
      openCheckoutSummary(normalizedPlan);
      return;
    }

    navigate("/signup");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-b from-blue-50 via-white to-white pt-24 sm:pt-28">
        <div className="pointer-events-none absolute -left-20 top-14 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Pricing
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Transparent plans for every stage
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Start free, collaborate with your team, and scale to enterprise
              governance when your architecture practice matures.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-4 lg:items-stretch">
          {plans.map((plan) => {
            const isCurrentPlan =
              plan.name.toUpperCase() === currentPlan;
            const isCheckoutProcessing =
              (plan.name === "INDIVIDUAL" || plan.name === "TEAM") &&
              (isCheckoutLoading || paymentStatus === "processing");
            const isPlanButtonDisabled = isCurrentPlan
              ? currentPlan === "CORE" || isCheckoutProcessing
              : isCheckoutProcessing;
            const ctaLabel = isCurrentPlan
              ? currentPlan === "CORE"
                ? "Current Plan"
                : (plan.name === "INDIVIDUAL" || plan.name === "TEAM")
                  ? "Manage Billing"
                  : "Current Plan"
              : isCheckoutProcessing
                ? "Processing..."
                : plan.cta;

            return (
              <article
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition ${
                  isCurrentPlan
                    ? "border-emerald-400 bg-white shadow-xl shadow-emerald-100 ring-2 ring-emerald-100"
                    : plan.highlighted
                      ? "border-blue-200 bg-white shadow-lg shadow-blue-100/80"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
                }`}
              >
              {/* Badge row — always reserves the same height */}
              <div className="mb-4 flex h-7 items-center">
                {isCurrentPlan ? (
                  <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                    Current Plan
                  </span>
                ) : plan.highlighted ? (
                  <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
                    Most Popular
                  </span>
                ) : null}
              </div>

              {/* Plan name + subtitle — fixed height so price row stays aligned */}
              <div className="min-h-[80px]">
                <h2 className="text-2xl font-black text-slate-900">{plan.label || plan.name}</h2>
                <p className="mt-1.5 text-sm leading-5 text-slate-500">{plan.subtitle}</p>
              </div>

              {/* Price row — fixed height so feature lists start at the same Y */}
              <div className="mt-3 flex min-h-[60px] items-end gap-1 border-b border-slate-100 pb-5">
                <span className="text-4xl font-black tracking-tight text-slate-900">
                  {plan.price}
                </span>
                {plan.interval && (
                  <span className="pb-1 text-sm font-semibold text-slate-400">
                    {plan.interval}
                  </span>
                )}
              </div>

              {/* Feature list — grows to fill available space, pushing CTA to the bottom */}
              <div className="mt-5 flex flex-1 flex-col">
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <CheckCircle2
                        size={15}
                        className="mt-0.5 flex-shrink-0 text-blue-500"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.note ? (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    {plan.note}
                  </p>
                ) : null}
              </div>

              {/* CTA — always pinned to the bottom */}
              <button
                onClick={() => handlePlanCta(plan.name)}
                disabled={isPlanButtonDisabled}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                  isCurrentPlan
                    ? (plan.name === "INDIVIDUAL" || plan.name === "TEAM")
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed border border-emerald-300 bg-emerald-50 text-emerald-700"
                    : plan.highlighted
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                } ${isCheckoutProcessing ? "cursor-not-allowed opacity-70" : ""}`}
              >
                {ctaLabel}
                {!isCurrentPlan && <ArrowRight size={16} />}
                {isCurrentPlan && (plan.name === "INDIVIDUAL" || plan.name === "TEAM") && !isCheckoutProcessing && (
                  <ArrowRight size={16} />
                )}
              </button>
              </article>
            );
          })}
          </div>
        </div>
      </section>

      <section className="border-y border-blue-100 bg-white py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Frequently Asked Questions
          </h3>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-bold text-slate-900">
                Why is Individual priced above Team per seat?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Individual is a premium solo experience. Team is priced per seat
                and positioned for collaboration, typically shown as a 2-seat
                baseline (₹698+/month).
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-bold text-slate-900">
                How does Team billing work?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Team billing is prepaid. You choose seat quantity at checkout,
                and invite capacity follows that purchased seat count.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-bold text-slate-900">
                Can Core users join paid workspaces?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes. Invited members inherit the workspace tier inside that
                workspace. Their own personal workspaces still follow their
                personal plan.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-bold text-slate-900">
                Where do I contact support or sales?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Reach us anytime at{" "}
                <a
                  href="mailto:support@structra.cloud"
                  className="font-semibold text-blue-700 hover:text-blue-800"
                >
                  support@structra.cloud
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-sky-600 px-6 py-10 text-white shadow-xl shadow-blue-100 sm:px-10">
            <h3 className="text-3xl font-black tracking-tight">
              Need a tailored enterprise plan?
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
              Tell us about your architecture governance, team size, and
              compliance needs. We’ll configure the right rollout plan.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => (window.location.href = "mailto:support@structra.cloud")}
                className="rounded-xl bg-white px-6 py-3 text-sm font-black text-blue-700 hover:bg-blue-50"
              >
                Talk to Sales
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="rounded-xl border border-blue-200 px-6 py-3 text-sm font-black text-white hover:bg-white/10"
              >
                Start Free Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {paymentStatus === "failed" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 px-4 backdrop-blur-sm">
          <div className="relative z-[122] w-full max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-2xl">
            <div className="text-4xl">❌</div>
            <h3 className="mt-4 text-2xl font-black text-slate-900">
              Payment Failed
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {statusMessage ||
                "Something went wrong while processing your payment."}
            </p>

            <button
              onClick={closePaymentModal}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <PaymentSuccessOverlay
        open={showSuccessOverlay}
        message={successOverlayMessage}
      />
      <CheckoutSummaryModal
        open={isCheckoutSummaryOpen}
        planName={checkoutPlan}
        quantity={checkoutQuantity}
        onQuantityChange={setCheckoutQuantity}
        onClose={closeCheckoutSummary}
        onProceed={handleProceedToPayment}
        isProcessing={isCheckoutLoading}
      />

      <Footer />
    </div>
  );
}