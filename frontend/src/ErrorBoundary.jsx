import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[NetShield SOC Error Boundary caught an error]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070a12] text-gray-100 flex flex-col justify-center items-center p-6 text-center font-sans">
          <div className="max-w-md w-full cyber-card p-8 rounded-2xl border border-rose-800 space-y-5 shadow-2xl">
            <div className="p-3.5 bg-rose-950/80 border border-rose-500/40 rounded-2xl text-rose-400 inline-block">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-white">NetShield SOC Recovery Mode</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              An unexpected component error occurred in the active view. The application isolated the fault to preserve system stability.
            </p>
            <div className="p-3 bg-gray-900/90 rounded-lg border border-gray-800 text-[11px] font-mono text-rose-300 overflow-x-auto">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload NetShield SOC Console</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
