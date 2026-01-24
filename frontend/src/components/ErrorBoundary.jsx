import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-4xl font-bold text-red-600">Something went wrong</h1>
          <p className="text-gray-600">The application encountered an error.</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;