'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAnalysis } from '@/context/AnalysisContext';
import { cn } from '@/lib/format';
import { Button, Panel } from '@/components/ui/primitives';

/* -------------------------------------------------------------------------- */
/* Error boundary                                                              */
/* -------------------------------------------------------------------------- */
class PageErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NetShield page error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Panel title="Page error">
          <p className="text-sm text-soc-critical">{this.state.error.message}</p>
          <p className="mt-2 text-xs text-soc-muted">
            The page failed to render. Reload the page or run the checks described in the README.
          </p>
          <Button className="mt-3" variant="primary" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </Panel>
      );
    }
    return this.props.children;
  }
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                      */
/* -------------------------------------------------------------------------- */
function ToastStack() {
  const { toasts, dismissToast } = useAnalysis();
  if (toasts.length === 0) return null;
  const tones = {
    info: 'border-soc-info/50 bg-soc-info/10 text-soc-info',
    success: 'border-soc-low/50 bg-soc-low/10 text-soc-low',
    warning: 'border-soc-medium/50 bg-soc-medium/10 text-soc-medium',
    danger: 'border-soc-critical/50 bg-soc-critical/10 text-soc-critical',
  };
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2" role="region" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn('flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur', tones[toast.tone])}
        >
          <span className="leading-relaxed">{toast.message}</span>
          <button
            type="button"
            className="shrink-0 opacity-70 hover:opacity-100"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Connection banner                                                           */
/* -------------------------------------------------------------------------- */
function ConnectionBanner() {
  const { connection, connectionError, refresh, refreshing } = useAnalysis();
  if (connection !== 'offline') return null;
  return (
    <div className="border-b border-soc-critical/40 bg-soc-critical/10 px-4 py-2.5 text-xs" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-soc-critical">
          <strong className="font-semibold">Backend unavailable.</strong>{' '}
          {connectionError ?? 'Start the FastAPI server to enable training, evaluation and detection.'}
        </span>
        <Button variant="ghost" loading={refreshing} onClick={() => void refresh()}>
          Retry connection
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page header                                                                 */
/* -------------------------------------------------------------------------- */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-soc-text sm:text-xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-soc-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                       */
/* -------------------------------------------------------------------------- */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-soc-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectionBanner />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8" id="main">
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </main>
        <footer className="border-t border-soc-border px-4 py-3 text-[11px] text-soc-muted sm:px-6 lg:px-8">
          NetShield AI · Offline dataset-driven analysis · Not a live packet-capture or automatic blocking system.
        </footer>
      </div>
      <ToastStack />
    </div>
  );
}
