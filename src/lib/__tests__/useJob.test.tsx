import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useJob } from '@/lib/useJob';
import { ApiError, api } from '@/lib/api';
import type { JobState } from '@/lib/types';

function jobState(overrides: Partial<JobState> = {}): JobState {
  return {
    id: 'job1',
    kind: 'training',
    status: 'running',
    progress: 10,
    message: 'Loading dataset',
    error: null,
    result: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** Minimal harness that exposes the hook's state to assertions. */
function Probe({ run }: { run: () => Promise<{ jobId: string }> }) {
  const controller = useJob({ intervalMs: 1 });
  return (
    <div>
      <button type="button" onClick={() => void controller.start(run)}>
        start
      </button>
      <button type="button" onClick={controller.reset}>
        reset
      </button>
      <span data-testid="status">{controller.job?.status ?? 'idle'}</span>
      <span data-testid="progress">{controller.job ? String(controller.job.progress) : ''}</span>
      <span data-testid="message">{controller.job?.message ?? ''}</span>
      <span data-testid="running">{String(controller.running)}</span>
      <span data-testid="error">{controller.error ?? ''}</span>
      <span data-testid="details">{controller.details.join('|')}</span>
    </div>
  );
}

describe('useJob', () => {
  it('polls until the job succeeds and stops running', async () => {
    const get = vi
      .spyOn(api.jobs, 'get')
      .mockResolvedValueOnce(jobState({ status: 'running', progress: 40 }))
      .mockResolvedValueOnce(jobState({ status: 'succeeded', progress: 100, message: 'Model trained' }));

    render(<Probe run={async () => ({ jobId: 'job1' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'start' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('succeeded'));
    expect(screen.getByTestId('message')).toHaveTextContent('Model trained');
    expect(screen.getByTestId('running')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
    expect(get.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(get).toHaveBeenCalledWith('job1');
  });

  it('surfaces the failure message and validation details of a failed job', async () => {
    vi.spyOn(api.jobs, 'get').mockResolvedValue(
      jobState({
        status: 'failed',
        progress: 0,
        error: 'Training failed.',
        result: { details: ['Row 4 has a non-numeric duration.', 'Target column is constant.'] },
      }),
    );

    render(<Probe run={async () => ({ jobId: 'job1' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'start' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    expect(screen.getByTestId('error')).toHaveTextContent('Training failed.');
    expect(screen.getByTestId('details')).toHaveTextContent(
      'Row 4 has a non-numeric duration.|Target column is constant.',
    );
    expect(screen.getByTestId('running')).toHaveTextContent('false');
  });

  it('reports an ApiError raised while starting the job, with its details', async () => {
    const get = vi.spyOn(api.jobs, 'get');

    render(
      <Probe
        run={async () => {
          throw new ApiError('The training data is invalid.', 400, ['No rows remain after cleaning.'], 'invalid_dataset');
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'start' }));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('The training data is invalid.'));
    expect(screen.getByTestId('details')).toHaveTextContent('No rows remain after cleaning.');
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('running')).toHaveTextContent('false');
    expect(get).not.toHaveBeenCalled();
  });

  it('reports a polling error instead of pretending the job finished', async () => {
    vi.spyOn(api.jobs, 'get').mockRejectedValue(new ApiError('Cannot reach the NetShield backend.', 0, [], 'network_error'));

    render(<Probe run={async () => ({ jobId: 'job1' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'start' }));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Cannot reach the NetShield backend.'));
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('running')).toHaveTextContent('false');
  });

  it('clears progress, error and details on reset', async () => {
    vi.spyOn(api.jobs, 'get').mockResolvedValue(
      jobState({ status: 'failed', error: 'Failed.', result: { details: ['x'] } }),
    );

    render(<Probe run={async () => ({ jobId: 'job1' })} />);
    await userEvent.click(screen.getByRole('button', { name: 'start' }));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Failed.'));

    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('error')).toBeEmptyDOMElement();
    expect(screen.getByTestId('details')).toBeEmptyDOMElement();
  });
});
