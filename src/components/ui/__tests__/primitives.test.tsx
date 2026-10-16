import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  KeyValue,
  MetricCard,
  Notice,
  Pagination,
  SampleBadge,
  Tabs,
} from '@/components/ui/primitives';

describe('MetricCard', () => {
  it('renders the label, value and hint', () => {
    render(<MetricCard label="Total records" value="257,673" hint="UNSW-NB15 training set" />);
    expect(screen.getByText('Total records')).toBeInTheDocument();
    expect(screen.getByText('257,673')).toBeInTheDocument();
    expect(screen.getByText('UNSW-NB15 training set')).toBeInTheDocument();
  });

  it('shows an em dash when a metric has not been measured', () => {
    render(<MetricCard label="Attack count" value="—" hint="Labels unavailable" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('SampleBadge', () => {
  it('renders nothing when sample data is not in use', () => {
    const { container } = render(<SampleBadge show={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('clearly labels sample data when it is in use', () => {
    render(<SampleBadge show />);
    expect(screen.getByText(/sample data/i)).toBeInTheDocument();
  });
});

describe('feedback components', () => {
  it('renders an empty state with a description', () => {
    render(<EmptyState title="No datasets yet" description="Upload a CSV to begin." />);
    expect(screen.getByText('No datasets yet')).toBeInTheDocument();
    expect(screen.getByText('Upload a CSV to begin.')).toBeInTheDocument();
  });

  it('renders an error state with its details and a recovery action', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        message="Backend unavailable"
        details={['connection refused']}
        action={<Button onClick={onRetry}>Retry connection</Button>}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('Backend unavailable')).toBeInTheDocument();
    expect(screen.getByText('connection refused')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a notice with its message', () => {
    render(<Notice tone="warning">Heuristic mode is a rule-based assessment.</Notice>);
    expect(screen.getByText('Heuristic mode is a rule-based assessment.')).toBeInTheDocument();
  });
});

describe('Badge and KeyValue', () => {
  it('renders badge content', () => {
    render(<Badge>Critical</Badge>);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders key/value pairs in order', () => {
    render(
      <KeyValue
        items={[
          { label: 'Algorithm', value: 'Random Forest' },
          { label: 'Target', value: 'label' },
        ]}
      />,
    );
    expect(screen.getByText('Algorithm')).toBeInTheDocument();
    expect(screen.getByText('Random Forest')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('label')).toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('marks the active tab and reports selection changes', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        tabs={[
          { id: 'all', label: 'All', count: 12 },
          { id: 'open', label: 'Open' },
        ]}
        active="all"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /All/ })).toHaveTextContent('(12)');
    expect(screen.getByRole('tab', { name: 'Open' })).toHaveAttribute('aria-selected', 'false');

    await userEvent.click(screen.getByRole('tab', { name: 'Open' }));
    expect(onChange).toHaveBeenCalledWith('open');
  });
});

describe('Pagination', () => {
  it('describes the visible window', () => {
    render(<Pagination page={2} totalPages={5} total={120} pageSize={25} onPageChange={() => {}} />);
    expect(screen.getByText('Showing 26–50 of 120')).toBeInTheDocument();
  });

  it('reports the new page when navigating', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} total={120} pageSize={25} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByRole('button', { name: 'Prev' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('disables navigation at the boundaries', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} total={60} pageSize={25} onPageChange={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    rerender(<Pagination page={3} totalPages={3} total={60} pageSize={25} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Prev' })).toBeEnabled();
  });

  it('reports page-size changes', async () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={1}
        totalPages={3}
        total={120}
        pageSize={25}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox'), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('shows 0–0 for an empty result set', () => {
    render(<Pagination page={1} totalPages={0} total={0} pageSize={25} onPageChange={() => {}} />);
    expect(screen.getByText('Showing 0–0 of 0')).toBeInTheDocument();
  });
});
