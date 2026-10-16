import next from 'eslint-config-next';

const config = [
  ...next,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'backend/**',
      'data/**',
      'coverage/**',
    ],
  },
  {
    rules: {
      '@next/next/no-img-element': 'off',

      /*
       * `react-hooks/set-state-in-effect` (from the React Compiler ruleset) is
       * reported as an error by default. Every page in this app is an async
       * client view that loads its slice of the platform state from the
       * FastAPI backend when it mounts and whenever its inputs change:
       *
       *   const load = useCallback(async () => { ... }, [deps]);
       *   useEffect(() => { void load(); }, [load]);
       *
       * That is the documented "subscribe to an external system" use of an
       * effect, and this project does not enable the React Compiler
       * (see next.config.mjs), so the rule produces noise rather than a real
       * defect. It is kept as a warning so regressions stay visible without
       * failing `npm run lint`.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
