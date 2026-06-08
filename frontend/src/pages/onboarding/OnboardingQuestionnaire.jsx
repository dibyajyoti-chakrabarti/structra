import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, LogOut, ChevronRight } from "lucide-react";
import api, { clearApiCache } from "../../api";
import logo from "../../assets/logo.png";
import onboarding1 from "../../assets/onboarding-1.svg";
import onboarding2 from "../../assets/onboarding-2.svg";
import onboarding3 from "../../assets/onboarding-3.svg";
import onboarding4 from "../../assets/onboarding-4.svg";
import onboarding5 from "../../assets/onboarding-5.svg";
import onboarding6 from "../../assets/onboarding-6.svg";

const onboardingIllustrations = [onboarding1, onboarding2, onboarding3, onboarding4, onboarding5, onboarding6];

/* ─── Data ────────────────────────────────────────────────── */
const USERNAME_REGEX = /^[A-Za-z0-9_-]+$/;

const questions = [
  {
    id: 1,
    type: "text",
    text: "Pick your username",
    subtext: "This is your public handle. You can edit the auto-generated one now.",
    field: "username",
    placeholder: "your_handle",
    hint: "Letters, numbers, hyphen, and underscore only.",
    accent: "#3B82F6",
    emoji: "✦",
  },
  {
    id: 2,
    type: "text",
    text: "Which organization are you representing?",
    subtext: "We'll customize your workspace based on your company profile.",
    field: "org_name",
    placeholder: "e.g. Acme Corp, Freelance…",
    accent: "#8B5CF6",
    emoji: "◈",
  },
  {
    id: 3,
    type: "text",
    text: "Where is your organization based?",
    subtext: "This helps us optimize data regions and compliance.",
    field: "org_loc",
    placeholder: "e.g. San Francisco, London…",
    accent: "#06B6D4",
    emoji: "◎",
  },
  {
    id: 4,
    type: "text",
    text: "What is your professional designation?",
    subtext: "We'll tailor the tools to your specific role.",
    field: "user_role",
    placeholder: "e.g. System Architect, Product Manager…",
    accent: "#10B981",
    emoji: "◆",
  },
  {
    id: 5,
    type: "select",
    text: "What is your primary objective with Structra?",
    field: null,
    accent: "#F59E0B",
    emoji: "◉",
    options: [
      { label: "Design scalable system architectures", icon: "⬡" },
      { label: "Visualize existing infrastructure", icon: "⬢" },
      { label: "Understand good system design practices", icon: "⬣" },
      { label: "Collaborate with engineering teams", icon: "⬤" },
    ],
  },
  {
    id: 6,
    type: "select",
    text: "How did you discover us?",
    field: null,
    accent: "#EC4899",
    emoji: "◑",
    options: [
      { label: "Family / Friends", icon: "♡" },
      { label: "Colleague / Peer", icon: "⟐" },
      { label: "LinkedIn Connection", icon: "⟁" },
      { label: "Tech Conference", icon: "⟂" },
      { label: "Search Engine", icon: "⊕" },
      { label: "Social Media", icon: "⊗" },
    ],
  },
];

const normalizeUsername = (v) => v.replace(/^@+/, "").replace(/\s+/g, "");

/* ─── Main component ──────────────────────────────────────── */
const OnboardingQuestionnaire = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ username: "", org_name: "", org_loc: "", user_role: "" });
  const [selectAnswers, setSelectAnswers] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const currentQ = questions[step];
  const selectedOption = currentQ.type === "select" ? selectAnswers[currentQ.id] || "" : "";

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("auth/profile/");
        const profile = res.data || {};
        setAnswers((prev) => ({
          ...prev,
          username: profile.username || prev.username,
          org_name: profile.org_name || prev.org_name,
          org_loc: profile.org_loc || prev.org_loc,
          user_role: profile.user_role || prev.user_role,
        }));
      } catch (e) {
        console.error("Failed to fetch profile", e);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (currentQ.type !== "text" || !currentQ.field) { setInputValue(""); return; }
    setInputValue(answers[currentQ.field] || "");
  }, [step]);

  useEffect(() => { setError(""); }, [step]);

  useEffect(() => {
    if (!animating && inputRef.current && currentQ.type === "text") {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [step, animating]);

  const goToStep = (next) => {
    setAnimating(true);
    setTimeout(() => { setStep(next); setAnimating(false); }, 220);
  };

  const handleLogout = () => {
    clearApiCache();
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login", { replace: true });
  };

  const validateUsernameAvailability = async (username) => {
    setCheckingUsername(true);
    try {
      const res = await api.get("users/username-available/", { params: { username }, cache: false });
      if (!res.data?.available) { setError("Username is already taken."); return false; }
      return true;
    } catch (e) {
      const p = e.response?.data || {};
      setError(p.error || "Unable to validate username right now.");
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSubmit = async (lastFieldValue = null) => {
    setLoading(true);
    try {
      const payload = { ...answers, is_new: false };
      if (currentQ.field && lastFieldValue !== null) payload[currentQ.field] = lastFieldValue;
      await api.patch("auth/profile/", payload);
      navigate("/app");
    } catch (e) {
      setError(e.response?.data?.username?.[0] || "Failed to save onboarding data.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (answerOverride = null) => {
    if (loading || checkingUsername) return;
    const rawAnswer = answerOverride !== null ? answerOverride : inputValue;
    const finalAnswer = typeof rawAnswer === "string" ? rawAnswer.trim() : String(rawAnswer || "").trim();

    if (!finalAnswer) {
      setError(currentQ.type === "select" ? "Please select an option." : "This field is required.");
      return;
    }

    if (currentQ.field === "username") {
      if (!USERNAME_REGEX.test(finalAnswer)) {
        setError("Only letters, numbers, hyphens and underscores allowed.");
        return;
      }
      const originalUsername = answers.username;
      if (finalAnswer !== originalUsername) {
        const ok = await validateUsernameAvailability(finalAnswer);
        if (!ok) return;
      }
    }

    if (currentQ.type === "text" && currentQ.field) {
      setAnswers((prev) => ({ ...prev, [currentQ.field]: finalAnswer }));
    }

    const isLast = step === questions.length - 1;
    if (isLast) {
      await handleSubmit(currentQ.type === "text" ? finalAnswer : null);
    } else {
      goToStep(step + 1);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  const accent = currentQ.accent;
  const isLast = step === questions.length - 1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        * { box-sizing: border-box; }
        .onboard-root { font-family: 'DM Sans', sans-serif; }
        .serif { font-family: 'Instrument Serif', Georgia, serif; }
        .slide-in { animation: slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .slide-out { animation: slideOut 0.2s cubic-bezier(0.4, 0, 1, 1) both; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-12px); } }
        .step-dot { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .option-card { transition: all 0.18s ease; }
        .option-card:hover { transform: translateY(-1px); }
        .cta-btn { transition: all 0.18s ease; }
        .cta-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px -6px var(--accent-shadow); }
        .cta-btn:active:not(:disabled) { transform: translateY(0); }
        .custom-input { transition: all 0.18s ease; }
        .custom-input:focus { outline: none; }
        .side-panel { transition: background 0.5s ease; }
        .float-anim { animation: floatGently 6s ease-in-out infinite; }
        @keyframes floatGently { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
      `}</style>

      <div className="onboard-root min-h-screen bg-[#F8F7F4] flex flex-col"
           style={{ "--accent": accent, "--accent-shadow": accent + "55" }}>

        {/* ── Top bar ── */}
        <header className="flex items-center justify-between px-6 pt-6 pb-0 sm:px-10 sm:pt-8">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Structra" className="h-6 w-auto" />
            <span className="text-[17px] font-semibold tracking-tight leading-none">
              <span className="text-stone-800">structra</span>
              <span className="transition-colors duration-500" style={{ color: accent }}>.cloud</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Step breadcrumbs */}
            <div className="hidden sm:flex items-center gap-1.5">
              {questions.map((_, i) => (
                <span
                  key={i}
                  className="step-dot rounded-full"
                  style={{
                    width: i === step ? "24px" : "7px",
                    height: "7px",
                    background: i === step ? accent : i < step ? accent + "66" : "#D1D5DB",
                  }}
                />
              ))}
            </div>

            <span className="text-sm font-medium text-stone-400">
              {step + 1} <span className="text-stone-300">/</span> {questions.length}
            </span>

            <button
              onClick={handleLogout}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10">
          <div className="w-full max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 lg:gap-6">

              {/* ── Left: Question card ── */}
              <div className="bg-white rounded-[24px] border border-stone-100 shadow-sm overflow-hidden">
                <div className={`p-8 sm:p-10 lg:p-12 h-full flex flex-col ${animating ? "slide-out" : "slide-in"}`}
                     key={step}>

                  {/* Accent tag */}
                  <div className="mb-6">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase rounded-full px-3 py-1"
                      style={{ background: accent + "15", color: accent }}
                    >
                      <span style={{ fontSize: "10px" }}>{currentQ.emoji}</span>
                      Step {step + 1}
                    </span>
                  </div>

                  {/* Heading */}
                  <h1 className="serif text-4xl sm:text-5xl text-stone-900 leading-tight mb-3">
                    {currentQ.text}
                  </h1>
                  {currentQ.subtext && (
                    <p className="text-stone-400 text-base font-light mb-8 max-w-lg">
                      {currentQ.subtext}
                    </p>
                  )}

                  {/* ── Text input ── */}
                  {currentQ.type === "text" && (
                    <div className="flex-1 flex flex-col">
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputValue}
                          onChange={(e) =>
                            setInputValue(currentQ.field === "username"
                              ? normalizeUsername(e.target.value)
                              : e.target.value)
                          }
                          onKeyDown={(e) => e.key === "Enter" && handleNext()}
                          placeholder={currentQ.placeholder}
                          className="custom-input w-full rounded-2xl border-2 border-stone-100 bg-stone-50 px-5 py-4 text-xl font-medium text-stone-800 placeholder:text-stone-300 focus:border-[var(--accent)] focus:bg-white"
                          style={{ "--accent": accent }}
                        />
                        {inputValue && (
                          <span
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center"
                            style={{ background: accent + "20" }}
                          >
                            <Check size={13} style={{ color: accent }} />
                          </span>
                        )}
                      </div>
                      {currentQ.hint && (
                        <p className="mt-2.5 text-xs text-stone-400 font-medium">{currentQ.hint}</p>
                      )}
                      {error && (
                        <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p>
                      )}

                      <div className="mt-auto pt-8 flex items-center justify-between">
                        <button
                          onClick={() => goToStep(Math.max(step - 1, 0))}
                          disabled={step === 0 || loading}
                          className="rounded-xl px-5 py-2.5 text-sm font-medium text-stone-400 hover:text-stone-700 disabled:opacity-0 transition-colors"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => handleNext()}
                          disabled={!inputValue.trim() || loading || checkingUsername}
                          className="cta-btn inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: accent }}
                        >
                          {checkingUsername ? "Checking…" : loading ? "Saving…" : isLast ? "Finish" : "Continue"}
                          {!loading && !checkingUsername && <ArrowRight size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Select options ── */}
                  {currentQ.type === "select" && (
                    <div className="flex-1 flex flex-col">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentQ.options.map((opt) => {
                          const label = typeof opt === "string" ? opt : opt.label;
                          const icon = typeof opt === "object" ? opt.icon : null;
                          const isSelected = label === selectedOption;
                          return (
                            <button
                              key={label}
                              onClick={() => {
                                setSelectAnswers((p) => ({ ...p, [currentQ.id]: label }));
                                setError("");
                              }}
                              disabled={loading}
                              className={`option-card text-left rounded-2xl border-2 p-4 flex items-center gap-3 ${
                                isSelected
                                  ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                                  : "border-stone-100 bg-stone-50 hover:border-stone-200 hover:bg-white"
                              }`}
                              style={{ "--accent": accent, "--accent-bg": accent + "0D" }}
                            >
                              {icon && (
                                <span
                                  className="flex-shrink-0 text-lg leading-none w-8 h-8 flex items-center justify-center rounded-xl"
                                  style={{
                                    background: isSelected ? accent + "20" : "#F3F4F6",
                                    color: isSelected ? accent : "#9CA3AF",
                                  }}
                                >
                                  {icon}
                                </span>
                              )}
                              <span
                                className={`text-sm font-medium leading-snug flex-1 ${
                                  isSelected ? "text-stone-800" : "text-stone-500"
                                }`}
                              >
                                {label}
                              </span>
                              <span
                                className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-stone-300"
                                }`}
                                style={{ "--accent": accent }}
                              >
                                {isSelected && <Check size={10} className="text-white" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {error && <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p>}

                      <div className="mt-auto pt-8 flex items-center justify-between">
                        <button
                          onClick={() => goToStep(Math.max(step - 1, 0))}
                          disabled={step === 0 || loading}
                          className="rounded-xl px-5 py-2.5 text-sm font-medium text-stone-400 hover:text-stone-700 disabled:opacity-0 transition-colors"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => handleNext(selectedOption)}
                          disabled={!selectedOption || loading}
                          className="cta-btn inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: accent }}
                        >
                          {loading ? "Saving…" : isLast ? "Finish onboarding" : "Submit answer"}
                          {!loading && <ArrowRight size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right: Side panel ── */}
              <div
                className="side-panel rounded-[24px] border border-stone-100 overflow-hidden flex flex-col"
                style={{ background: `linear-gradient(145deg, ${accent}08 0%, ${accent}14 100%)` }}
              >
                {/* Progress section */}
                <div className="p-6 sm:p-8">
                  <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: accent }}>
                    Your progress
                  </p>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                          style={{
                            background: i < step ? accent : i === step ? accent + "20" : "transparent",
                            border: `2px solid ${i <= step ? accent : "#E5E7EB"}`,
                            color: i < step ? "white" : i === step ? accent : "#9CA3AF",
                          }}
                        >
                          {i < step ? <Check size={10} /> : i + 1}
                        </span>
                        <span
                          className="text-sm font-medium truncate"
                          style={{ color: i === step ? "#1C1917" : i < step ? accent : "#9CA3AF" }}
                        >
                          {q.text.length > 32 ? q.text.slice(0, 32) + "…" : q.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Illustration */}
                <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
                  <div className="w-full max-w-[260px]">
                    <img
                      src={onboardingIllustrations[step]}
                      alt={`Step ${step + 1} illustration`}
                      className="w-full h-auto object-contain drop-shadow-sm"
                      key={step}
                    />
                  </div>
                </div>

                {/* Bottom quote */}
                <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                  <p className="text-xs text-stone-400 leading-relaxed italic">
                    "A few quick details and we'll have your workspace ready in no time."
                  </p>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default OnboardingQuestionnaire;