export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1720',
        panel: '#151f2b',
        edge: '#24323f',
        muted: '#8496a5',
        accent: '#19b47e',
        low: '#5b8def',
        medium: '#d9a23b',
        high: '#e3733f',
        critical: '#d6483f',
      },
      fontFamily: { mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'] },
    },
  },
  plugins: [],
}
