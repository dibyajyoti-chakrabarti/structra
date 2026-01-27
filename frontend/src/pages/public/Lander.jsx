import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

export default function Lander() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const slides = [
    {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-100',
      title: 'Intelligence That Scales',
      subtitle: 'Transform complex systems into actionable insights'
    },
    {
      bg: 'bg-gradient-to-br from-rose-50 to-pink-100',
      title: 'Decisions Made Clear',
      subtitle: 'AI-powered analysis for enterprise architecture'
    },
    {
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-100',
      title: 'Built for Enterprise',
      subtitle: 'Governance, security, and collaboration at scale'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Check if scrolled past the carousel (100vh)
      setIsScrolled(window.scrollY > window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      <Navbar isScrolled={isScrolled} />

      {/* Hero Carousel - Full Device Height */}
      <section className="relative h-screen overflow-hidden">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 translate-x-0'
                : index < currentSlide
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
            } ${slide.bg}`}
          >
            <div className="h-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-5xl">
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-gray-900 mb-4 sm:mb-6 px-4">
                  {slide.title}
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-700 font-light px-4">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Indicators */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-10 sm:w-12 bg-gray-800'
                  : 'w-6 sm:w-8 bg-gray-400 hover:bg-gray-600'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Main Value Proposition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6 sm:mb-8">
            Enterprise AI for System Modeling & Decision Intelligence
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-[#a3a3a3] leading-relaxed mb-8 sm:mb-12 px-4">
            Structra.cloud transforms complex architectures into analyzable, 
            decision-ready models. Evaluate trade-offs, assess risks, and make 
            informed decisions with AI-powered intelligence designed for enterprise scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Request Access
            </button>

            <button
              onClick={() => navigate('/pricing')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-[#2a2a2a] text-white rounded-lg hover:bg-[#111111] transition-all duration-200"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="border-y border-[#1f1f1f] bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-light text-center mb-12 sm:mb-16">Platform Capabilities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 sm:p-8 border border-[#1f1f1f] rounded-xl bg-[#0a0a0a] hover:border-[#2a2a2a] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg mb-6 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">Visual System Modeling</h3>
              <p className="text-sm sm:text-base text-[#a3a3a3] leading-relaxed">
                Design complex technical and business systems on a collaborative canvas 
                with structured relationships, dependencies, and documented assumptions.
              </p>
            </div>

            <div className="p-6 sm:p-8 border border-[#1f1f1f] rounded-xl bg-[#0a0a0a] hover:border-[#2a2a2a] transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg mb-6 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">AI-Driven Evaluation</h3>
              <p className="text-sm sm:text-base text-[#a3a3a3] leading-relaxed">
                Analyze performance metrics, identify risks, and evaluate trade-offs using 
                AI-powered workflows built with engineering rigor and precision.
              </p>
            </div>

            <div className="p-6 sm:p-8 border border-[#1f1f1f] rounded-xl bg-[#0a0a0a] hover:border-[#2a2a2a] transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg mb-6 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-medium mb-3 sm:mb-4">Enterprise Governance</h3>
              <p className="text-sm sm:text-base text-[#a3a3a3] leading-relaxed">
                Role-based access control, visibility policies, comprehensive audit logs, 
                and compliance features ensure security and accountability at scale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-light mb-4 sm:mb-6">
              Built for Engineering, Architecture & Operations Teams
            </h2>

            <p className="text-base sm:text-lg text-[#a3a3a3] leading-relaxed mb-6 sm:mb-8">
              Structra.cloud supports the complete lifecycle—from initial system design 
              through AI-powered evaluation to executive-ready decision support. 
              Documentation, governance, and presentation capabilities are integral 
              to every workflow.
            </p>

            <button
              onClick={() => navigate('/signup')}
              className="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 border border-[#2a2a2a] text-white rounded-lg hover:bg-[#111111] transition-all duration-200"
            >
              Learn More
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="border border-[#1f1f1f] rounded-xl p-6 sm:p-8 lg:p-10 bg-[#0f0f0f]">
            <h3 className="text-lg sm:text-xl font-medium mb-4 sm:mb-6">Enterprise Features</h3>
            <ul className="space-y-3 sm:space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#f5f5f5] font-medium text-sm sm:text-base">Workspaces & RBAC</p>
                  <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">Granular access control and team collaboration</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#f5f5f5] font-medium text-sm sm:text-base">Visibility & Audit Logs</p>
                  <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">Complete transparency and compliance tracking</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#f5f5f5] font-medium text-sm sm:text-base">Integrated Documentation</p>
                  <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">Living documentation tied to system models</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#f5f5f5] font-medium text-sm sm:text-base">Evaluation Workflows</p>
                  <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">Automated analysis and scenario comparison</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#f5f5f5] font-medium text-sm sm:text-base">Executive Presentations</p>
                  <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1">Transform models into stakeholder-ready insights</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="border-y border-[#1f1f1f] bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <h2 className="text-2xl sm:text-3xl font-light text-center mb-12 sm:mb-16">Trusted by Enterprise Teams</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 border border-[#1f1f1f] rounded-lg bg-[#0a0a0a]">
              <h4 className="font-medium mb-2 text-sm sm:text-base">System Architects</h4>
              <p className="text-xs sm:text-sm text-[#a3a3a3]">Model complex technical systems and evaluate architectural decisions</p>
            </div>
            <div className="p-5 sm:p-6 border border-[#1f1f1f] rounded-lg bg-[#0a0a0a]">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Engineering Leaders</h4>
              <p className="text-xs sm:text-sm text-[#a3a3a3]">Assess technical trade-offs and communicate decisions clearly</p>
            </div>
            <div className="p-5 sm:p-6 border border-[#1f1f1f] rounded-lg bg-[#0a0a0a]">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Operations Teams</h4>
              <p className="text-xs sm:text-sm text-[#a3a3a3]">Optimize processes and evaluate operational improvements</p>
            </div>
            <div className="p-5 sm:p-6 border border-[#1f1f1f] rounded-lg bg-[#0a0a0a]">
              <h4 className="font-medium mb-2 text-sm sm:text-base">Strategy & Planning</h4>
              <p className="text-xs sm:text-sm text-[#a3a3a3]">Analyze scenarios and present data-driven recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        <div className="border border-[#1f1f1f] rounded-2xl p-8 sm:p-12 lg:p-16 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light mb-4 sm:mb-6">
            Transform Architectures into Decision-Ready Systems
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-[#a3a3a3] mb-8 sm:mb-10 max-w-2xl mx-auto">
            Join enterprise teams using Structra.cloud to model, evaluate, and govern 
            complex systems with confidence and clarity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Request Access
            </button>

            <button
              onClick={() => navigate('/pricing')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-[#2a2a2a] text-white rounded-lg hover:bg-[#111111] transition-all duration-200"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}