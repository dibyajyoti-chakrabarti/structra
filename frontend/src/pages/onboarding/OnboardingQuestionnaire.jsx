import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import api from "../../api";
import logo from "../../assets/logo.png";

const USERNAME_REGEX = /^[A-Za-z0-9_-]+$/;

const questions = [
  {
    id: 1,
    type: "text",
    text: "Pick your username",
    subtext:
      "This is your public handle. You can edit the auto-generated one now.",
    field: "username",
    placeholder: "your_handle",
  },
  {
    id: 2,
    type: "text",
    text: "Which organization are you representing?",
    subtext:
      "We'll customize your workspace based on your company profile.",
    field: "org_name",
    placeholder: "e.g. Acme Corp, Freelance...",
  },
  {
    id: 3,
    type: "text",
    text: "Where is your organization based?",
    subtext: "This helps us optimize data regions and compliance.",
    field: "org_loc",
    placeholder: "e.g. San Francisco, London...",
  },
  {
    id: 4,
    type: "text",
    text: "What is your professional designation?",
    subtext: "We will tailor the tools to your specific role.",
    field: "user_role",
    placeholder: "e.g. System Architect, Product Manager...",
  },
  {
    id: 5,
    type: "select",
    text: "What is your primary objective with Structra?",
    field: null,
    options: [
      "Design scalable system architectures",
      "Visualize existing infrastructure",
      "Understand good system design practices",
      "Collaborate with engineering teams",
    ],
  },
  {
    id: 6,
    type: "select",
    text: "How did you discover us?",
    field: null,
    options: [
      "Family / Friends",
      "Colleague / Peer",
      "LinkedIn Connection",
      "Tech Conference",
      "Search Engine",
      "Social Media",
    ],
  },
];

const normalizeUsername = (value) =>
  value.replace(/^@+/, "").replace(/\s+/g, "");

const OnboardingQuestionnaire = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    username: "",
    org_name: "",
    org_loc: "",
    user_role: "",
  });
  const [selectAnswers, setSelectAnswers] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const currentQ = questions[step];
  const progress = ((step + 1) / questions.length) * 100;
  const selectedOption =
    currentQ.type === "select" ? selectAnswers[currentQ.id] || "" : "";

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
      } catch (profileError) {
        console.error("Failed to fetch profile for onboarding", profileError);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (currentQ.type !== "text" || !currentQ.field) {
      setInputValue("");
      return;
    }
    setInputValue(answers[currentQ.field] || "");
  }, [step, currentQ.type, currentQ.field, answers]);

  useEffect(() => {
    setError("");
  }, [step]);

  const handleSubmit = async (lastFieldValue = null) => {
    setLoading(true);
    try {
      const payload = { ...answers, is_new: false };
      if (currentQ.field && lastFieldValue !== null) {
        payload[currentQ.field] = lastFieldValue;
      }
      await api.patch("auth/profile/", payload);
      navigate("/app");
    } catch (submitError) {
      console.error("Onboarding failed", submitError);
      setError(
        submitError.response?.data?.username?.[0] ||
          "Failed to save onboarding data."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async (answerOverride = null) => {
    const rawAnswer = answerOverride !== null ? answerOverride : inputValue;
    const finalAnswer =
      typeof rawAnswer === "string" ? rawAnswer.trim() : String(rawAnswer || "").trim();

    if (!finalAnswer) {
      setError(
        currentQ.type === "select"
          ? "Please select one option before submitting."
          : "This field is required."
      );
      return;
    }

    let processedAnswer = finalAnswer;
    if (currentQ.field === "username") {
      processedAnswer = normalizeUsername(finalAnswer);
      if (!processedAnswer) {
        setError("Username is required.");
        return;
      }
      if (!USERNAME_REGEX.test(processedAnswer)) {
        setError("Username can only include letters, numbers, '-' and '_'.");
        return;
      }
    }

    if (currentQ.field) {
      setAnswers((prev) => ({ ...prev, [currentQ.field]: processedAnswer }));
    }

    if (step < questions.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    await handleSubmit(currentQ.field ? processedAnswer : null);
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-500">
          Loading your onboarding...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
      </div>

      <div className="fixed top-0 left-0 z-50 h-1 w-full bg-blue-100">
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 mt-2 flex items-center justify-between sm:mb-8">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Structra Logo"
              className="h-6 w-auto object-contain sm:h-7"
            />
            <span className="text-base font-extrabold tracking-tighter text-slate-900">
              structra<span className="text-blue-600">.cloud</span>
            </span>
          </div>

          <div className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 sm:px-4 sm:py-2">
            <span className="text-xs font-semibold text-slate-500 sm:text-sm">
              <span className="text-slate-900">{step + 1}</span> of {questions.length}
            </span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-32px_rgba(37,99,235,0.4)] sm:p-8 lg:p-10">
            <div className="mb-7 text-center sm:mb-9">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {currentQ.text}
              </h2>
              {currentQ.subtext && (
                <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500 sm:text-base lg:text-lg">
                  {currentQ.subtext}
                </p>
              )}
            </div>

            {currentQ.type === "text" ? (
              <div className="mx-auto w-full max-w-2xl">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) =>
                    setInputValue(
                      currentQ.field === "username"
                        ? normalizeUsername(e.target.value)
                        : e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-base font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:px-5 sm:py-4 sm:text-xl"
                  placeholder={currentQ.placeholder}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />

                {currentQ.field === "username" && (
                  <p className="mt-2 text-center text-xs font-medium text-slate-400 sm:text-sm">
                    Letters, numbers, hyphen, and underscore only.
                  </p>
                )}

                {error && (
                  <p className="mt-4 text-center text-sm font-semibold text-rose-600">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                    disabled={step === 0 || loading}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    onClick={() => handleNext()}
                    disabled={!inputValue.trim() || loading}
                    className="group inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:py-3 sm:text-base"
                  >
                    {loading ? "Finishing..." : "Continue"}
                    {!loading && (
                      <ArrowRight
                        size={18}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  {currentQ.options.map((option) => {
                    const isSelected = option === selectedOption;
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          setSelectAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: option,
                          }));
                          setError("");
                        }}
                        disabled={loading}
                        className={`group rounded-xl border-2 p-4 text-left transition-all sm:p-5 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`text-base font-semibold sm:text-lg ${
                              isSelected ? "text-blue-700" : "text-slate-800"
                            }`}
                          >
                            {option}
                          </span>

                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors sm:h-8 sm:w-8 ${
                              isSelected
                                ? "border-blue-500 bg-blue-500"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            <Check
                              size={15}
                              className={isSelected ? "text-white" : "text-transparent"}
                            />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <p className="mt-4 text-center text-sm font-semibold text-rose-600">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                    disabled={step === 0 || loading}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    onClick={() => handleNext(selectedOption)}
                    disabled={!selectedOption || loading}
                    className="group inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-8 sm:py-3 sm:text-base"
                  >
                    {loading
                      ? "Finishing..."
                      : step === questions.length - 1
                        ? "Finish onboarding"
                        : "Submit answer"}
                    {!loading && (
                      <ArrowRight
                        size={18}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default OnboardingQuestionnaire;
