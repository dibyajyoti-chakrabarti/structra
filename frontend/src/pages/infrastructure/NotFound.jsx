import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import NotFoundArt from "../../assets/not-found.svg";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ fontFamily: "'DM Sans',system-ui,sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
        .nf-title{font-family:'Plus Jakarta Sans','DM Sans',sans-serif}
      `}</style>

      <Navbar />

      {/* Main 404 Content */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 10%, rgba(59,130,246,0.12), transparent 45%), radial-gradient(circle at 80% 20%, rgba(14,116,144,0.12), transparent 40%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                404 Error
              </div>
              <h1 className="nf-title mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
                This page drifted off the canvas.
              </h1>
              <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
                The link may be broken or the page was moved. Use the options
                below to get back to a safe place.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700"
                >
                  <Home className="h-4 w-4" />
                  Go to Home
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </button>
              </div>

              <p className="mt-6 text-xs text-slate-400">
                If you believe this is an error, contact{" "}
                <span className="text-slate-500">support@structra.cloud</span>
              </p>
            </div>

            <div className="p-2 sm:p-4">
              <img
                src={NotFoundArt}
                alt="Not found illustration"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
