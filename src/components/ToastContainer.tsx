import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSecurity();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-bounce" />,
          success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        };

        const borderColors = {
          info: 'border-cyan-500/40 bg-slate-900/95 text-slate-200',
          warning: 'border-amber-500/50 bg-amber-950/90 text-amber-100',
          error: 'border-rose-500/60 bg-rose-950/90 text-rose-100 shadow-xl shadow-rose-950/40',
          success: 'border-emerald-500/40 bg-slate-900/95 text-slate-200'
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all ${borderColors[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-bold leading-tight">{toast.title}</p>
              <p className="text-[11px] opacity-90 mt-0.5 break-words">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
