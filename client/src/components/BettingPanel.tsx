import { useState } from "react";
import { motion } from "framer-motion";
import type { PublicRoomState } from "@blackjack/shared";
import { useGameStore } from "../store/gameStore";
import { playChip } from "../lib/sounds";

const QUICK_AMOUNTS_CENTS = [50, 100, 200, 500];

function formatEuro(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

interface BettingPanelProps {
  roomState: PublicRoomState;
}

export function BettingPanel({ roomState }: BettingPanelProps) {
  const proposeBet = useGameStore((s) => s.proposeBet);
  const respondBet = useGameStore((s) => s.respondBet);
  const [customAmount, setCustomAmount] = useState("");
  const [counterAmount, setCounterAmount] = useState("");

  const myId = roomState.yourPlayerId;
  const proposal = roomState.betProposal;
  const isMyProposal = proposal?.byPlayerId === myId;

  function submitAmount(amountCents: number) {
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    playChip();
    proposeBet(Math.round(amountCents));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm rounded-2xl border border-[var(--gold-400)]/30 bg-[var(--felt-800)]/90 backdrop-blur p-6 shadow-2xl"
    >
      <h2 className="text-center font-bold text-[var(--gold-300)] mb-4 uppercase text-sm tracking-wide">
        Inzet voor deze ronde
      </h2>

      {!proposal && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {QUICK_AMOUNTS_CENTS.map((amount) => (
              <button
                key={amount}
                onClick={() => submitAmount(amount)}
                className="chip-glow rounded-full bg-[var(--felt-700)] border border-[var(--gold-400)]/50 text-[var(--gold-300)] font-bold py-3 text-sm hover:brightness-125 transition"
              >
                {formatEuro(amount)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Eigen bedrag (bv. 1.50)"
              inputMode="decimal"
              className="flex-1 rounded-lg bg-black/20 border border-[var(--gold-400)]/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold-400)]"
            />
            <button
              onClick={() => submitAmount(Math.round(parseFloat(customAmount.replace(",", ".")) * 100))}
              disabled={!customAmount}
              className="rounded-lg bg-[var(--gold-400)] text-[var(--felt-900)] font-bold px-4 text-sm disabled:opacity-40"
            >
              Voorstellen
            </button>
          </div>
        </>
      )}

      {proposal && isMyProposal && (
        <div className="text-center text-[var(--cream-100)]/80 text-sm">
          Je stelde <span className="font-bold text-[var(--gold-300)]">{formatEuro(proposal.amount)}</span> voor.
          <br />
          Wachten op je tegenstander...
        </div>
      )}

      {proposal && !isMyProposal && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-[var(--cream-100)]/90">
            Je tegenstander stelt <span className="font-bold text-[var(--gold-300)]">{formatEuro(proposal.amount)}</span> voor.
          </p>
          <button
            onClick={() => {
              playChip();
              respondBet(true);
            }}
            className="rounded-lg bg-[var(--success-400)] text-[var(--felt-900)] font-bold py-2.5 hover:brightness-110 transition"
          >
            Accepteren
          </button>
          <div className="flex gap-2">
            <input
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              placeholder="Tegenvoorstel (bv. 2)"
              inputMode="decimal"
              className="flex-1 rounded-lg bg-black/20 border border-[var(--gold-400)]/30 px-3 py-2 text-sm outline-none focus:border-[var(--gold-400)]"
            />
            <button
              onClick={() => respondBet(false, Math.round(parseFloat(counterAmount.replace(",", ".")) * 100))}
              disabled={!counterAmount}
              className="rounded-lg bg-[var(--felt-700)] border border-[var(--gold-400)]/40 text-[var(--gold-300)] font-semibold px-3 text-sm disabled:opacity-40"
            >
              Tegenbod
            </button>
          </div>
          <button
            onClick={() => respondBet(false)}
            className="text-xs text-[var(--cream-100)]/50 hover:text-[var(--cream-100)]/80 transition"
          >
            Afwijzen
          </button>
        </div>
      )}
    </motion.div>
  );
}
