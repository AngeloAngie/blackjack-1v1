import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FinalSettlement, HandValue, RoundHistoryEntry } from "@blackjack/shared";
import { MiniCard } from "./MiniCard";

function formatEuro(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}€${(Math.abs(cents) / 100).toFixed(2)}`;
}

function valueLabel(value: HandValue): string {
  if (value.isBlackjack) return "Blackjack";
  if (value.isBust) return `Bust (${value.total})`;
  return value.soft ? `${value.total} (soft)` : `${value.total}`;
}

interface RoundRowProps {
  round: RoundHistoryEntry;
  players: FinalSettlement["players"];
  expanded: boolean;
  onToggle: () => void;
}

function RoundRow({ round, players, expanded, onToggle }: RoundRowProps) {
  const [p1, p2] = players;
  const winnerName = round.winnerId === null ? "Push" : players.find((p) => p.id === round.winnerId)?.name ?? "-";

  return (
    <div className="border-t border-[var(--gold-400)]/10 first:border-t-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 py-2 px-2 text-xs text-left hover:bg-[var(--gold-400)]/5 transition"
      >
        <span className="text-[var(--cream-100)]/70 w-10 shrink-0">#{round.roundNumber}</span>
        <span className="flex-1 text-[var(--gold-300)]/80">
          {formatEuro(round.bet)}
          {round.multiplier === 2 ? " ×2" : ""}
        </span>
        <span
          className={`font-semibold ${round.winnerId === null ? "text-[var(--gold-300)]" : "text-[var(--success-400)]"}`}
        >
          {winnerName}
        </span>
        <span className="text-[var(--cream-100)]/40 w-4 text-center">{expanded ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3 pt-1 flex flex-col gap-2">
              {[
                { player: p1, hand: round.playerAHand, value: round.playerAValue, doubled: round.playerADoubled },
                { player: p2, hand: round.playerBHand, value: round.playerBValue, doubled: round.playerBDoubled },
              ].map(({ player, hand, value, doubled }) =>
                player ? (
                  <div
                    key={player.id}
                    className={`flex flex-wrap items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${
                      round.winnerId === player.id ? "bg-[var(--success-400)]/10" : "bg-black/10"
                    }`}
                  >
                    <span className="font-semibold text-[var(--cream-100)] w-16 shrink-0 truncate">
                      {player.name}
                      {doubled ? " (×2)" : ""}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {hand.map((card, i) => (
                        <MiniCard key={i} card={card} />
                      ))}
                    </div>
                    <span
                      className={`ml-auto font-bold ${value.isBust ? "text-[var(--danger-400)]" : value.isBlackjack ? "text-[var(--gold-300)]" : "text-[var(--cream-100)]/80"}`}
                    >
                      {valueLabel(value)}
                    </span>
                  </div>
                ) : null,
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RoundHistoryListProps {
  settlement: FinalSettlement;
}

export function RoundHistoryList({ settlement }: RoundHistoryListProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(
    settlement.history.length > 0 ? settlement.history[settlement.history.length - 1].roundNumber : null,
  );

  if (settlement.history.length === 0) return null;

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--gold-400)]/20 mb-6">
      {[...settlement.history].reverse().map((round) => (
        <RoundRow
          key={round.roundNumber}
          round={round}
          players={settlement.players}
          expanded={expandedRound === round.roundNumber}
          onToggle={() => setExpandedRound(expandedRound === round.roundNumber ? null : round.roundNumber)}
        />
      ))}
    </div>
  );
}
