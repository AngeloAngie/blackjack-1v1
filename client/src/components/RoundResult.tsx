import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { PublicRoomState } from "@blackjack/shared";
import { useGameStore } from "../store/gameStore";
import { playLose, playPush, playWin } from "../lib/sounds";

interface RoundResultProps {
  roomState: PublicRoomState;
}

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

export function RoundResult({ roomState }: RoundResultProps) {
  const continueRound = useGameStore((s) => s.continueRound);
  const lastRound = roomState.history[roomState.history.length - 1];
  const playedSoundFor = useRef<number | null>(null);

  const me = roomState.players.find((p) => p.id === roomState.yourPlayerId);
  const amWinner = lastRound?.winnerId === roomState.yourPlayerId;
  const isPush = lastRound?.winnerId === null;

  useEffect(() => {
    if (!lastRound || playedSoundFor.current === lastRound.roundNumber) return;
    playedSoundFor.current = lastRound.roundNumber;
    if (isPush) playPush();
    else if (amWinner) playWin();
    else playLose();
  }, [lastRound, amWinner, isPush]);

  if (!lastRound || !me) return null;

  const transfer = lastRound.bet * lastRound.multiplier;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <div
        className={`text-2xl sm:text-3xl font-extrabold tracking-wide ${
          isPush ? "text-[var(--gold-300)]" : amWinner ? "text-[var(--success-400)]" : "text-[var(--danger-400)]"
        }`}
      >
        {isPush ? "Push - gelijkspel" : amWinner ? `Jij wint ${formatEuro(transfer)}!` : `Je verliest ${formatEuro(transfer)}`}
      </div>
      <button
        onClick={() => continueRound()}
        className="rounded-xl bg-[var(--gold-400)] text-[var(--felt-900)] font-bold px-6 py-3 shadow-lg hover:brightness-110 active:scale-95 transition"
      >
        Volgende ronde
      </button>
    </motion.div>
  );
}
