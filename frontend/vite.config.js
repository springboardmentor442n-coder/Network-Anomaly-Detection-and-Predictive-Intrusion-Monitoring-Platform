import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy target is read from frontend/.env (VITE_PROXY_TARGET) or the shell,
// so the backend can run on a non-default port without editing this file.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'

  const proxyOptions = {
    target,
    changeOrigin: true,
    // A failed proxy attempt would otherwise surface as an opaque 500. Return a
    // JSON body the frontend's API client can render as a useful message.
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        const message =
          `Cannot reach the NetShield backend at ${target} (${err.code || err.message}). ` +
          'Start it with "python -m backend", or set VITE_PROXY_TARGET in frontend/.env ' +
          'if it is running on another port.'
        console.error('\n[vite proxy] ' + message + '\n')
        if (res && !res.headersSent && res.writeHead) {
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: message, code: 'BACKEND_UNREACHABLE' }))
        }
      })
    },
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { ...proxyOptions, ws: true },
        '/health': proxyOptions,
      },
    },
    build: { outDir: 'dist', sourcemap: false },
  }
})
