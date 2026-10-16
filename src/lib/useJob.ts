'use client';

/**
 * Polls the backend job registry while a long-running operation (training,
 * evaluation or detection) is executing.
 *
 * The backend runs those operations on a worker thread and exposes
 * ``GET /api/jobs/{id}``. This hook is the only place the UI talks to that
 * endpoint, so progress, errors and results are handled identically everywhere.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';
import type { JobState } from './types';

export interface JobController {
  job: JobState | null;
  running: boolean;
  error: string | null;
  details: string[];
  /** Run a call that returns a job id, then poll until it finishes. */
  start: (run: () => Promise<{ jobId: string }>) => Promise<JobState | null>;
  reset: () => void;
}

export function useJob({ intervalMs = 700 }: { intervalMs?: number } = {}): JobController {
  const [job, setJob] = useState<JobState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  const mounted = useRef(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const reset = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setJob(null);
    setError(null);
    setDetails([]);
  }, []);

  const poll = useCallback(
    (jobId: string) =>
      new Promise<JobState | null>((resolve) => {
        const tick = async () => {
          let state: JobState;
          try {
            state = await api.jobs.get(jobId);
          } catch (err) {
            if (mounted.current) {
              setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err));
            }
            resolve(null);
            return;
          }
          if (!mounted.current) {
            resolve(null);
            return;
          }
          setJob(state);
          if (state.status === 'succeeded' || state.status === 'failed') {
            if (state.status === 'failed') {
              setError(state.error ?? 'The operation failed.');
              const result = state.result as { details?: unknown } | null;
              const raw = result && Array.isArray(result.details) ? result.details : [];
              setDetails(raw.map((item) => String(item)));
            }
            resolve(state);
            return;
          }
          timer.current = window.setTimeout(() => void tick(), intervalMs);
        };
        void tick();
      }),
    [intervalMs],
  );

  const start = useCallback(
    async (run: () => Promise<{ jobId: string }>) => {
      setRunning(true);
      setJob(null);
      setError(null);
      setDetails([]);
      try {
        const { jobId } = await run();
        return await poll(jobId);
      } catch (err) {
        if (mounted.current) {
          if (err instanceof ApiError) {
            setError(err.message);
            setDetails(err.details ?? []);
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
        }
        return null;
      } finally {
        if (mounted.current) setRunning(false);
      }
    },
    [poll],
  );

  return { job, running, error, details, start, reset };
}
