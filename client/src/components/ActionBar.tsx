import { motion } from "framer-motion";
import type { PublicPlayerInfo } from "@blackjack/shared";
import { useGameStore } from "../store/gameStore";
import { playHit } from "../lib/sounds";

interface ActionBarProps {
  me: PublicPlayerInfo;
}

export function ActionBar({ me }: ActionBarProps) {
  const hit = useGameStore((s) => s.hit);
  const stand = useGameStore((s) => s.stand);
  const doubleDown = useGameStore((s) => s.doubleDown);

  if (me.status !== "playing") return null;

  const canDouble = (me.hand?.length ?? 0) === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 justify-center"
    >
      <button
        onClick={() => {
          playHit();
          hit();
        }}
        className="rounded-xl bg-[var(--gold-400)] text-[var(--felt-900)] font-bold px-6 py-3 shadow-lg hover:brightness-110 active:scale-95 transition"
      >
        Hit
      </button>
      <button
        onClick={() => stand()}
        className="rounded-xl bg-[var(--felt-700)] border border-[var(--gold-400)]/50 text-[var(--gold-300)] font-bold px-6 py-3 shadow-lg hover:brightness-125 active:scale-95 transition"
      >
        Stand
      </button>
      {canDouble && (
        <button
          onClick={() => {
            playHit();
            doubleDown();
          }}
          className="rounded-xl bg-transparent border border-[var(--gold-400)]/50 text-[var(--gold-300)]/90 font-semibold px-5 py-3 shadow-lg hover:bg-[var(--gold-400)]/10 active:scale-95 transition"
        >
          Double Down
        </button>
      )}
    </motion.div>
  );
}
