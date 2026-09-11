'use client';

import React, { useRef } from 'react';
import { AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';
import AppDialog from '@/components/AppDialog';

interface LiveScanSignInDialogProps {
  open: boolean;
  isStarting: boolean;
  error: string | null;
  onContinue: () => void;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

export default function LiveScanSignInDialog({
  open,
  isStarting,
  error,
  onContinue,
  onClose,
  returnFocusRef,
}: LiveScanSignInDialogProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      titleId="live-scan-sign-in-title"
      descriptionId="live-scan-sign-in-description"
      initialFocusRef={continueButtonRef}
      returnFocusRef={returnFocusRef}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Live scan access</span>
            </div>
            <h2 id="live-scan-sign-in-title" className="text-xl font-black leading-tight text-[#0a0a0a]">
              Sign in to run a live scan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            aria-label="Close sign-in dialog"
            className="btn-3d-neutral inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <p id="live-scan-sign-in-description" className="text-sm font-medium leading-relaxed text-[#4b5563]">
          Continue with Google to run this scan. Your wallet entry and selected networks will be preserved.
        </p>

        {error && (
          <div id="live-scan-sign-in-error" role="alert" className="flex items-start gap-2 border-l-4 border-l-[#ef4444] bg-[#fff1f2] p-3 text-xs font-bold leading-relaxed text-[#991b1b]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            ref={continueButtonRef}
            type="button"
            onClick={onContinue}
            disabled={isStarting}
            aria-busy={isStarting}
            aria-describedby={error ? 'live-scan-sign-in-error' : undefined}
            className="btn-3d-orange inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-4 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-60"
          >
            {isStarting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            <span>{isStarting ? 'Starting Google sign-in…' : 'Continue with Google'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="btn-3d-neutral inline-flex min-h-11 flex-1 items-center justify-center px-4 py-2 text-xs font-black text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
          >
            Cancel
          </button>
        </div>

        <p className="border-t border-[#e2e2e6] pt-3 text-[11px] font-bold leading-relaxed text-[#6b7280]">
          Signing in does not subscribe you to product updates.
        </p>
      </div>
    </AppDialog>
  );
}
