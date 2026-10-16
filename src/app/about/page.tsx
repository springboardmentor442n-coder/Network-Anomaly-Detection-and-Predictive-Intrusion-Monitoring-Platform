'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/AppShell';
import { Badge, KeyValue, LoadingBlock, Notice, Panel, SampleBadge, StatusDot } from '@/components/ui/primitives';
import { useAnalysis } from '@/context/AnalysisContext';
import { formatDateTime, formatNumber } from '@/lib/format';

const FEATURES = [
  ['Dataset Analysis', 'Upload CSV files, validate headers and targets, profile missing values, duplicates, data types, numeric statistics, distributions and correlations, then filter and export the records.'],
  ['Model Training', 'Fit Random Forest, Decision Tree or Logistic Regression for binary (label) or multiclass (attack_cat) classification using a single, leakage-safe scikit-learn Pipeline.'],
  ['Model Evaluation', 'Score the saved pipeline on a separate testing dataset and report accuracy, precision, recall, F1, confusion matrix, classification report, FPR and FNR.'],
  ['Threat Detection', 'Apply the trained model and its saved preprocessing to an uploaded traffic CSV, producing per-record predictions, confidence, severity and recommended actions.'],
  ['Security Alerts', 'Persist alerts raised from model-detected threats with stable fingerprint deduplication, severity and status filters, triage actions and CSV export.'],
  ['Reports', 'Generate four CSV reports (dataset summary, model evaluation, detection results, security alerts) plus a printable project report.'],
  ['Shared state', 'A single application context keeps datasets, model, evaluation, detection and alert counts consistent across every page.'],
  ['Automated tests', 'pytest covers the backend ML and API surface; Vitest covers the frontend utilities and components.'],
] as const;

export default function AboutPage() {
  const { connection, health, meta, datasets, activeModel, evaluation, detection, alertStats, storage, loading } =
    useAnalysis();

  if (loading) return <LoadingBlock label="Loading project information…" />;

  const realDatasets = datasets.filter((dataset) => !dataset.isSample);

  return (
    <div className="space-y-5">
      <PageHeader
        title="About NetShield AI"
        description="Project scope, architecture, technology stack, machine-learning workflow, security considerations and — importantly — the difference between the offline dataset analysis this application performs and live network monitoring."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="soc-panel flex items-center gap-2 px-3 py-2 text-xs">
          <StatusDot className={connection === 'online' ? 'bg-soc-low' : connection === 'connecting' ? 'bg-soc-medium' : 'bg-soc-critical'} />
          <span className="text-soc-muted">Backend</span>
          <span className="text-soc-text">{connection}</span>
          <span className="ml-auto text-soc-muted">v{health?.version ?? '—'}</span>
        </div>
        <div className="soc-panel px-3 py-2 text-xs">
          <span className="text-soc-muted">scikit-learn </span>
          <span className="text-soc-text">{health?.scikitLearn ?? 'unavailable'}</span>
        </div>
        <div className="soc-panel px-3 py-2 text-xs">
          <span className="text-soc-muted">Datasets loaded </span>
          <span className="text-soc-text">{formatNumber(datasets.length)}</span>
          {realDatasets.length === 0 && datasets.length > 0 && <span className="ml-1 text-soc-medium">(all sample)</span>}
        </div>
        <div className="soc-panel px-3 py-2 text-xs">
          <span className="text-soc-muted">Active model </span>
          <span className="text-soc-text">{activeModel ? activeModel.algorithmLabel : 'none'}</span>
        </div>
      </div>

      <Notice tone="warning" title="Offline dataset analysis — not live network monitoring">
        <p>
          <strong className="text-soc-text">This application analyses CSV files.</strong> It does not capture packets, it
          does not read live network interfaces or NetFlow feeds, and it does not sit inline in your network.
        </p>
        <p className="mt-2">
          <strong className="text-soc-text">Live network monitoring</strong> would require a capture agent (libpcap, a
          span port, a TAP or a flow exporter) continuously producing records, a streaming inference pipeline, and
          storage sized for continuous traffic. NetShield AI implements none of that. Threat Detection scores a file you
          upload and persists the results — the workflow is deliberately reproducible and offline.
        </p>
        <p className="mt-2">
          <strong className="text-soc-text">No automatic blocking.</strong> Recommended actions are advisory text for an
          analyst. NetShield AI never blocks traffic, quarantines a host or reconfigures a firewall, IDS or any other
          device.
        </p>
      </Notice>

      <Panel title="Project title" subtitle="Official project identity">
        <p className="text-sm text-soc-text">
          <strong>NetShield AI</strong> — Network Anomaly Detection and Intrusion Monitoring System
        </p>
        <p className="mt-1 text-xs text-soc-muted">
          A case-study implementation of a machine-learning network intrusion detection pipeline on the UNSW-NB15 dataset.
        </p>
      </Panel>

      <Panel title="Abstract" subtitle="What this system does">
        <p className="text-xs leading-relaxed text-soc-text/90">
          NetShield AI is a web-based security analytics application for network intrusion detection. It ingests
          UNSW-NB15 CSV records, validates and profiles them, trains and evaluates supervised classifiers, applies the
          trained model to new traffic records, grades the results by severity and manages the resulting alerts. The
          design emphasises methodological correctness: target columns and identifiers are excluded from the input
          features, preprocessing is fitted only on training data and persisted with the estimator, and no metric is
          ever displayed unless it was computed by the backend from real predictions.
        </p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Objectives" subtitle="What the project sets out to demonstrate">
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
            <li>Validated ingestion of the UNSW-NB15 training and testing datasets.</li>
            <li>Complete statistical profiling of any uploaded CSV.</li>
            <li>Leakage-free training of three classical classifiers for binary and multiclass targets.</li>
            <li>Honest evaluation on a strictly separate testing dataset.</li>
            <li>Model-driven batch detection with confidence and severity, and operational alert triage.</li>
            <li>Reproducible, testable and documented code suitable for version control.</li>
          </ul>
        </Panel>

        <Panel title="Main features" subtitle="Implemented functionality">
          <dl className="space-y-2.5 text-xs">
            {FEATURES.map(([name, description]) => (
              <div key={name}>
                <dt className="font-medium text-soc-text">{name}</dt>
                <dd className="mt-0.5 leading-relaxed text-soc-muted">{description}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel title="System architecture" subtitle="How the layers fit together">
        <pre className="overflow-auto rounded-lg border border-soc-border bg-soc-panel2/60 px-4 py-3 text-[11px] leading-relaxed text-soc-muted">{`┌──────────────────────────────────────────────────────────┐
│ Next.js front end (React + TypeScript, App Router)       │
│  Dashboard · Dataset · Training · Evaluation ·           │
│  Detection · Alerts · Reports · About                    │
│  shared state: AnalysisContext                           │
└───────────────┬──────────────────────────────────────────┘
                │ HTTP /pyapi/* (proxied to :8000)
┌───────────────▼──────────────────────────────────────────┐
│ FastAPI backend                                          │
│  routers/   datasets · models · detection · alerts ·      │
│             system                                       │
│  ml/        schema_utils (feature selection), dataset     │
│             (profiling), pipeline (sklearn), training,    │
│             evaluation, metrics, detection, targets       │
│  services   store · alerts (SQLite) · cache · jobs        │
└───────────────┬──────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────┐
│ storage/  datasets/*.csv · models/*.joblib + *.json       │
│           evaluations/*.json · detections/*.jsonl         │
│           alerts.db (SQLite)                             │
└──────────────────────────────────────────────────────────┘`}</pre>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Technology stack" subtitle="Frameworks and libraries actually used">
          <KeyValue
            items={[
              { label: 'Frontend framework', value: 'Next.js (App Router)' },
              { label: 'UI library', value: 'React' },
              { label: 'Language', value: 'TypeScript' },
              { label: 'Styling', value: 'Tailwind CSS (dark SOC theme)' },
              { label: 'Charts', value: 'Dependency-free SVG components' },
              { label: 'Backend', value: 'FastAPI + Uvicorn' },
              { label: 'Validation', value: 'Pydantic' },
              { label: 'Machine learning', value: 'scikit-learn' },
              { label: 'Data handling', value: 'pandas + NumPy' },
              { label: 'Model persistence', value: 'joblib' },
              { label: 'Alert storage', value: 'SQLite' },
              { label: 'Backend tests', value: 'pytest + httpx TestClient' },
              { label: 'Frontend tests', value: 'Vitest + Testing Library' },
            ]}
          />
        </Panel>

        <Panel title="Dataset information" subtitle="UNSW-NB15">
          <p className="text-xs leading-relaxed text-soc-muted">
            UNSW-NB15 (Moustafa &amp; Slay, 2015) contains labelled network flow records generated in a controlled testbed.
            Each record has 40+ numeric and categorical flow features plus two targets: <code>label</code> (0 = normal,
            1 = attack) and <code>attack_cat</code> (attack family: Fuzzers, Analysis, Backdoors, DoS, Exploits, Generic,
            Reconnaissance, Shellcode, Worms).
          </p>
          <p className="mt-2 text-xs leading-relaxed text-soc-muted">
            The official distribution separates a training set from a testing set. NetShield AI expects the files in the
            project <code>data/</code> directory or uploaded through the Dataset Analysis page. Large CSVs are excluded
            from version control by <code>.gitignore</code>.
          </p>
          <div className="mt-3 space-y-2 text-xs">
            <p className="text-soc-muted">
              Bundled sample data:{' '}
              <span className="text-soc-text">data/sample/SAMPLE_synthetic_*.csv</span>
            </p>
            <SampleBadge show />
            <p className="text-[11px] text-soc-medium">
              The bundled files are synthetic and clearly labelled. They exist only to demonstrate the workflow and to
              run the automated tests — they are not UNSW-NB15 and must never be used for performance claims.
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Machine learning workflow" subtitle="End-to-end, leakage-safe">
        <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
          <li>Upload and validate the CSV — extension, header, at least two columns and at least one target column.</li>
          <li>Profile the dataset — dimensions, dtypes, missing values, duplicates, statistics and distributions.</li>
          <li>Select features — <code>id</code>, <code>label</code>, <code>attack_cat</code> and detected identifier columns are always excluded.</li>
          <li>Fit the preprocessing — median imputation for numeric, most-frequent imputation plus one-hot encoding for categorical, optional standardisation for Logistic Regression.</li>
          <li>Fit the estimator inside the same Pipeline so preprocessing and model are saved as one artifact.</li>
          <li>Evaluate on the separate testing dataset by loading that artifact; the preprocessing is never re-fitted.</li>
          <li>Detect — apply the artifact to an uploaded traffic CSV, grade severity from the model confidence and raise deduplicated alerts.</li>
          <li>Report — export the four CSV reports and print the project report.</li>
        </ol>
      </Panel>

      <Panel title="Security and privacy considerations" subtitle="How data is handled">
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
          <li>All processing is local: uploads are analysed by the FastAPI process running on your machine and are never sent to a third-party service.</li>
          <li>The backend exposes no filesystem paths and no credentials in its API responses; errors return structured codes and messages only.</li>
          <li>Uploads are restricted to <code>.csv</code>, capped in size, stored under controlled directories and given server-generated filenames — uploaded content is never executed.</li>
          <li>Only the first few input feature values of a flagged record are stored in the alert record; the full uploaded file is not copied into the alert store.</li>
          <li>Do not upload real production traffic captures to a shared or cloud deployment without an approved data-handling policy: flow features can be sensitive.</li>
          <li>There is no authentication layer. Run this application on localhost or an isolated network only.</li>
        </ul>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Current implementation status" subtitle="Live state reported by the backend">
          <ul className="space-y-2 text-xs">
            <StatusRow ok={connection === 'online'} label="Backend connection" detail={connection} />
            <StatusRow ok={Boolean(health?.scikitLearn)} label="scikit-learn available" detail={health?.scikitLearn ?? 'not detected'} />
            <StatusRow ok={realDatasets.length > 0} label="Real dataset loaded" detail={realDatasets.length > 0 ? `${realDatasets.length} dataset(s)` : datasets.length > 0 ? 'only sample data loaded' : 'none'} />
            <StatusRow ok={Boolean(activeModel)} label="Model trained" detail={activeModel ? `${activeModel.algorithmLabel} · ${formatNumber(activeModel.featureCount)} features` : 'none'} />
            <StatusRow ok={Boolean(evaluation)} label="Model evaluated" detail={evaluation ? formatDateTime(evaluation.evaluatedAt) : 'not yet'} />
            <StatusRow ok={Boolean(detection)} label="Detection run performed" detail={detection ? formatDateTime(detection.createdAt) : 'not yet'} />
            <StatusRow ok={(alertStats?.total ?? 0) > 0} label="Alerts recorded" detail={`${formatNumber(alertStats?.total ?? 0)} total`} />
            <StatusRow ok={Boolean(storage)} label="Storage in use" detail={storage ? `${formatNumber(storage.storageBytes)} B across ${storage.datasets} dataset(s)` : '—'} />
          </ul>
          {meta && (
            <p className="mt-3 border-t border-soc-border pt-2 text-[11px] text-soc-muted">
              Severity thresholds: critical ≥ {meta.severityRules.critical}, high ≥ {meta.severityRules.high}, medium ≥{' '}
              {meta.severityRules.medium}. Project data directory:{' '}
              <code>{meta.projectDataDir}</code> ({meta.projectDataDirExists ? 'present' : 'missing'}).
            </p>
          )}
        </Panel>

        <Panel title="Known limitations" subtitle="Stated honestly">
          <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
            <li>Offline batch analysis only — no packet capture, no streaming inference, no live interface monitoring.</li>
            <li>No automatic enforcement — the system never blocks, quarantines or reconfigures anything.</li>
            <li>No authentication or multi-user access control; alerts are stored in a local SQLite file.</li>
            <li>Uploads are processed in memory, so extremely large CSVs are limited by available RAM.</li>
            <li>Three classical algorithms are supported; no deep learning or hyper-parameter search.</li>
            <li>Model quality depends entirely on the data provided. Bundled synthetic sample data is not representative.</li>
            <li>Detection scoring is not streamed; very large detection files are capped by the backend configuration.</li>
          </ul>
        </Panel>
      </div>

      <Panel title="Future scope" subtitle="Natural next steps">
        <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
          <li>Live capture integration (PCAP replay or NetFlow ingestion) with a streaming inference path.</li>
          <li>Additional algorithms and automated hyper-parameter search with cross-validation.</li>
          <li>Per-prediction explainability (feature importances, SHAP values) to justify each alert.</li>
          <li>Authentication, analyst accounts, audit logging and role-based alert triage.</li>
          <li>Drift monitoring that compares live feature distributions with the training distribution.</li>
          <li>Optional deployment to a container platform with a managed database instead of local SQLite.</li>
        </ul>
      </Panel>

      <Panel title="Where to start" subtitle="Recommended walkthrough">
        <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-soc-muted">
          <li>
            <Link href="/dataset" className="text-soc-accent hover:underline">Load a dataset</Link> — upload
            UNSW_NB15_training-set.csv and UNSW_NB15_testing-set.csv, or place them in <code>data/</code>.
          </li>
          <li>
            <Link href="/training" className="text-soc-accent hover:underline">Train a model</Link> — choose an algorithm
            and target column.
          </li>
          <li>
            <Link href="/evaluation" className="text-soc-accent hover:underline">Evaluate it</Link> against the testing
            dataset.
          </li>
          <li>
            <Link href="/detection" className="text-soc-accent hover:underline">Run threat detection</Link> on a traffic
            CSV.
          </li>
          <li>
            <Link href="/alerts" className="text-soc-accent hover:underline">Triage the alerts</Link>, then export
            everything from the <Link href="/reports" className="text-soc-accent hover:underline">Reports</Link> page.
          </li>
        </ol>
      </Panel>
    </div>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <StatusDot className={ok ? 'bg-soc-low mt-1.5' : 'bg-soc-muted mt-1.5'} />
      <span className="min-w-0">
        <span className="font-medium text-soc-text">{label}</span>
        <span className="ml-2 text-soc-muted">{detail}</span>
      </span>
      <Badge className={ok ? 'ml-auto border-soc-low/40 bg-soc-low/10 text-soc-low' : 'ml-auto'}>
        {ok ? 'ready' : 'pending'}
      </Badge>
    </li>
  );
}
