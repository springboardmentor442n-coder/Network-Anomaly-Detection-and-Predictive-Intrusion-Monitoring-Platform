import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart, ChartLegend, ConfusionMatrix, DonutChart, Heatmap, MetricBar } from '@/components/charts/charts';

describe('BarChart', () => {
  it('sorts categories by count, highest first', () => {
    render(
      <BarChart
        data={[
          { name: 'Fuzzers', value: 5 },
          { name: 'DoS', value: 40 },
          { name: 'Normal', value: 20 },
        ]}
      />,
    );

    const labels = screen.getAllByTitle(/DoS|Normal|Fuzzers/).map((node) => node.textContent);
    expect(labels).toEqual(['DoS', 'Normal', 'Fuzzers']);
  });

  it('shows an empty label when there is nothing to plot', () => {
    render(<BarChart data={[]} emptyLabel="No attack categories" />);
    expect(screen.getByText('No attack categories')).toBeInTheDocument();
  });

  it('never renders more than 16 bars', () => {
    const data = Array.from({ length: 40 }, (_, index) => ({ name: `cat-${index}`, value: index + 1 }));
    render(<BarChart data={data} />);
    expect(screen.getAllByTitle(/cat-/)).toHaveLength(16);
  });
});

describe('DonutChart', () => {
  const circumference = 2 * Math.PI * ((168 - 22) / 2);

  it('draws one arc per non-empty category and offsets them cumulatively', () => {
    const { container } = render(
      <DonutChart
        data={[
          { name: 'Normal', value: 75 },
          { name: 'Attack', value: 25 },
        ]}
      />,
    );

    const arcs = container.querySelectorAll('circle[stroke]');
    expect(arcs).toHaveLength(2);
    // The first arc starts at 0; the second starts after the first arc's length.
    expect(arcs[0].getAttribute('stroke-dashoffset')).toBe('0');
    expect(Number(arcs[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(-0.75 * circumference, 5);
  });

  it('lists each category with its share', () => {
    render(
      <DonutChart
        data={[
          { name: 'Normal', value: 75 },
          { name: 'Attack', value: 25 },
        ]}
      />,
    );
    expect(screen.getByText(/75\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
  });

  it('ignores zero-count categories and renders a placeholder when empty', () => {
    const { rerender, container } = render(
      <DonutChart
        data={[
          { name: 'Normal', value: 0 },
          { name: 'Attack', value: 0 },
        ]}
      />,
    );
    expect(screen.getByText('No data')).toBeInTheDocument();

    rerender(<DonutChart data={[{ name: 'Normal', value: 10 }]} />);
    expect(container.querySelectorAll('circle[stroke]')).toHaveLength(1);
  });
});

describe('Heatmap', () => {
  it('renders a cell per column pair and shows an em dash for missing correlations', () => {
    render(
      <Heatmap
        columns={['dur', 'sbytes']}
        matrix={[
          [1, null],
          [null, 1],
        ]}
      />,
    );
    expect(screen.getAllByText('dur').length).toBeGreaterThan(0);
    expect(screen.getAllByText('sbytes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getAllByText('1.00')).toHaveLength(2);
  });

  it('renders an empty state for a dataset with no numeric columns', () => {
    render(<Heatmap columns={[]} matrix={[]} />);
    expect(screen.getByText(/Not enough numeric features/i)).toBeInTheDocument();
  });
});

describe('ConfusionMatrix', () => {
  it('shows the raw counts and their share of the total', () => {
    render(
      <ConfusionMatrix
        labels={['0', '1']}
        displayLabels={['Normal', 'Attack']}
        matrix={[
          [40, 10],
          [5, 45],
        ]}
      />,
    );

    // 'Normal' appears once as the predicted column and once as the actual row.
    expect(screen.getAllByText('Normal')).toHaveLength(2);
    expect(screen.getAllByText('Attack')).toHaveLength(2);
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('explains what diagonal and off-diagonal cells mean', () => {
    render(<ConfusionMatrix labels={['0', '1']} matrix={[[1, 0], [0, 1]]} />);
    expect(screen.getByText(/off-diagonal cells are errors/i)).toBeInTheDocument();
  });

  it('renders an empty state before any evaluation has run', () => {
    render(<ConfusionMatrix labels={[]} matrix={[]} />);
    expect(screen.getByText('No evaluation data available.')).toBeInTheDocument();
  });
});

describe('MetricBar', () => {
  it('renders a measured value as a percentage', () => {
    render(<MetricBar label="Accuracy" value={0.9235} />);
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('92.3%')).toBeInTheDocument();
  });

  it('renders an undefined metric as undefined rather than zero', () => {
    // A metric that cannot be computed must never look like a measured 0%.
    render(<MetricBar label="False positive rate" value={null} hint="Undefined for one class" />);
    expect(screen.getByText('undefined')).toBeInTheDocument();
    expect(screen.getByText('Undefined for one class')).toBeInTheDocument();
  });
});

describe('ChartLegend', () => {
  it('renders a legend entry per item', () => {
    render(
      <ChartLegend
        items={[
          { label: 'Critical', color: '#F43F5E', value: '12' },
          { label: 'Low', color: '#22C55E', value: '340' },
        ]}
      />,
    );
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('340')).toBeInTheDocument();
  });
});
