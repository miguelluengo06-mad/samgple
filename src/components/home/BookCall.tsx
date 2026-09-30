'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import BookCallForm from './BookCallForm';

const BookCallContext = createContext<{ open: (pack?: string) => void }>({ open: () => {} });

export function useBookCall() {
  return useContext(BookCallContext);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function BookCallModal({ businessName, pack, onClose }: { businessName: string; pack?: string; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEscapeKey(true, onClose);

  // Lock page scroll, move focus into the dialog, and give it back to the trigger on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  // Keep Tab inside the dialog.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="force-dark text-[#f2f2f0] fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6 bg-[#141b0a]/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-call-title"
        tabIndex={-1}
        onKeyDown={trapTab}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/15 bg-[#2f3a1a] p-6 sm:p-10 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-9 h-9 rounded-full border border-white/10 hover:border-white/40 text-white/60 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Hablemos</span>
        <h2 id="book-call-title" className="font-kinetic font-black uppercase text-3xl sm:text-4xl leading-none mt-3 mb-2">
          Agenda una llamada
        </h2>
        <p className="text-white/50 text-sm mb-8 max-w-md">
          Elige el hueco que mejor te venga y respóndenos unas preguntas rápidas para preparar la conversación.
        </p>
        <BookCallForm businessName={businessName} pack={pack} onClose={onClose} />
      </motion.div>
    </motion.div>
  );
}

/** Mount once per public page: every BookCallButton below it opens the same booking dialog. */
export function BookCallProvider({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [pack, setPack] = useState<string | undefined>(undefined);
  // open(pack) is called by "Quiero este pack" buttons; a plain open() (header, hero…) clears any previous pack
  const open = useCallback((selected?: string) => {
    setPack(typeof selected === 'string' ? selected : undefined);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <BookCallContext.Provider value={{ open }}>
      {children}
      <AnimatePresence>{isOpen && <BookCallModal key="book-call" businessName={businessName} pack={pack} onClose={close} />}</AnimatePresence>
    </BookCallContext.Provider>
  );
}

export function BookCallButton({ className, children, pack }: { className?: string; children: React.ReactNode; pack?: string }) {
  const { open } = useBookCall();
  return (
    <button type="button" onClick={() => open(pack)} className={className}>
      {children}
    </button>
  );
}
