import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import api from "../../api";
import logo from "../../assets/logo.png";

const questions = [
  {
    id: 1,
    type: "text",
    text: "Which organization are you representing?",
    subtext: "We'll customize your workspace based on your company profile.",
    field: "org_name",
    placeholder: "e.g. Acme Corp, Freelance...",
  },
  {
    id: 2,
    type: "text",
    text: "Where is your organization based?",
    subtext: "This helps us optimize data regions and compliance.",
    field: "org_loc",
    placeholder: "e.g. San Francisco, London...",
  },
  {
    id: 3,
    type: "text",
    text: "What is your professional designation?",
    subtext: "We will tailor the tools to your specific role.",
    field: "user_role",
    placeholder: "e.g. System Architect, Product Manager...",
  },
  {
    id: 4,
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
    id: 5,
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

const OnboardingQuestionnaire = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    org_name: "",
    org_loc: "",
    user_role: "",
  });
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const currentQ = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const handleNext = async (answerOverride = null) => {
    const finalAnswer = answerOverride !== null ? answerOverride : inputValue;
    if (!finalAnswer && !finalAnswer?.trim()) return;

    if (currentQ.field) {
      setAnswers((prev) => ({ ...prev, [currentQ.field]: finalAnswer }));
    }

    if (step < questions.length - 1) {
      if (currentQ.type === "select") {
        setTimeout(() => {
          setStep(step + 1);
          setInputValue("");
        }, 150);
      } else {
        setStep(step + 1);
        setInputValue("");
      }
    } else {
      await handleSubmit(finalAnswer);
    }
  };

  const handleSubmit = async (lastAnswer) => {
    setLoading(true);
    try {
      const payload = { ...answers, is_new: false };
      if (currentQ.field) {
        payload[currentQ.field] = lastAnswer;
      }
      await api.patch("profile/", payload);
      navigate("/app");
    } catch (error) {
      console.error("Onboarding failed", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden">
      {/* PROGRESS BAR */}
      <div className="w-full h-1 bg-neutral-900 fixed top-0 left-0 z-50">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* TOP LEFT BRANDING */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-40 flex items-center gap-2 group">
        <img 
          src={logo} 
          alt="Structra Logo" 
          className="h-6 md:h-7 w-auto object-contain" 
        />
        <span className="text-sm md:text-base font-extrabold tracking-tighter text-white md:inline">
          structra<span className="text-blue-500">.cloud</span>
        </span>
      </div>

      {/* TOP RIGHT PROGRESS COUNTER */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-40">
        <div className="px-3 py-1.5 md:px-4 md:py-2 bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-lg">
          <span className="text-xs md:text-sm font-semibold text-neutral-400">
            <span className="text-white">{step + 1}</span> of {questions.length}
          </span>
        </div>
      </div>

      {/* MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-12 pt-20 md:pt-24 pb-20 max-w-5xl mx-auto w-full">
          {/* QUESTION HEADER */}
          <div className="w-full text-center space-y-4 mb-8 md:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white px-4">
              {currentQ.text}
            </h2>
            {currentQ.subtext && (
              <p className="text-sm md:text-base lg:text-lg text-neutral-400 font-normal max-w-2xl mx-auto px-4">
                {currentQ.subtext}
              </p>
            )}
          </div>

          {/* DYNAMIC CONTENT BODY */}
          <div className="w-full max-w-3xl px-4">
            {currentQ.type === "text" ? (
              // TEXT INPUT MODE
              <div className="space-y-8 md:space-y-12">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-neutral-700 text-2xl md:text-3xl lg:text-4xl font-semibold py-3 md:py-4 text-center text-white placeholder:text-neutral-600 focus:border-blue-500 outline-none transition-all"
                  placeholder={currentQ.placeholder}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />

                <div className="flex justify-center">
                  <button
                    onClick={() => handleNext()}
                    disabled={!inputValue.trim() || loading}
                    className="group flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 md:px-8 py-3 md:py-3.5 rounded-lg text-sm md:text-base font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg disabled:shadow-none"
                  >
                    {loading ? "Finishing..." : "Continue"}
                    {!loading && (
                      <ArrowRight
                        size={20}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // SELECTION MODE
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {currentQ.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleNext(option)}
                    disabled={loading}
                    className="group relative p-5 md:p-6 bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-800 hover:border-blue-500 rounded-xl text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10"
                  >
                    <div className="flex items-center justify-between gap-3 md:gap-4">
                      <span className="text-base md:text-lg font-semibold text-white">
                        {option}
                      </span>

                      {/* Check Circle */}
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-neutral-700 group-hover:border-blue-500 group-hover:bg-blue-500 flex items-center justify-center transition-colors flex-shrink-0">
                        <Check
                          size={16}
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SPACER FOR MOBILE */}
          <div className="h-8 md:h-0" />
        </div>
      </div>
    </div>
  );
};

export default OnboardingQuestionnaire;