import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const sections = [
  {
    title: "Acceptance of Terms",
    content:
      "By accessing or using Structra.cloud, you agree to these Terms of Service. If you do not agree, you must discontinue use of the platform.",
  },
  {
    title: "Account Responsibilities",
    content:
      "You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to provide accurate account information and keep it updated.",
  },
  {
    title: "Permitted Use",
    content:
      "You may use Structra.cloud only for lawful business and technical collaboration purposes. You may not use the platform to violate laws, infringe rights, or disrupt service operations.",
  },
  {
    title: "Data and Content",
    content:
      "You retain ownership of architecture models and content you submit. You grant Structra.cloud the limited rights required to host, process, and deliver the service securely.",
  },
  {
    title: "Service Availability",
    content:
      "We work to maintain reliable availability, but uninterrupted service is not guaranteed. We may perform maintenance, updates, or security interventions when required.",
  },
  {
    title: "Billing and Plan Changes",
    content:
      "Paid plan terms, billing cycles, and upgrade options are governed by the selected plan. Pricing and plan features may be updated with reasonable prior notice.",
  },
  {
    title: "Termination",
    content:
      "We may suspend or terminate accounts that violate these terms or present security risk. You may stop using the service at any time.",
  },
  {
    title: "Limitation of Liability",
    content:
      "To the maximum extent permitted by law, Structra.cloud is not liable for indirect, incidental, or consequential damages arising from platform use.",
  },
  {
    title: "Changes to Terms",
    content:
      "We may revise these Terms periodically. Material updates will be reflected by an updated effective date. Continued use after updates constitutes acceptance.",
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden border-b border-blue-100 bg-gradient-to-b from-blue-50 via-white to-white pt-24 sm:pt-28">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />

        <div className="relative mx-auto w-full max-w-4xl px-4 pb-14 sm:px-6 lg:pb-16">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            Legal
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <div className="mt-5 inline-flex items-center rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
            Effective Date: February 16, 2026
          </div>
          <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
            These terms govern access and use of Structra.cloud services,
            including workspace collaboration, system modeling, and AI-assisted
            evaluation capabilities.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-28">
            <p className="px-2 pb-2 text-xs font-black uppercase tracking-wider text-blue-600">
              On this page
            </p>
            <nav className="space-y-1">
              {sections.map((section, index) => (
                <a
                  key={section.title}
                  href={`#section-${index + 1}`}
                  className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {index + 1}. {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <main className="space-y-4">
            {sections.map((section, index) => (
              <article
                id={`section-${index + 1}`}
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                  Section {index + 1}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {section.content}
                </p>
              </article>
            ))}

            <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-xl font-black text-slate-900">
                Questions about these terms?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Contact our team at{" "}
                <a
                  href="mailto:support@structra.cloud"
                  className="font-semibold text-blue-700 hover:text-blue-800"
                >
                  support@structra.cloud
                </a>{" "}
                for legal, compliance, or contract clarifications.
              </p>
            </article>
          </main>
        </div>
      </section>

      <Footer />
    </div>
  );
}
