import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const sections = [
  {
    title: "Information We Collect",
    content:
      "We collect account and profile details (such as name and email), workspace metadata, and system-model content required to provide the platform.",
  },
  {
    title: "How We Use Information",
    content:
      "We use collected data to authenticate users, operate collaboration features, improve product reliability, and deliver AI-assisted evaluation services.",
  },
  {
    title: "Security and Protection",
    content:
      "We apply technical and organizational controls to protect your data, including access controls, encrypted transport channels, and monitored infrastructure practices.",
  },
  {
    title: "Data Sharing",
    content:
      "We do not sell your personal data. Information may be shared with trusted service providers strictly for service delivery, security, and lawful obligations.",
  },
  {
    title: "Data Retention",
    content:
      "We retain data for as long as needed to provide services, meet legal requirements, resolve disputes, and enforce our agreements. Retention periods may vary by data type.",
  },
  {
    title: "Your Rights and Choices",
    content:
      "You may request access, correction, or deletion of personal information, subject to legal and operational limitations. You may also update profile fields directly in your account.",
  },
  {
    title: "Cookies and Product Analytics",
    content:
      "We may use essential cookies and limited analytics to improve performance, usability, and platform stability. You can manage browser-level cookie settings as applicable.",
  },
  {
    title: "International Processing",
    content:
      "Depending on your location, data may be processed in regions where our infrastructure or service providers operate, under applicable safeguards.",
  },
  {
    title: "Policy Updates",
    content:
      "We may revise this Privacy Policy periodically to reflect product, legal, or security changes. Updates are indicated by the effective date.",
  },
];

export default function Privacy() {
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
            Privacy Policy
          </h1>
          <div className="mt-5 inline-flex items-center rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
            Effective Date: February 16, 2026
          </div>
          <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
            This policy describes how Structra.cloud collects, uses, secures,
            and manages personal and workspace information when you use our
            services.
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
                Privacy questions or requests?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Reach us at{" "}
                <a
                  href="mailto:support@structra.cloud"
                  className="font-semibold text-blue-700 hover:text-blue-800"
                >
                  support@structra.cloud
                </a>{" "}
                for access, correction, deletion, or data-handling clarifications.
              </p>
            </article>
          </main>
        </div>
      </section>

      <Footer />
    </div>
  );
}
