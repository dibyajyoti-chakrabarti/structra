import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const plans = [
  {
    name: "Core",
    price: "$0",
    interval: "/month",
    subtitle: "For individuals and early exploration",
    cta: "Start Free",
    highlighted: false,
    features: [
      "Single workspace",
      "Visual architecture canvas",
      "Basic AI evaluation credits",
      "Personal profile and onboarding",
      "Community support",
    ],
  },
  {
    name: "Team",
    price: "$49",
    interval: " /user/month",
    subtitle: "For collaborative architecture teams",
    cta: "Start Team Trial",
    highlighted: true,
    features: [
      "Multiple team workspaces",
      "Shared canvases and reviews",
      "Higher AI evaluation limits",
      "Workspace settings and governance",
      "Priority email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    interval: "",
    subtitle: "For organizations with compliance and scale needs",
    cta: "Contact Sales",
    highlighted: false,
    features: [
      "Advanced security controls",
      "Role-based access policies",
      "Audit-ready activity records",
      "Custom onboarding and training",
      "Dedicated success manager",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();

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
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border p-6 shadow-sm transition ${
                plan.highlighted
                  ? "border-blue-200 bg-white shadow-lg shadow-blue-100/80"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <p className="mb-4 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
                  Most Popular
                </p>
              )}
              <h2 className="text-2xl font-black text-slate-900">{plan.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{plan.subtitle}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-black tracking-tight text-slate-900">
                  {plan.price}
                </span>
                <span className="pb-1 text-sm font-semibold text-slate-500">
                  {plan.interval}
                </span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 flex-shrink-0 text-blue-600"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() =>
                  plan.name === "Enterprise"
                    ? (window.location.href = "mailto:support@structra.cloud")
                    : navigate("/signup")
                }
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
                  plan.highlighted
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                }`}
              >
                {plan.cta}
                <ArrowRight size={16} />
              </button>
            </article>
          ))}
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
                Is there a free trial for paid plans?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes. Team plans can start with a trial so you can validate value
                with your workflow before committing.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-bold text-slate-900">
                Can we switch plans later?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Absolutely. You can upgrade as your team grows or move to
                enterprise when governance needs increase.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="font-bold text-slate-900">
                Do you support enterprise procurement?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes. We support standard procurement flows, security reviews, and
                custom commercial terms.
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

      <Footer />
    </div>
  );
}
