import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [identifier, setIdentifier] = useState('madhurichowdary2007@gmail.com');
  const [password, setPassword] = useState('NetShield@Admin123');
  const [fullName, setFullName] = useState('Madhuri Chowdary');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAutoFill = () => {
    setIdentifier('madhurichowdary2007@gmail.com');
    setPassword('NetShield@Admin123');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    const cleanPwd = password.trim();

    if (!cleanId || !cleanPwd) {
      setError('Please provide your email/username and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'signin') {
        await login(cleanId, cleanPwd);
      } else {
        await register(cleanId, cleanPwd, fullName.trim() || undefined);
        setSuccessMsg('Account configured successfully! Redirecting...');
      }
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={26} style={{ color: 'var(--brand-blue)' }} />
            </div>
          </div>
          <div className="login-logo-text">
            NET<span>SHIELD</span> AI
          </div>
          <div className="login-logo-sub">AI-POWERED NETWORK ANOMALY DETECTION</div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
          padding: 4,
          marginBottom: 18,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: mode === 'signin' ? 'var(--brand-blue)' : 'transparent',
              color: mode === 'signin' ? '#ffffff' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: mode === 'register' ? 'var(--brand-blue)' : 'transparent',
              color: mode === 'register' ? '#ffffff' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <UserPlus size={14} />
            Set Password / Register
          </button>
        </div>

        {/* Single Admin Profile Banner */}
        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 18,
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--brand-blue)' }}>Primary Admin Profile</span>
            <button
              type="button"
              onClick={handleAutoFill}
              style={{
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.3)',
                color: '#60a5fa',
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Auto Fill
            </button>
          </div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>madhurichowdary2007@gmail.com</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
            Default Password: <span style={{ color: 'var(--text-secondary)' }}>NetShield@Admin123</span>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div style={{
            background: 'var(--severity-critical-bg)',
            border: '1px solid var(--severity-critical-border)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--severity-critical)',
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#34d399',
          }}>
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="login-fullname"
                className="form-input"
                type="text"
                placeholder="Madhuri Chowdary"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{mode === 'signin' ? 'Email or Username' : 'Email Address'}</label>
            <input
              id="login-username"
              className="form-input"
              type={mode === 'register' ? 'email' : 'text'}
              placeholder="madhurichowdary2007@gmail.com"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{mode === 'signin' ? 'Password' : 'New Password'}</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className="form-input"
                type={showPwd ? 'text' : 'password'}
                placeholder={mode === 'signin' ? 'Enter password' : 'Create secure password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px 0' }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                {mode === 'signin' ? 'Authenticating...' : 'Saving & Logging In...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Set Password & Enter Dashboard'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--text-disabled)' }}>
          NETSHIELD AI — Single Secured Administrator Profile
        </div>
      </div>
    </div>
  );
}
