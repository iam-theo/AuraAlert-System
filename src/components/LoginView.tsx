import React, { useState } from 'react';
import { Lock, Mail, BellRing, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { email: string; role: string }) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('TheoDesmon71@gmail.com');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLoginSuccess(data.accessToken, data.user);
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError('Connection to server failed. Ensure the server is online.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <BellRing className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AuraAlert</h1>
          <p className="text-slate-400 text-sm mt-2">Enterprise Notification Orchestration Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <h2 className="text-xl font-bold text-white mb-6">Establish Platform Session</h2>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-sans">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-2">Account Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="admin@auraalert.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-2">Access Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Establish Auth Session
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Seeded Demo Accounts */}
          <div className="mt-6 border-t border-slate-800/80 pt-5 space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demo Accounts Registry</span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => { setEmail('TheoDesmon71@gmail.com'); setPassword('admin'); }}
                className="text-left bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-lg p-2 transition-all cursor-pointer text-[11px]"
              >
                <div className="flex justify-between font-semibold text-slate-200">
                  <span>Administrator (Full Control)</span>
                  <span className="text-[9px] text-indigo-400 font-mono">ADMIN</span>
                </div>
                <div className="text-slate-500 mt-0.5 font-mono">TheoDesmon71@gmail.com / admin</div>
              </button>
              
              <button
                type="button"
                onClick={() => { setEmail('operator@auraalert.com'); setPassword('operator'); }}
                className="text-left bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-lg p-2 transition-all cursor-pointer text-[11px]"
              >
                <div className="flex justify-between font-semibold text-slate-200">
                  <span>Operator (Config Adapters)</span>
                  <span className="text-[9px] text-emerald-400 font-mono">OPERATOR</span>
                </div>
                <div className="text-slate-500 mt-0.5 font-mono">operator@auraalert.com / operator</div>
              </button>

              <button
                type="button"
                onClick={() => { setEmail('viewer@auraalert.com'); setPassword('viewer'); }}
                className="text-left bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/60 rounded-lg p-2 transition-all cursor-pointer text-[11px]"
              >
                <div className="flex justify-between font-semibold text-slate-200">
                  <span>Viewer (Read Only)</span>
                  <span className="text-[9px] text-slate-400 font-mono">VIEWER</span>
                </div>
                <div className="text-slate-500 mt-0.5 font-mono">viewer@auraalert.com / viewer</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="text-center mt-6 text-slate-600 text-xs font-mono">
          SYSTEM_PORT: 3000 // CORE_STATE: ONLINE
        </div>
      </div>
    </div>
  );
}
