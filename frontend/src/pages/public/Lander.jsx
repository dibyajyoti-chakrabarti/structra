import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  Clock3,
  Users,
  Brain,
  Workflow,
  ArrowRight,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

import HeroIllustration from "../../assets/hero-illustration.svg";
import FeatureModeling from "../../assets/feature-modeling.svg";
import FeatureAI from "../../assets/feature-ai.svg";
import FeatureCollaboration from "../../assets/feature-collaboration.svg";
import Step1Model from "../../assets/step-1-model.svg";
import Step2Analyze from "../../assets/step-2-analyze.svg";
import Step3Decide from "../../assets/step-3-decide.svg";
import UsecaseArchitects from "../../assets/usecase-architects.svg";
import UsecaseEngineering from "../../assets/usecase-engineering.svg";
import UsecaseOperations from "../../assets/usecase-operations.svg";
import UsecaseStrategy from "../../assets/usecase-strategy.svg";
import CtaIllustration from "../../assets/cta-illustration.svg";

const capabilities = [
  {
    title: "Visual Modeling Workspace",
    description:
      "Design architecture, dependencies, and assumptions in one structured canvas.",
    image: FeatureModeling,
    icon: Workflow,
  },
  {
    title: "AI Evaluation Assistant",
    description:
      "Compare alternatives, flag risk hotspots, and generate recommendation context.",
    image: FeatureAI,
    icon: Brain,
  },
  {
    title: "Team Decision Workflows",
    description:
      "Align architects, engineering leads, and operations through shared reviews.",
    image: FeatureCollaboration,
    icon: Users,
  },
];

const journey = [
  {
    step: "01",
    title: "Model the system",
    description:
      "Capture architecture components, boundaries, and dependencies visually.",
    image: Step1Model,
  },
  {
    step: "02",
    title: "Evaluate options",
    description:
      "Run AI-assisted analysis to compare trade-offs across multiple scenarios.",
    image: Step2Analyze,
  },
  {
    step: "03",
    title: "Decide with confidence",
    description:
      "Present recommendations with clear rationale and stakeholder-ready context.",
    image: Step3Decide,
  },
];

const useCases = [
  {
    title: "System Architects",
    copy: "Map service boundaries, data flow, and resilience decisions with precision.",
    image: UsecaseArchitects,
  },
  {
    title: "Engineering Leadership",
    copy: "Prioritize architecture investments using measurable risk and impact signals.",
    image: UsecaseEngineering,
  },
  {
    title: "Operations Teams",
    copy: "Track operational bottlenecks and reliability plans from a shared model.",
    image: UsecaseOperations,
  },
  {
    title: "Strategy & Planning",
    copy: "Build decision narratives with transparent assumptions and outcomes.",
    image: UsecaseStrategy,
  },
];

export default function Lander() {
  const navigate = useNavigate();
  const [activeCapability, setActiveCapability] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCapability((prev) => (prev + 1) % capabilities.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const active = capabilities[activeCapability];
  const ActiveIcon = active.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-b from-blue-50 via-white to-white pt-24 sm:pt-28">
        <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pb-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-sm font-semibold text-blue-700">
              <Sparkles size={16} />
              Decision Intelligence Platform
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Build Better Systems
              <span className="block text-blue-600">Make Better Decisions</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Structra helps teams model architecture, evaluate trade-offs, and
              align on high-impact technical decisions with AI-guided clarity.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/signup")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                Start Free Trial
                <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate("/pricing")}
                className="rounded-xl border border-blue-200 bg-white px-7 py-3.5 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                View Pricing
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-5 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-600" />
                SOC 2 aligned
              </span>
              <span className="inline-flex items-center gap-2">
                <Users size={16} className="text-green-600" />
                Team-ready workspaces
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={16} className="text-green-600" />
                Setup in minutes
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-100 to-sky-100 blur-2xl" />
            <div className="relative rounded-[2rem] border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/70">
              <img
                src={HeroIllustration}
                alt="Structra platform illustration"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-blue-100 bg-white/80">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Decision Velocity
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Move from architecture discussion to action quickly.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Shared Context
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Bring engineering, operations, and leadership onto one model.
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Audit Friendly
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Keep traceable reasoning behind every major design choice.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Core Capabilities
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Built for serious architecture work
            </h2>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-lg shadow-blue-100/70 sm:p-6">
              <img
                src={active.image}
                alt={active.title}
                className="h-auto w-full rounded-2xl bg-slate-50"
              />
            </div>

            <div className="space-y-4">
              {capabilities.map((item, index) => {
                const ItemIcon = item.icon;
                const isActive = index === activeCapability;
                return (
                  <button
                    key={item.title}
                    onClick={() => setActiveCapability(index)}
                    className={`w-full rounded-2xl border px-5 py-5 text-left transition ${
                      isActive
                        ? "border-blue-200 bg-blue-50 shadow-md shadow-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        <ItemIcon size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-blue-100 bg-gradient-to-b from-blue-50 to-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Process
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              One workflow from idea to decision
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {journey.map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-100/60"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Step {item.step}
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
                <img
                  src={item.image}
                  alt={item.title}
                  className="mt-5 h-40 w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Teams
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Trusted across technical functions
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {useCases.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/70"
              >
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.copy}</p>
                <img
                  src={item.image}
                  alt={item.title}
                  className="mt-5 h-52 w-full rounded-xl bg-slate-50 object-contain p-2"
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-600 to-sky-600 px-6 py-10 text-white shadow-2xl shadow-blue-200/60 sm:px-10 sm:py-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                Start Today
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Ready to modernize architecture decisions?
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
                Launch your first workspace in minutes and align teams around
                robust, explainable decisions.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/signup")}
                  className="rounded-xl bg-white px-7 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
                >
                  Start Free Trial
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className="rounded-xl border border-blue-200 bg-transparent px-7 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Explore Plans
                </button>
              </div>
            </div>
            <img
              src={CtaIllustration}
              alt="Get started with Structra"
              className="mt-8 w-full lg:mt-0"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
