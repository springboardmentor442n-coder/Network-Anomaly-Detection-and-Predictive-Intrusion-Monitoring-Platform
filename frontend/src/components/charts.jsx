/**
 * Chart wrappers.
 *
 * Every chart renders backend-supplied data only. When a series is empty the
 * component says so rather than drawing a placeholder curve.
 */

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { Empty } from './ui'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
)

const GRID = 'rgba(132, 150, 165, 0.14)'
const TICK = '#8496a5'

export const PALETTE = {
  accent: '#19b47e',
  low: '#5b8def',
  medium: '#d9a23b',
  high: '#e3733f',
  critical: '#d6483f',
  neutral: '#6b7f8f',
}

const CATEGORICAL = [
  '#19b47e',
  '#5b8def',
  '#d9a23b',
  '#e3733f',
  '#d6483f',
  '#8b6cc1',
  '#2fa7b8',
  '#b3ad4f',
  '#c2668f',
  '#6b7f8f',
  '#4f9d7a',
  '#8a94a6',
]

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f1720',
      borderColor: '#24323f',
      borderWidth: 1,
      titleColor: '#e2e8ee',
      bodyColor: '#c6d0d9',
      padding: 10,
    },
  },
  scales: {
    x: { grid: { color: GRID, drawBorder: false }, ticks: { color: TICK, font: { size: 10 } } },
    y: {
      beginAtZero: true,
      grid: { color: GRID, drawBorder: false },
      ticks: { color: TICK, font: { size: 10 }, precision: 0 },
    },
  },
}

export function BarChart({ labels, values, color = PALETTE.accent, horizontal = false, height = 260 }) {
  if (!labels?.length) return <Empty>No data returned for this period.</Empty>
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: [
            { data: values, backgroundColor: color, borderRadius: 3, maxBarThickness: 26 },
          ],
        }}
        options={{ ...baseOptions, indexAxis: horizontal ? 'y' : 'x' }}
      />
    </div>
  )
}

export function StackedSeverityChart({ trends, height = 280 }) {
  if (!trends?.length) {
    return (
      <Empty>
        No detections recorded in this window yet. Run a monitoring scan to populate trends.
      </Empty>
    )
  }
  const labels = trends.map((point) =>
    new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  )
  const series = [
    { key: 'LOW', color: PALETTE.low },
    { key: 'MEDIUM', color: PALETTE.medium },
    { key: 'HIGH', color: PALETTE.high },
    { key: 'CRITICAL', color: PALETTE.critical },
  ]
  return (
    <div style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: series.map(({ key, color }) => ({
            label: key,
            data: trends.map((point) => point[key] || 0),
            backgroundColor: color,
            stack: 'severity',
            borderRadius: 2,
          })),
        }}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: { display: true, labels: { color: TICK, boxWidth: 10, font: { size: 10 } } },
          },
          scales: {
            ...baseOptions.scales,
            x: { ...baseOptions.scales.x, stacked: true },
            y: { ...baseOptions.scales.y, stacked: true },
          },
        }}
      />
    </div>
  )
}

export function AnomalyTrendChart({ trends, height = 240 }) {
  if (!trends?.length) return <Empty>No detections recorded in this window yet.</Empty>
  const labels = trends.map((point) =>
    new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  )
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Total',
              data: trends.map((point) => point.total || 0),
              borderColor: PALETTE.low,
              backgroundColor: 'rgba(91, 141, 239, 0.12)',
              fill: true,
              tension: 0.3,
              pointRadius: 2,
            },
            {
              label: 'Anomalies',
              data: trends.map((point) => point.anomalies || 0),
              borderColor: PALETTE.high,
              backgroundColor: 'rgba(227, 115, 63, 0.12)',
              fill: true,
              tension: 0.3,
              pointRadius: 2,
            },
          ],
        }}
        options={{
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: { display: true, labels: { color: TICK, boxWidth: 10, font: { size: 10 } } },
          },
        }}
      />
    </div>
  )
}

export function DonutChart({ labels, values, colors, height = 240 }) {
  const total = (values || []).reduce((sum, value) => sum + (value || 0), 0)
  if (!labels?.length || total === 0) return <Empty>No data to chart.</Empty>
  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors || CATEGORICAL.slice(0, labels.length),
              borderColor: '#151f2b',
              borderWidth: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '58%',
          plugins: {
            legend: {
              display: true,
              position: 'right',
              labels: { color: TICK, boxWidth: 10, font: { size: 10 } },
            },
            tooltip: baseOptions.plugins.tooltip,
          },
        }}
      />
    </div>
  )
}

export function severityColors(labels) {
  const map = {
    LOW: PALETTE.low,
    MEDIUM: PALETTE.medium,
    HIGH: PALETTE.high,
    CRITICAL: PALETTE.critical,
  }
  return labels.map((label) => map[String(label).toUpperCase()] || PALETTE.neutral)
}
