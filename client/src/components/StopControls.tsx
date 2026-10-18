import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicRoomState } from "@blackjack/shared";
import { useGameStore } from "../store/gameStore";

interface StopControlsProps {
  roomState: PublicRoomState;
}

export function StopControls({ roomState }: StopControlsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const proposeStop = useGameStore((s) => s.proposeStop);
  const respondStop = useGameStore((s) => s.respondStop);
  const forceStop = useGameStore((s) => s.forceStop);

  const myId = roomState.yourPlayerId;
  const incomingProposal = roomState.stopProposal && roomState.stopProposal.byPlayerId !== myId;
  const myProposalPending = roomState.stopProposal && roomState.stopProposal.byPlayerId === myId;
  const opponentName = roomState.players.find((p) => p.id !== myId)?.name ?? "je tegenstander";

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="absolute top-4 right-4 text-xs rounded-lg border border-[var(--gold-400)]/40 text-[var(--gold-300)]/80 px-3 py-1.5 hover:bg-[var(--gold-400)]/10 transition"
      >
        Stoppen
      </button>

      {myProposalPending && (
        <div className="absolute top-14 right-4 text-xs text-[var(--cream-100)]/60 max-w-[160px] text-right">
          Wachten op bevestiging van {opponentName}...
        </div>
      )}

      <AnimatePresence>
        {incomingProposal && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--felt-900)] border border-[var(--gold-400)]/50 shadow-2xl px-5 py-4 flex items-center gap-4"
          >
            <span className="text-sm">{opponentName} wil stoppen en de eindafrekening maken.</span>
            <button
              onClick={() => respondStop(true)}
              className="rounded-lg bg-[var(--success-400)] text-[var(--felt-900)] font-bold px-3 py-1.5 text-sm"
            >
              Akkoord
            </button>
            <button
              onClick={() => respondStop(false)}
              className="rounded-lg border border-[var(--gold-400)]/40 px-3 py-1.5 text-sm text-[var(--gold-300)]"
            >
              Weiger
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[var(--felt-800)] border border-[var(--gold-400)]/40 p-6 shadow-2xl"
            >
              <h3 className="font-bold text-[var(--gold-300)] mb-4 text-center">Sessie stoppen</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    proposeStop();
                    setModalOpen(false);
                  }}
                  className="rounded-lg bg-[var(--felt-700)] border border-[var(--gold-400)]/40 px-4 py-2.5 text-sm text-[var(--gold-300)] hover:brightness-125 transition"
                >
                  Vraag {opponentName} om samen te stoppen
                </button>
                <button
                  onClick={() => {
                    forceStop();
                    setModalOpen(false);
                  }}
                  className="rounded-lg bg-[var(--danger-400)] text-white px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition"
                >
                  Nu direct stoppen (eenzijdig)
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-xs text-[var(--cream-100)]/50 hover:text-[var(--cream-100)]/80 transition mt-1"
                >
                  Annuleren
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
