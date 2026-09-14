'use client';

import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function AuthActions() {
  const { user, isLoading, isConfigured, signInWithGoogle, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    const message = await signInWithGoogle(`${window.location.pathname}${window.location.search}`);
    if (message) setError(message);
  };

  if (isLoading) return null;
  if (!isConfigured) return null;

  return (
    <div className="flex w-full flex-col items-start gap-1 md:w-auto md:items-end">
      {user ? (
        <div className="flex w-full items-center gap-1.5 md:w-auto">
          <span className="hidden max-w-36 truncate text-[10px] font-bold text-[#4b5563] lg:inline">{user.email}</span>
          <button type="button" onClick={() => void signOut()} className="btn-3d-black inline-flex min-h-11 w-full items-center justify-start gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-white md:min-h-9 md:w-auto md:py-1 md:text-[#0a0a0a] md:border-[#d9dbe1] md:[background:linear-gradient(180deg,_#ffffff_0%,_#f0f1f5_100%)] md:[box-shadow:var(--shadow-btn-neutral)] md:[transition:transform_0.12s_var(--ease-spring),_box-shadow_0.12s_ease,_background-color_0.12s_ease,_border-color_0.12s_ease] md:hover:border-[#b8bbc3] md:hover:[background:linear-gradient(180deg,_#ffffff_0%,_#f7f8fa_100%)] md:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.72),_0_1px_0_#bfc2c9,_0_3px_6px_rgba(0,0,0,0.05)] md:active:border-[#b8bbc3] md:active:[background:#e8e9ee] md:active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08),_0_0.5px_0_#bfc2c9]" aria-label="Sign out">
            <LogOut size={12} className="text-[#ff5500] md:text-current" aria-hidden="true" /> Sign out
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void handleSignIn()} className="btn-3d-black inline-flex min-h-11 w-full items-center justify-start gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-white md:min-h-9 md:w-auto md:py-1" aria-label="Sign in with Google">
          <LogIn size={12} className="text-[#ff5500]" aria-hidden="true" /> Sign in
        </button>
      )}
      {error && <p role="alert" className="max-w-52 text-right text-[10px] font-bold text-[#991b1b]">{error}</p>}
    </div>
  );
}
