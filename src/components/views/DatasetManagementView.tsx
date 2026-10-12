import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Sliders,
  Layers,
  Upload,
  Check,
  AlertTriangle
} from 'lucide-react';

import { useSecurity } from '../../context/SecurityContext';

interface UploadedDatasetResult {
  fileName: string;
  totalRecords: number;
  featureCount: number;
  normalTraffic: number;
  detectedAttacks: number;
  attackTypes: Record<string, number>;
  columns: string[];
  features: string[];
  sampleRecords: Record<string, string>[];
}

export const DatasetManagementView: React.FC = () => {
  const {
    datasets,
    runDatasetPreprocessing,
    preprocessingProgress
  } = useSecurity();

  const [selectedDatasetId, setSelectedDatasetId] =
    useState<'CICIDS2017' | 'UNSW-NB15'>('CICIDS2017');

  const [activeTab, setActiveTab] =
    useState<'overview' | 'features' | 'samples'>('overview');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] =
    useState<UploadedDatasetResult | null>(null);
  const [uploadError, setUploadError] = useState('');

  const selectedDataset =
    datasets.find(d => d.id === selectedDatasetId) || datasets[0];

  const progress =
    preprocessingProgress[selectedDatasetId] ||
    (selectedDataset.status === 'Model Ready' ? 100 : 0);

  const pipelineSteps = [
    {
      name: 'Data Loading',
      desc: 'Read raw CSV network-flow records into memory'
    },
    {
      name: 'Cleaning & Deduplication',
      desc: 'Remove invalid, duplicate and empty records'
    },
    {
      name: 'Missing Value Handling',
      desc: 'Handle missing and invalid numerical values'
    },
    {
      name: 'Feature Processing',
      desc: 'Identify numerical network-flow features'
    },
    {
      name: 'Model-Ready Data',
      desc: 'Generate clean feature vectors for ML analysis'
    }
  ];

  const handleRunPipeline = () => {
    runDatasetPreprocessing(selectedDatasetId);
  };

  // ============================================================
  // CSV PARSER
  // ============================================================

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (
          insideQuotes &&
          line[i + 1] === '"'
        ) {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());

    return result;
  };

  const splitCSVIntoLines = (text: string): string[] => {
    const lines: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === '"') {
        if (
          insideQuotes &&
          text[i + 1] === '"'
        ) {
          current += '""';
          i++;
        } else {
          insideQuotes = !insideQuotes;
          current += char;
        }
      } else if (
        (char === '\n' || char === '\r') &&
        !insideQuotes
      ) {
        if (current.trim() !== '') {
          lines.push(current);
        }

        current = '';

        if (
          char === '\r' &&
          text[i + 1] === '\n'
        ) {
          i++;
        }
      } else {
        current += char;
      }
    }

    if (current.trim() !== '') {
      lines.push(current);
    }

    return lines;
  };

  // ============================================================
  // DATASET PROCESSING
  // ============================================================

  const processCSVFile = async (file: File) => {
    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    try {
      const text = await file.text();

      if (!text.trim()) {
        throw new Error('The selected CSV file is empty.');
      }

      const lines = splitCSVIntoLines(text);

      if (lines.length < 2) {
        throw new Error(
          'CSV must contain a header row and at least one data row.'
        );
      }

      const headers = parseCSVLine(lines[0]).map(
        header => header.trim().replace(/^"|"$/g, '')
      );
      console.log("========== CSV DEBUG ==========");
console.log("RAW HEADER:", lines[0]);
console.log("PARSED HEADERS:", headers);
console.log("HEADER COUNT:", headers.length);
console.log("FIRST DATA ROW:", lines[1]);
console.log("FIRST DATA VALUES:", parseCSVLine(lines[1]));
console.log("DATA VALUE COUNT:", parseCSVLine(lines[1]).length);
console.log("================================");

      if (headers.length === 0) {
        throw new Error('No columns found in the CSV file.');
      }

      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        if (
          values.length === 0 ||
          values.every(value => value.trim() === '')
        ) {
          continue;
        }

        const row: Record<string, string> = {};

        headers.forEach((header, index) => {
          row[header] = (values[index] || '').trim();
        });

        rows.push(row);
      }

      // ========================================================
      // FIND LABEL COLUMN
      // ========================================================

      const normalizedHeaders = headers.map(header =>
        header
          .toLowerCase()
          .replace(/[\s_-]+/g, '')
      );

      const possibleLabelNames = [
        'label',
        'attack',
        'attacktype',
        'clas',
        'class',
        'target',
        'category',
        'trafficlabel'
      ];

      let labelIndex = normalizedHeaders.findIndex(
        header =>
          possibleLabelNames.includes(header) ||
          header.includes('label') ||
          header.includes('attacktype') ||
          header.includes('trafficlabel')
      );

      // CICIDS commonly uses "Label"
      if (labelIndex === -1) {
        const exactLabelIndex = headers.findIndex(
          header =>
            header.toLowerCase().trim() === 'label'
        );

        if (exactLabelIndex !== -1) {
          labelIndex = exactLabelIndex;
        }
      }

      const labelColumn =
        labelIndex >= 0
          ? headers[labelIndex]
          : null;

      // ========================================================
      // FEATURE COLUMNS
      // ========================================================

      let featureColumns: string[];

      if (labelColumn) {
        featureColumns = headers.filter(
          (_, index) => index !== labelIndex
        );
      } else {
        featureColumns = [...headers];
      }

      // Remove completely empty columns
      featureColumns = featureColumns.filter(
        column =>
          rows.some(
            row =>
              row[column] !== undefined &&
              row[column].trim() !== ''
          )
      );

      // ========================================================
      // LABEL COUNTS
      // ========================================================

      let normalTraffic = 0;
      let detectedAttacks = 0;

      const attackTypes: Record<string, number> = {};

      if (labelColumn) {
        rows.forEach(row => {
          const rawLabel =
            row[labelColumn]?.trim() || '';

          const label = rawLabel
            .replace(/^"|"$/g, '')
            .trim();

          if (!label) {
            return;
          }

          const normalizedLabel =
            label.toLowerCase();

          const isBenign =
            normalizedLabel === 'benign' ||
            normalizedLabel === 'normal' ||
            normalizedLabel === 'normal traffic' ||
            normalizedLabel === '0';

          if (isBenign) {
            normalTraffic++;
          } else {
            detectedAttacks++;

            attackTypes[label] =
              (attackTypes[label] || 0) + 1;
          }
        });
      } else {
        // No label column found.
        // Dataset records are still loaded,
        // but attack/benign counts cannot be determined.
        normalTraffic = 0;
        detectedAttacks = 0;
      }

      // ========================================================
      // SAMPLE RECORDS
      // ========================================================

      const sampleRecords =
        rows.slice(0, 10);

      setUploadResult({
        fileName: file.name,
        totalRecords: rows.length,
        featureCount: featureColumns.length,
        normalTraffic,
        detectedAttacks,
        attackTypes,
        columns: headers,
        features: featureColumns,
        sampleRecords
      });

    } catch (error: any) {
      console.error(
        'CSV processing error:',
        error
      );

      setUploadError(
        error?.message ||
        'Unable to process the CSV file.'
      );
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // FILE SELECTION
  // ============================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0] || null;

    setSelectedFile(file);
    setUploadError('');
    setUploadResult(null);
  };

  // ============================================================
  // UPLOAD / PROCESS
  // ============================================================

  const handleDatasetUpload = async () => {
    if (!selectedFile) {
      setUploadError(
        'Please select a CSV file first.'
      );
      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith('.csv')
    ) {
      setUploadError(
        'Only CSV files are supported.'
      );
      return;
    }

    await processCSVFile(selectedFile);
  };

  return (
    <div className="space-y-6 pb-12">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">

        <div>
          <div className="flex items-center gap-2">

            <Database className="w-5 h-5 text-cyan-400" />

            <h2 className="text-lg font-bold text-white font-mono">
              SECURITY DATASET INGESTION & PREPROCESSING
            </h2>

          </div>

          <p className="text-xs text-slate-400 font-mono mt-1">
            Upload and analyze CICIDS2017, UNSW-NB15
            and other network traffic CSV datasets
          </p>
        </div>

        {/* DATASET SWITCHER */}

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">

          {(
            ['CICIDS2017', 'UNSW-NB15'] as const
          ).map(id => (

            <button
              key={id}
              onClick={() =>
                setSelectedDatasetId(id)
              }
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                selectedDatasetId === id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {id}
            </button>

          ))}

        </div>

      </div>

      {/* ====================================================== */}
      {/* CSV UPLOAD */}
      {/* ====================================================== */}

      <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl">

        <div className="flex items-center gap-2 mb-4">

          <Upload className="w-5 h-5 text-cyan-400" />

          <div>

            <h3 className="text-sm font-bold text-white font-mono">
              DATASET UPLOAD & ANALYSIS
            </h3>

            <p className="text-xs text-slate-400 font-mono mt-1">
              Select a network traffic CSV file.
              The browser will read and analyze the CSV directly.
            </p>

          </div>

        </div>

        {/* UPLOAD AREA */}

        <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-8 text-center transition-all">

          <Upload className="w-10 h-10 mx-auto text-cyan-400 mb-3" />

          <p className="text-sm text-slate-300 font-mono">
            Select your network traffic CSV file
          </p>

          <p className="text-xs text-slate-500 font-mono mt-1">
            Supported format: .CSV
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            id="dataset-upload"
            className="hidden"
            onChange={handleFileChange}
          />

          <label
            htmlFor="dataset-upload"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-bold cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            CHOOSE CSV FILE
          </label>

          {/* SELECTED FILE */}

          {selectedFile && (

            <div className="mt-4">

              <div className="text-xs font-mono text-emerald-400">

                Selected:
                {' '}
                {selectedFile.name}

              </div>

              <div className="text-[10px] text-slate-500 font-mono mt-1">

                Size:
                {' '}
                {(selectedFile.size / 1024 / 1024).toFixed(2)}
                {' '}
                MB

              </div>

            </div>

          )}

          {/* PROCESS BUTTON */}

          <button
            onClick={handleDatasetUpload}
            disabled={!selectedFile || uploading}
            className="mt-4 ml-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-mono text-xs font-bold uppercase transition-all"
          >

            {uploading
              ? 'ANALYZING CSV...'
              : 'UPLOAD & ANALYZE'}

          </button>

          {/* ERROR */}

          {uploadError && (

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-rose-400 font-mono">

              <AlertTriangle className="w-4 h-4" />

              {uploadError}

            </div>

          )}

        </div>

        {/* ================================================== */}
        {/* RESULT */}
        {/* ================================================== */}

        {uploadResult && (

          <div className="mt-6">

            <div className="flex items-center gap-2 mb-4">

              <CheckCircle2 className="w-5 h-5 text-emerald-400" />

              <div>

                <p className="text-xs text-emerald-400 font-mono font-bold">
                  DATASET ANALYZED SUCCESSFULLY
                </p>

                <p className="text-[10px] text-slate-500 font-mono">
                  {uploadResult.fileName}
                </p>

              </div>

            </div>

            {/* RESULT CARDS */}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">

                <p className="text-[10px] text-slate-500 font-mono">
                  TOTAL RECORDS
                </p>

                <p className="text-lg text-white font-mono font-bold">

                  {uploadResult.totalRecords.toLocaleString()}

                </p>

              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-cyan-900">

                <p className="text-[10px] text-slate-500 font-mono">
                  FEATURES
                </p>

                <p className="text-lg text-cyan-400 font-mono font-bold">

                  {uploadResult.featureCount}

                </p>

              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-emerald-900">

                <p className="text-[10px] text-slate-500 font-mono">
                  BENIGN FLOWS
                </p>

                <p className="text-lg text-emerald-400 font-mono font-bold">

                  {uploadResult.normalTraffic.toLocaleString()}

                </p>

              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-rose-900">

                <p className="text-[10px] text-slate-500 font-mono">
                  ATTACK FLOWS
                </p>

                <p className="text-lg text-rose-400 font-mono font-bold">

                  {uploadResult.detectedAttacks.toLocaleString()}

                </p>

              </div>

            </div>

            {/* LABEL COLUMN */}

            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800">

              <p className="text-[10px] text-slate-500 font-mono">
                CSV COLUMNS
              </p>

              <p className="text-xs text-slate-300 font-mono mt-1">

                {uploadResult.columns.length}

                {' '}
                columns detected

              </p>

            </div>

            {/* ATTACK CLASSES */}

            {Object.keys(
              uploadResult.attackTypes
            ).length > 0 && (

              <div className="mt-4">

                <p className="text-xs text-slate-400 font-mono mb-2">
                  DETECTED ATTACK CLASSES
                </p>

                <div className="flex flex-wrap gap-2">

                  {Object.entries(
                    uploadResult.attackTypes
                  ).map(([attack, count]) => (

                    <span
                      key={attack}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs font-mono text-rose-300"
                    >
                      {attack}:
                      {' '}
                      {count.toLocaleString()}
                    </span>

                  ))}

                </div>

              </div>

            )}

          </div>

        )}

      </div>

      {/* ====================================================== */}
      {/* UPLOADED DATASET SUMMARY */}
      {/* ====================================================== */}

      {uploadResult && (

        <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl">

          <div className="flex items-center gap-2 mb-4">

            <Layers className="w-4 h-4 text-cyan-400" />

            <h3 className="text-sm font-bold text-white font-mono">
              UPLOADED DATASET EXPLORER
            </h3>

          </div>

          {/* TABS */}

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-fit mb-5">

            <button
              onClick={() =>
                setActiveTab('overview')
              }
              className={`px-3 py-1.5 rounded text-xs font-mono ${
                activeTab === 'overview'
                  ? 'bg-cyan-950 text-cyan-300'
                  : 'text-slate-400'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() =>
                setActiveTab('features')
              }
              className={`px-3 py-1.5 rounded text-xs font-mono ${
                activeTab === 'features'
                  ? 'bg-cyan-950 text-cyan-300'
                  : 'text-slate-400'
              }`}
            >
              Features
            </button>

            <button
              onClick={() =>
                setActiveTab('samples')
              }
              className={`px-3 py-1.5 rounded text-xs font-mono ${
                activeTab === 'samples'
                  ? 'bg-cyan-950 text-cyan-300'
                  : 'text-slate-400'
              }`}
            >
              Sample Records
            </button>

          </div>

          {/* OVERVIEW */}

          {activeTab === 'overview' && (

            <div className="space-y-4">

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">

                  <p className="text-[10px] text-slate-500 font-mono">
                    RECORDS
                  </p>

                  <p className="text-xl text-white font-mono font-bold mt-1">

                    {uploadResult.totalRecords.toLocaleString()}

                  </p>

                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">

                  <p className="text-[10px] text-slate-500 font-mono">
                    FEATURES
                  </p>

                  <p className="text-xl text-cyan-400 font-mono font-bold mt-1">

                    {uploadResult.featureCount}

                  </p>

                </div>

                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">

                  <p className="text-[10px] text-slate-500 font-mono">
                    TOTAL COLUMNS
                  </p>

                  <p className="text-xl text-white font-mono font-bold mt-1">

                    {uploadResult.columns.length}

                  </p>

                </div>

              </div>

              {Object.keys(
                uploadResult.attackTypes
              ).length === 0 && (

                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/50">

                  <p className="text-xs text-amber-300 font-mono">

                    No attack labels were detected.

                  </p>

                  <p className="text-[11px] text-slate-400 font-mono mt-1">

                    Make sure your CSV contains a Label,
                    Class or Attack Type column.

                  </p>

                </div>

              )}

            </div>

          )}

          {/* FEATURES */}

          {activeTab === 'features' && (

            <div>

              <p className="text-xs text-slate-400 font-mono mb-3">

                Detected feature columns:
                {' '}
                {uploadResult.featureCount}

              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">

                {uploadResult.features.map(
                  (feature, index) => (

                    <div
                      key={`${feature}-${index}`}
                      className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2"
                    >

                      <span className="text-[10px] text-slate-500 font-bold">
                        {index + 1}.
                      </span>

                      <span className="text-xs font-mono truncate">
                        {feature}
                      </span>

                    </div>

                  )
                )}

              </div>

            </div>

          )}

          {/* SAMPLE RECORDS */}

          {activeTab === 'samples' && (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-xs font-mono">

                <thead>

                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">

                    {uploadResult.columns.map(
                      column => (

                        <th
                          key={column}
                          className="py-2 px-3 whitespace-nowrap"
                        >
                          {column}
                        </th>

                      )
                    )}

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-800/60">

                  {uploadResult.sampleRecords.map(
                    (row, index) => (

                      <tr
                        key={index}
                        className="hover:bg-slate-800/40"
                      >

                        {uploadResult.columns.map(
                          column => (

                            <td
                              key={column}
                              className="py-2 px-3 text-slate-300 whitespace-nowrap max-w-[220px] truncate"
                              title={row[column]}
                            >
                              {row[column]}
                            </td>

                          )
                        )}

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      )}

      {/* ====================================================== */}
      {/* DATASET OVERVIEW */}
      {/* ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800">

          <p className="text-xs text-slate-400 font-mono uppercase">
            Total Records
          </p>

          <p className="text-2xl font-bold font-mono text-white mt-1">

            {selectedDataset.recordCount.toLocaleString()}

          </p>

          <p className="text-[11px] text-cyan-400 font-mono mt-0.5">
            Verified flow vectors
          </p>

        </div>

        <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800">

          <p className="text-xs text-slate-400 font-mono uppercase">
            Extracted Features
          </p>

          <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">

            {selectedDataset.featureCount}

          </p>

          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Flow statistical attributes
          </p>

        </div>

        <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800">

          <p className="text-xs text-slate-400 font-mono uppercase">
            Normal Flows
          </p>

          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">

            {selectedDataset.normalCount.toLocaleString()}

          </p>

        </div>

        <div className="p-4 rounded-xl bg-[#0f172a]/90 border border-slate-800">

          <p className="text-xs text-slate-400 font-mono uppercase">
            Attack Flows
          </p>

          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">

            {selectedDataset.attackCount.toLocaleString()}

          </p>

        </div>

      </div>

      {/* ====================================================== */}
      {/* PREPROCESSING PIPELINE */}
      {/* ====================================================== */}

      <div className="p-5 rounded-xl bg-[#0f172a]/90 border border-slate-800 shadow-xl space-y-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          <div>

            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">

              <Sliders className="w-4 h-4 text-cyan-400" />

              ML FEATURE PREPROCESSING PIPELINE

            </h3>

            <p className="text-xs text-slate-400 font-mono mt-0.5">

              Automated data ingestion, cleaning,
              feature processing and model preparation

            </p>

          </div>

          <button
            onClick={handleRunPipeline}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all"
          >

            <RefreshCw className="w-3.5 h-3.5" />

            Re-Execute Pipeline

          </button>

        </div>

        {/* PROGRESS */}

        <div className="space-y-1.5">

          <div className="flex justify-between text-xs font-mono">

            <span className="text-slate-400">
              Preprocessing Pipeline Status:
            </span>

            <span className="text-cyan-400 font-bold">
              {progress}% Complete
            </span>

          </div>

          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">

            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{
                width: `${progress}%`
              }}
            />

          </div>

        </div>

        {/* PIPELINE STEPS */}

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">

          {pipelineSteps.map(
            (step, index) => {

              const threshold =
                (index + 1) * 20;

              const isCompleted =
                progress >= threshold;

              const isCurrent =
                progress > index * 20 &&
                progress < threshold;

              return (

                <div
                  key={step.name}
                  className={`p-3 rounded-lg border text-xs font-mono ${
                    isCompleted
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                      : isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-500'
                  }`}
                >

                  <div className="flex items-center justify-between mb-1.5">

                    <span className="text-[10px] font-bold text-slate-400">
                      STAGE 0{index + 1}
                    </span>

                    {isCompleted ? (

                      <Check className="w-3.5 h-3.5 text-emerald-400" />

                    ) : (

                      <Clock className="w-3.5 h-3.5 text-slate-500" />

                    )}

                  </div>

                  <p className="font-bold text-slate-200">
                    {step.name}
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {step.desc}
                  </p>

                </div>

              );
            }
          )}

        </div>

      </div>

    </div>
  );
};