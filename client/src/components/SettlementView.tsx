import { motion } from "framer-motion";
import type { FinalSettlement } from "@blackjack/shared";
import { useGameStore } from "../store/gameStore";
import { RoundHistoryList } from "./RoundHistoryList";

function formatEuro(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}€${(Math.abs(cents) / 100).toFixed(2)}`;
}

function downloadPdf(settlement: FinalSettlement): void {
  const byteChars = atob(settlement.pdfBase64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `afrekening-${settlement.roomCode}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  const emailWasSent = settlement.players.every((p) => p.email);

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
        className="w-full max-w-xl rounded-2xl border border-[var(--gold-400)]/30 bg-[var(--felt-800)]/90 backdrop-blur p-6 sm:p-8 shadow-2xl"
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
          <>
            <p className="text-xs uppercase tracking-wide text-[var(--gold-300)]/70 mb-2">
              Rondegeschiedenis (klik een ronde open voor de kaarten)
            </p>
            <RoundHistoryList settlement={settlement} />
          </>
        )}

        {emailWasSent && (
          <p className="text-center text-xs text-[var(--cream-100)]/50 mb-4">
            Een volledige afrekening is naar beide e-mailadressen verstuurd (HTML + PDF-bijlage).
          </p>
        )}

        <button
          onClick={() => downloadPdf(settlement)}
          className="w-full rounded-lg bg-[var(--felt-700)] border border-[var(--gold-400)]/40 text-[var(--gold-300)] font-semibold py-2.5 mb-3 hover:brightness-125 transition"
        >
          📄 Download PDF
        </button>

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
