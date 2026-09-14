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
    <div className="flex flex-col items-start gap-1 md:items-end">
      {user ? (
        <div className="flex items-center gap-1.5">
          <span className="hidden max-w-36 truncate text-[10px] font-bold text-[#4b5563] lg:inline">{user.email}</span>
          <button type="button" onClick={() => void signOut()} className="btn-3d-neutral inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-[#0a0a0a] md:min-h-9 md:py-1" aria-label="Sign out">
            <LogOut size={12} aria-hidden="true" /> Sign out
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void handleSignIn()} className="btn-3d-black inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-white md:min-h-9 md:py-1" aria-label="Sign in with Google">
          <LogIn size={12} className="text-[#ff5500]" aria-hidden="true" /> Sign in
        </button>
      )}
      {error && <p role="alert" className="max-w-52 text-right text-[10px] font-bold text-[#991b1b]">{error}</p>}
    </div>
  );
}
