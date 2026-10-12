import React, { useState } from 'react';
import { Shield, Key, Mail, Lock, UserCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen = true, onClose }) => {
  const { login } = useSecurity();
  const [email, setEmail] = useState('s.connor@netshield.corp');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide valid credentials.');
      return;
    }

    setIsLoading(true);
    setError('');

    setTimeout(() => {
      login(selectedRole, email);
      setIsLoading(false);
      if (onClose) onClose();
    }, 500);
  };

  const handleQuickLogin = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(role === 'admin' ? 's.connor@netshield.corp' : 'a.vance@netshield.corp');
    setIsLoading(true);
    setTimeout(() => {
      login(role, role === 'admin' ? 's.connor@netshield.corp' : 'a.vance@netshield.corp');
      setIsLoading(false);
      if (onClose) onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#0c121e] border border-slate-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              NETSHIELD <span className="text-cyan-400 font-extrabold">AI</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">SOC Zero-Trust Authentication Gateway</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Work Email / Analyst Identifier
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="analyst@netshield.corp"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Access Token / Hardware Security Key
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Target Clearance Role (RBAC)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedRole('analyst')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-mono transition-all ${
                  selectedRole === 'analyst'
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Security Analyst</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-mono transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>SOC Administrator</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Verifying JWT & Multi-Factor...</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5" />
                <span>Authenticate Session</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Pre-sets */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            One-Click SOC Operator Identities:
          </p>
          <div className="space-y-1.5">
            <button
              onClick={() => handleQuickLogin('admin')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors text-left"
            >
              <div>
                <span className="font-semibold text-white">Sarah Connor</span>
                <span className="text-[11px] text-cyan-400 ml-1.5">(Admin / Tier-3 Lead)</span>
              </div>
              <span className="text-[10px] text-slate-500">Sign In &rarr;</span>
            </button>

            <button
              onClick={() => handleQuickLogin('analyst')}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors text-left"
            >
              <div>
                <span className="font-semibold text-white">Alex Vance</span>
                <span className="text-[11px] text-emerald-400 ml-1.5">(Analyst / Tier-1 Triage)</span>
              </div>
              <span className="text-[10px] text-slate-500">Sign In &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
