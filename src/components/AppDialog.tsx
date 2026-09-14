'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocusFallbackRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.getAttribute('aria-hidden') !== 'true');
}

export default function AppDialog({
  open,
  onClose,
  titleId,
  descriptionId,
  initialFocusRef,
  returnFocusRef,
  returnFocusFallbackRef,
  children,
}: AppDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const dialog = dialogRef.current;
    const appShell = document.querySelector<HTMLElement>('[data-app-shell]');
    const previousInert = appShell?.inert ?? false;
    const previousAriaHidden = appShell ? appShell.getAttribute('aria-hidden') : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusReturnTarget = returnFocusRef?.current;
    const focusFallbackTarget = returnFocusFallbackRef?.current;

    if (appShell) {
      appShell.inert = true;
      appShell.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';

    const focusInitialControl = () => {
      const target = initialFocusRef?.current ?? getFocusableElements(dialog ?? document.body)[0] ?? dialog;
      target?.focus();
    };
    const frame = window.requestAnimationFrame(focusInitialControl);

    return () => {
      window.cancelAnimationFrame(frame);
      if (appShell) {
        appShell.inert = previousInert;
        if (previousAriaHidden === null) appShell.removeAttribute('aria-hidden');
        else appShell.setAttribute('aria-hidden', previousAriaHidden);
      }
      document.body.style.overflow = previousBodyOverflow;
      const canRestoreFocus = (target: HTMLElement | null | undefined) => {
        if (!target || !document.contains(target)) return false;
        if (target.hasAttribute('disabled') || target.getAttribute('aria-hidden') === 'true') return false;
        return target.getClientRects().length > 0;
      };
      if (canRestoreFocus(focusReturnTarget)) focusReturnTarget?.focus();
      else if (canRestoreFocus(focusFallbackTarget)) focusFallbackTarget?.focus();
    };
  }, [initialFocusRef, open, returnFocusFallbackRef, returnFocusRef]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const content = (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[#0a0a0a]/60 motion-safe:transition-opacity motion-safe:duration-200"
        onMouseDown={event => {
          if (event.target === event.currentTarget) onClose();
        }}
        style={{ zIndex: 'var(--z-backdrop)' }}
      />
      <div
        className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
        style={{ zIndex: 'var(--z-dialog)', pointerEvents: 'none' }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="card-3d animate-fade-in-up w-full max-w-md max-h-[calc(100svh-2rem)] overflow-y-auto p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:max-h-[calc(100svh-3rem)] sm:p-6"
          style={{ pointerEvents: 'auto' }}
        >
          {children}
        </div>
      </div>
    </>
  );

  return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
