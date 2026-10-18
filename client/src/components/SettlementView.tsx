import { motion } from "framer-motion";
import type { FinalSettlement } from "@blackjack/shared";
import { useGameStore } from "../store/gameStore";

function formatEuro(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}€${(Math.abs(cents) / 100).toFixed(2)}`;
}

interface SettlementViewProps {
  settlement: FinalSettlement;
  myId?: string;
}

export function SettlementView({ settlement, myId }: SettlementViewProps) {
  const resetToLobby = useGameStore((s) => s.resetToLobby);
  const [p1, p2] = settlement.players;
  const me = myId ? settlement.players.find((p) => p.id === myId) : undefined;
  const opponent = myId ? settlement.players.find((p) => p.id !== myId) : undefined;

  let headline: string;
  if (me && opponent) {
    if (me.balance > 0) headline = `Je hebt ${formatEuro(me.balance)} gewonnen van ${opponent.name}!`;
    else if (me.balance < 0) headline = `Je bent ${formatEuro(Math.abs(me.balance))} verschuldigd aan ${opponent.name}.`;
    else headline = "Jullie staan quitte.";
  } else if (p1 && p2) {
    headline = p1.balance === 0 ? "Jullie staan quitte." : p1.balance > 0 ? `${p1.name} wint ${formatEuro(p1.balance)}` : `${p2.name} wint ${formatEuro(p2.balance)}`;
  } else {
    headline = "Sessie beëindigd.";
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 felt-texture py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-[var(--gold-400)]/30 bg-[var(--felt-800)]/90 backdrop-blur p-6 sm:p-8 shadow-2xl"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-center text-[var(--gold-300)] mb-2">Eindafrekening</h1>
        <p className="text-center text-sm text-[var(--cream-100)]/70 mb-6">
          Kamer {settlement.roomCode} · {settlement.roundsPlayed} ronde(s) gespeeld
        </p>

        <p className="text-center text-lg font-semibold mb-6">{headline}</p>

        <div className="flex justify-center gap-10 mb-6">
          {settlement.players.map((p) => (
            <div key={p.id} className="flex flex-col items-center">
              <span className="text-xs uppercase tracking-wide text-[var(--gold-300)]/70">{p.name}</span>
              <span className={`text-lg font-bold ${p.balance < 0 ? "text-[var(--danger-400)]" : "text-[var(--success-400)]"}`}>
                {formatEuro(p.balance)}
              </span>
            </div>
          ))}
        </div>

        {settlement.history.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--gold-400)]/20 mb-6">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--felt-900)] text-[var(--gold-300)]/70">
                <tr>
                  <th className="py-2 px-2 text-left">Ronde</th>
                  <th className="py-2 px-2 text-left">Inzet</th>
                  <th className="py-2 px-2 text-left">Winnaar</th>
                </tr>
              </thead>
              <tbody>
                {settlement.history.map((round) => {
                  const winnerName =
                    round.winnerId === null
                      ? "Push"
                      : settlement.players.find((p) => p.id === round.winnerId)?.name ?? "-";
                  return (
                    <tr key={round.roundNumber} className="border-t border-[var(--gold-400)]/10">
                      <td className="py-1.5 px-2">{round.roundNumber}</td>
                      <td className="py-1.5 px-2">
                        {formatEuro(round.bet)}
                        {round.multiplier === 2 ? " ×2" : ""}
                      </td>
                      <td className="py-1.5 px-2">{winnerName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-[var(--cream-100)]/50 mb-4">
          Een volledige afrekening is naar beide e-mailadressen verstuurd (HTML + PDF-bijlage).
        </p>

        <button
          onClick={resetToLobby}
          className="w-full rounded-lg bg-[var(--gold-400)] text-[var(--felt-900)] font-bold py-2.5 hover:brightness-110 transition"
        >
          Terug naar start
        </button>
      </motion.div>
    </div>
  );
}
