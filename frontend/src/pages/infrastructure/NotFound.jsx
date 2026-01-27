import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5]">
      
      {/* Main 404 Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-screen flex flex-col items-center justify-center text-center">
          
          {/* Big 404 */}
          <h1 className="text-[6rem] sm:text-[8rem] lg:text-[10rem] font-extralight tracking-tight leading-none">
            404
          </h1>

          {/* Subtitle */}
          <h2 className="mt-4 text-2xl sm:text-3xl font-light tracking-tight">
            Page not found
          </h2>

          {/* Description */}
          <p className="mt-4 sm:mt-6 max-w-xl text-base sm:text-lg text-[#a3a3a3] leading-relaxed">
            The page you’re looking for doesn’t exist, was moved, or is no longer
            available. Double-check the URL or return to a safe place.
          </p>

          {/* Actions */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-all duration-200 shadow-lg text-sm"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </button>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-8 py-4 border-2 border-[#2a2a2a] text-white rounded-lg hover:bg-[#111111] transition-all duration-200 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>

          {/* Support hint */}
          <div className="mt-10 text-xs text-[#6b6b6b]">
            If you believe this is an error, contact{' '}
            <span className="text-[#a3a3a3]">support@structra.cloud</span>
          </div>

        </div>
      </div>

    </div>
  );
}
