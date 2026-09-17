import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Button, ErrorNotice, Field, Input, InfoNotice } from '../components/ui'

export default function Login() {
  const { login, register, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-accent text-base font-bold text-ink">
            N
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              NetShield <span className="text-accent">AI</span>
            </h1>
            <p className="text-xs text-muted">
              Network anomaly detection &amp; intrusion monitoring
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-edge bg-panel p-6">
          <div className="mb-5 flex gap-1 rounded border border-edge p-1">
            {['login', 'register'].map((value) => (
              <button
                key={value}
                onClick={() => {
                  setMode(value)
                  setError(null)
                }}
                className={`flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition ${
                  mode === value ? 'bg-accent/15 text-accent' : 'text-muted hover:text-slate-200'
                }`}
              >
                {value === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="analyst@example.com"
              />
            </Field>
            <Field
              label="Password"
              hint={
                mode === 'register'
                  ? 'At least 8 characters, including a letter and a digit.'
                  : undefined
              }
            >
              <Input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <ErrorNotice error={error} onDismiss={() => setError(null)} />

            <Button type="submit" disabled={busy || loading} className="w-full py-2">
              {busy ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create analyst account'}
            </Button>
          </form>

          {mode === 'register' && (
            <div className="mt-4">
              <InfoNotice>
                New accounts receive the <strong>analyst</strong> role. Administrator access
                is granted by an existing admin or directly in the database - never at
                registration.
              </InfoNotice>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Analytics are computed from the local CICIDS2017 corpus. Live packet capture is
          optional and off by default.
        </p>
      </div>
    </div>
  )
}
