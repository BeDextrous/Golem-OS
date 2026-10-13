import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React 19 compiler-era rules flag long-standing patterns (mounted flags, localStorage
    // hydration, fetch-on-connect). Keep them visible as warnings until those are reworked.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/sw.js']),
])
