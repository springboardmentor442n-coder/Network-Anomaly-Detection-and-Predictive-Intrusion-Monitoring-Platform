import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AnalysisProvider } from '@/context/AnalysisContext';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: {
    default: 'NetShield AI — Network Anomaly Detection & Intrusion Monitoring',
    template: '%s · NetShield AI',
  },
  description:
    'Offline machine-learning analysis of the UNSW-NB15 network intrusion dataset: dataset profiling, model training, evaluation, threat detection, alert triage and reporting.',
  applicationName: 'NetShield AI',
};

export const viewport: Viewport = {
  themeColor: '#060B14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-soc-accent focus:px-3 focus:py-2 focus:text-soc-bg"
        >
          Skip to content
        </a>
        <AnalysisProvider>
          <AppShell>{children}</AppShell>
        </AnalysisProvider>
      </body>
    </html>
  );
}
