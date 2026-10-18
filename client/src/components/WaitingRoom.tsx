import { useState } from "react";
import { motion } from "framer-motion";
import type { PublicRoomState } from "@blackjack/shared";

interface WaitingRoomProps {
  roomState: PublicRoomState;
}

export function WaitingRoom({ roomState }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname}?join=${roomState.code}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard kan geblokkeerd zijn - de link staat zichtbaar op het scherm.
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 felt-texture">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-[var(--gold-400)]/30 bg-[var(--felt-800)]/80 backdrop-blur p-8 text-center shadow-2xl"
      >
        <p className="text-sm uppercase tracking-wide text-[var(--gold-300)]/80 mb-2">Kamer aangemaakt</p>
        <div className="text-4xl font-mono font-bold tracking-[0.3em] text-[var(--gold-300)] mb-4">
          {roomState.code}
        </div>
        <p className="text-sm text-[var(--cream-100)]/70 mb-5">
          Deel deze code of link met je vriend om samen te spelen.
        </p>
        <button
          onClick={copyLink}
          className="w-full rounded-lg bg-[var(--gold-400)] text-[var(--felt-900)] font-bold py-2.5 hover:brightness-110 transition"
        >
          {copied ? "Link gekopieerd!" : "Deel-link kopiëren"}
        </button>
        <div className="mt-6 flex items-center justify-center gap-2 text-[var(--cream-100)]/80">
          <motion.span
            className="h-2.5 w-2.5 rounded-full bg-[var(--gold-400)]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          />
          <span className="text-sm">Wachten op je vriend...</span>
        </div>
      </motion.div>
    </div>
  );
}
