import { AnimatePresence, motion } from "framer-motion";
import type { PublicRoomState } from "@blackjack/shared";
import { Hand } from "./Hand";
import { ActionBar } from "./ActionBar";
import { BettingPanel } from "./BettingPanel";
import { RoundResult } from "./RoundResult";
import { BalanceBar } from "./BalanceBar";
import { StopControls } from "./StopControls";
import { SoundToggle } from "./SoundToggle";

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

interface TableProps {
  roomState: PublicRoomState;
}

export function Table({ roomState }: TableProps) {
  const me = roomState.players.find((p) => p.id === roomState.yourPlayerId);
  const opponent = roomState.players.find((p) => p.id !== roomState.yourPlayerId);
  if (!me || !opponent) return null;

  const multiplier = roomState.players.some((p) => p.doubledDown) ? 2 : 1;
  const pot = roomState.agreedBet !== null ? roomState.agreedBet * 2 * multiplier : 0;
  const isPlaying = roomState.phase === "playing";

  return (
    <div className="relative min-h-screen felt-texture flex flex-col items-center px-4 py-6 pb-10">
      <SoundToggle />
      <StopControls roomState={roomState} />

      <BalanceBar roomState={roomState} />

      <div className="flex items-center gap-3 text-xs text-[var(--gold-300)]/70 mb-6">
        <span className="rounded-full border border-[var(--gold-400)]/30 px-3 py-1">
          Deck: {roomState.deckRemaining}/{roomState.deckTotal}
        </span>
        {roomState.agreedBet !== null && (
          <span className="rounded-full border border-[var(--gold-400)]/30 px-3 py-1">Pot: {formatEuro(pot)}</span>
        )}
        <span className="rounded-full border border-[var(--gold-400)]/30 px-3 py-1">Ronde {roomState.roundNumber}</span>
      </div>

      <AnimatePresence>
        {roomState.justReshuffled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 text-xs rounded-full bg-[var(--gold-400)]/20 border border-[var(--gold-400)]/50 text-[var(--gold-300)] px-3 py-1"
          >
            Deck opnieuw geschud
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full max-w-3xl flex flex-col items-center justify-center gap-10">
        <Hand player={opponent} isMe={false} isTurn={isPlaying && opponent.status === "playing"} />

        <div className="h-px w-2/3 bg-[var(--gold-400)]/20" />

        <Hand player={me} isMe={true} isTurn={isPlaying && me.status === "playing"} />
      </div>

      <div className="mt-6 min-h-[4rem] flex items-center justify-center w-full">
        {roomState.phase === "betting" && <BettingPanel roomState={roomState} />}
        {roomState.phase === "playing" && <ActionBar me={me} />}
        {roomState.phase === "round_end" && <RoundResult roomState={roomState} />}
      </div>
    </div>
  );
}
