'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animated background orbs
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        setError(res.error.message || 'Failed to sign in');
        setIsLoading(false);
        return;
      }

      // If sign in is successful, the role should be available in res.data
      const role = (res.data?.user as any)?.role;
      
      if (role === 'admin' || role === 'super_admin' || role === 'superadmin') {
        router.push(callbackUrl);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated background orbs */}
      {mounted && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-cyan-600/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </>
      )}

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] p-8"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.4)] mb-4">
              <span className="text-white font-black text-2xl tracking-tight">D</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">DAERA</h1>
            <p className="text-white/40 text-sm mt-1 tracking-widest uppercase text-[10px]">
              Employment Agency
            </p>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-white">Welcome to Daera</h2>

          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-violet-500 transition-all shadow-[0_4px_24px_rgba(99,102,241,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-8">
            DAERA — Foreign Employment Agency System
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
