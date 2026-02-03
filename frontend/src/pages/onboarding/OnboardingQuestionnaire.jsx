import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const questions = [
  { id: 1, text: "Where do you work?", field: "org_name" },
  { id: 2, text: "Where are you from?", field: "org_loc" },
  { id: 3, text: "What's your role in the organization?", field: "user_role" },
  { id: 4, text: "What do you want to achieve with structra.cloud?", field: null }, // Hardcoded
  { id: 5, text: "Where did you hear about us from?", field: null } // Hardcoded
];

const OnboardingQuestionnaire = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ org_name: '', org_loc: '', user_role: '' });
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleNext = async () => {
    if (!inputValue.trim()) return; // Prevent skipping

    // Save answer locally
    const currentQuestion = questions[step];
    if (currentQuestion.field) {
      setAnswers(prev => ({ ...prev, [currentQuestion.field]: inputValue }));
    }

    if (step < questions.length - 1) {
      setStep(step + 1);
      setInputValue(''); // Reset input for next question
    } else {
      // Final step: Submit to DB
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Update profile and set is_new to false
      await api.patch('profile/', {
        ...answers,
        [questions[step].field]: inputValue, // Include the last answer if needed
        is_new: false
      });
      navigate('/app');
    } catch (error) {
      console.error("Onboarding failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-center p-8 z-50">
      <div className="max-w-2xl w-full text-center space-y-8">
        <h2 className="text-4xl font-bold">{questions[step].text}</h2>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full bg-transparent border-b-2 border-gray-600 text-2xl py-2 focus:border-blue-500 outline-none text-center transition-colors"
          placeholder="Type your answer..."
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
        />

        <button
          onClick={handleNext}
          disabled={!inputValue.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Finishing...' : step === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
        
        <div className="text-gray-500 text-sm">
          Question {step + 1} of {questions.length}
        </div>
      </div>
    </div>
  );
};

export default OnboardingQuestionnaire;