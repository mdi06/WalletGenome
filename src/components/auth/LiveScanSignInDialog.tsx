'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck, WalletCards, X } from 'lucide-react';
import Image from 'next/image';
import AppDialog from '@/components/AppDialog';
import { useAuth } from './AuthProvider';
import type { DiscoveredEthereumWallet, EthereumAuthPhase } from '@/lib/auth/ethereumWallet';

type WalletUiState =
  | 'idle'
  | 'discovering'
  | 'selecting'
  | 'connection_pending'
  | 'signature_pending'
  | 'verifying'
  | 'success'
  | 'no_wallet'
  | 'connection_rejected'
  | 'signature_rejected'
  | 'verification_failed'
  | 'wallet_error';

interface LiveScanSignInDialogProps {
  open: boolean;
  isStarting: boolean;
  error: string | null;
  onContinue: () => void;
  onWalletAuthenticated?: () => void;
  onClose: () => void;
  returnFocusRef: React.RefObject<HTMLElement | null>;
  returnFocusFallbackRef?: React.RefObject<HTMLElement | null>;
}

const WALLET_STATUS_COPY: Partial<Record<WalletUiState, string>> = {
  discovering: 'Discovering injected Ethereum wallets…',
  selecting: 'Choose the wallet you want to use for this sign-in.',
  connection_pending: 'Connection request pending. Approve the connection in your wallet.',
  signature_pending: 'Signature pending. Approve the WalletGenome sign-in message in your wallet.',
  verifying: 'Verifying the signed message with Supabase…',
  success: 'Wallet authenticated.',
  no_wallet: 'No compatible injected Ethereum wallet was found in this browser.',
  connection_rejected: 'Connection rejected. No signature was requested.',
  signature_rejected: 'Signature rejected. No transaction or chain change was requested.',
  verification_failed: 'Supabase could not verify this wallet sign-in.',
  wallet_error: 'The wallet could not complete sign-in. Please try again.',
};

const BUSY_WALLET_STATES = new Set<WalletUiState>([
  'discovering',
  'connection_pending',
  'signature_pending',
  'verifying',
  'success',
]);

function isWalletStatusError(status: WalletUiState): boolean {
  return status === 'no_wallet'
    || status === 'connection_rejected'
    || status === 'signature_rejected'
    || status === 'verification_failed'
    || status === 'wallet_error';
}

function safeWalletIcon(icon: string): string | null {
  return icon.startsWith('data:') ? icon : null;
}

export default function LiveScanSignInDialog({
  open,
  isStarting,
  error,
  onContinue,
  onWalletAuthenticated = () => {},
  onClose,
  returnFocusRef,
  returnFocusFallbackRef,
}: LiveScanSignInDialogProps) {
  const { discoverEthereumWallets, signInWithEthereum } = useAuth();
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const successTimerRef = useRef<number | null>(null);
  const [wallets, setWallets] = useState<DiscoveredEthereumWallet[]>([]);
  const [walletState, setWalletState] = useState<WalletUiState>('idle');
  const [walletError, setWalletError] = useState<string | null>(null);

  const walletUiState = open && walletState === 'idle' && wallets.length === 0 ? 'discovering' : walletState;
  const walletBusy = BUSY_WALLET_STATES.has(walletUiState);
  const isBusy = isStarting || walletBusy;

  const resetWalletUi = useCallback(() => {
    setWallets([]);
    setWalletState('idle');
    setWalletError(null);
  }, []);

  useEffect(() => {
    if (open || successTimerRef.current === null) return;
    window.clearTimeout(successTimerRef.current);
    successTimerRef.current = null;
  }, [open]);

  useEffect(() => {
    if (walletState !== 'success') return;
    successTimerRef.current = window.setTimeout(() => {
      resetWalletUi();
      onWalletAuthenticated();
    }, 220);
    return () => {
      if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    };
  }, [onWalletAuthenticated, resetWalletUi, walletState]);

  const setWalletPhase = useCallback((phase: EthereumAuthPhase) => {
    setWalletState(phase);
  }, []);

  const signInWithWallet = useCallback(async (wallet: DiscoveredEthereumWallet) => {
    if (isBusy) return;
    setWalletError(null);
    setWalletState('connection_pending');
    const result = await signInWithEthereum(wallet, setWalletPhase);
    if (result.ok) return;
    setWalletState(result.error.code === 'wallet_unavailable' ? 'wallet_error' : result.error.code);
    setWalletError(result.error.message);
  }, [isBusy, setWalletPhase, signInWithEthereum]);

  const applyWalletDiscovery = useCallback((result: Awaited<ReturnType<typeof discoverEthereumWallets>>) => {
    setWallets(result.wallets);
    setWalletState(result.wallets.length === 0 ? 'no_wallet' : 'selecting');
  }, []);

  const discoverWallets = useCallback(async () => {
    if (isBusy) return;
    setWalletError(null);
    setWalletState('discovering');
    const result = await discoverEthereumWallets();
    applyWalletDiscovery(result);
  }, [applyWalletDiscovery, discoverEthereumWallets, isBusy]);

  const handleClose = useCallback(() => {
    if (isBusy) return;
    resetWalletUi();
    onClose();
  }, [isBusy, onClose, resetWalletUi]);

  const handleGoogleContinue = useCallback(() => {
    resetWalletUi();
    onContinue();
  }, [onContinue, resetWalletUi]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void discoverEthereumWallets().then(result => {
      if (active) applyWalletDiscovery(result);
    });
    return () => {
      active = false;
    };
  }, [applyWalletDiscovery, discoverEthereumWallets, open]);

  const handleWalletAction = useCallback(() => {
    if (isBusy) return;
    if (walletState === 'selecting' && wallets.length === 1) {
      void signInWithWallet(wallets[0]);
      return;
    }
    void discoverWallets();
  }, [discoverWallets, isBusy, signInWithWallet, walletState, wallets]);

  const walletStatus = WALLET_STATUS_COPY[walletUiState];
  const statusIsError = isWalletStatusError(walletUiState);

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      titleId="live-scan-sign-in-title"
      descriptionId="live-scan-sign-in-description"
      initialFocusRef={continueButtonRef}
      returnFocusRef={returnFocusRef}
      returnFocusFallbackRef={returnFocusFallbackRef}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-ink">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Authentication</span>
            </div>
            <h2 id="live-scan-sign-in-title" className="text-xl font-black leading-tight text-[#0a0a0a]">
              Sign in to WalletGenome
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            aria-label="Close sign-in dialog"
            className="btn-3d-neutral inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <p id="live-scan-sign-in-description" className="text-sm font-medium leading-relaxed text-[#4b5563]">
          Choose Google or an injected Ethereum wallet. Your current page and scanner inputs stay preserved.
        </p>

        {error && (
          <div id="live-scan-sign-in-error" role="alert" className="flex items-start gap-2 border-l-4 border-l-[#ef4444] bg-[#fff1f2] p-3 text-xs font-bold leading-relaxed text-[#991b1b]">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {walletStatus && (
          <div
            role={statusIsError ? 'alert' : 'status'}
            aria-live={statusIsError ? 'assertive' : 'polite'}
            className={`flex items-start gap-2 border-l-4 p-3 text-xs font-bold leading-relaxed ${statusIsError ? 'border-l-[#ef4444] bg-[#fff1f2] text-[#991b1b]' : 'border-l-[#ff5500] bg-[#fff7f2] text-[#6b341b]'}`}
          >
            {walletBusy ? <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" /> : <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
            <span>{walletError ?? walletStatus}</span>
          </div>
        )}

        {walletUiState === 'selecting' && (
          <div className="space-y-2" aria-label="Available Ethereum wallets">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4b5563]">{wallets.length === 1 ? 'Wallet available' : 'Choose a wallet'}</p>
            <div className="grid gap-2">
              {wallets.map(wallet => {
                const icon = safeWalletIcon(wallet.info.icon);
                return (
                  <button
                    key={wallet.info.uuid}
                    type="button"
                    onClick={() => void signInWithWallet(wallet)}
                    className="btn-3d-neutral inline-flex min-h-12 items-center gap-3 px-3 py-2 text-left text-xs font-black text-[#0a0a0a]"
                  >
                    {icon ? <Image src={icon} alt="" width={28} height={28} unoptimized className="h-7 w-7 shrink-0 object-contain" /> : <WalletCards size={19} className="shrink-0 text-orange-ink" aria-hidden="true" />}
                    <span className="min-w-0 truncate">{wallet.info.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            ref={continueButtonRef}
            type="button"
            onClick={handleGoogleContinue}
            disabled={isBusy}
            aria-busy={isStarting}
            aria-describedby={error ? 'live-scan-sign-in-error' : undefined}
            className="btn-3d-orange inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-60"
          >
            {isStarting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
            <span>{isStarting ? 'Starting Google sign-in…' : 'Continue with Google'}</span>
          </button>
          <button
            type="button"
            onClick={handleWalletAction}
            disabled={isBusy}
            aria-busy={walletUiState === 'discovering'}
            className="btn-3d-black inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white disabled:cursor-wait disabled:opacity-60"
          >
            {walletUiState === 'discovering' ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <WalletCards size={14} aria-hidden="true" />}
            <span>{walletUiState === 'selecting' && wallets.length !== 1 ? 'Discover wallets again' : 'Sign in with wallet'}</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="btn-3d-neutral inline-flex min-h-11 w-full items-center justify-center px-4 py-2 text-xs font-black text-[#0a0a0a] disabled:cursor-wait disabled:opacity-60"
          >
            Cancel
          </button>
        </div>

        <p className="border-t border-[#e2e2e6] pt-3 text-[11px] font-bold leading-relaxed text-[#6b7280]">
          Wallet authentication signs a login message only. It does not create a transaction, cost gas or grant access to funds.
        </p>
      </div>
    </AppDialog>
  );
}
