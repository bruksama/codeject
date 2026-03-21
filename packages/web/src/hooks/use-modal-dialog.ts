'use client';

import { useEffect, useRef } from 'react';

interface UseModalDialogOptions {
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalDialog<T extends HTMLElement>({ onClose }: UseModalDialogOptions) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<T | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusHandle = window.requestAnimationFrame(() => {
      const fallbackTarget = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (initialFocusRef.current ?? fallbackTarget ?? dialog).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (activeElement === firstFocusableElement || activeElement === dialog) {
          event.preventDefault();
          lastFocusableElement.focus();
        }
        return;
      }

      if (activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusHandle);
      dialog.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose]);

  return { dialogRef, initialFocusRef };
}
