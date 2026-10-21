import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const REPO_URL = "https://github.com/AngeloAngie/blackjack-1v1";

const POINTS = [
  "Het kaartendeck leeft alleen op de server, nooit in jullie browser - niemand kan kaarten zien die nog niet gedeeld zijn.",
  "Schudden gebeurt met cryptografisch veilige randomness (dezelfde soort random-generator als voor beveiliging), niet met een voorspelbare generator.",
  "Je ziet al je eigen kaarten. Van je tegenstander ligt alleen de eerste kaart open - de rest blijft een kaartrug (en diens status blijft neutraal) totdat de ronde klaar is.",
  "Elke actie - hit, stand, bieden, stoppen - wordt op de server gecontroleerd. De app op je eigen telefoon of laptop kan het spel niet beïnvloeden.",
  "De volledige broncode is open en publiek in te zien, inclusief de schud- en deel-logica.",
];

interface FairPlayInfoProps {
  className?: string;
}

export function FairPlayInfo({ className = "" }: FairPlayInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`text-xs rounded-lg border border-[var(--gold-400)]/40 text-[var(--gold-300)]/80 px-3 py-1.5 hover:bg-[var(--gold-400)]/10 transition ${className}`}
      >
        🔒 Eerlijk spel
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[var(--felt-800)] border border-[var(--gold-400)]/40 p-6 shadow-2xl"
            >
              <h3 className="font-bold text-[var(--gold-300)] mb-4 text-center text-lg">🔒 Eerlijk spel</h3>
              <ul className="flex flex-col gap-3 mb-5">
                {POINTS.map((point, i) => (
                  <li key={i} className="text-sm text-[var(--cream-100)]/90 flex gap-2">
                    <span className="text-[var(--gold-400)] shrink-0">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="block text-center rounded-lg bg-[var(--felt-700)] border border-[var(--gold-400)]/40 text-[var(--gold-300)] font-semibold py-2.5 text-sm hover:brightness-125 transition mb-3"
              >
                Bekijk de broncode op GitHub ↗
              </a>
              <button
                onClick={() => setOpen(false)}
                className="w-full text-xs text-[var(--cream-100)]/50 hover:text-[var(--cream-100)]/80 transition"
              >
                Sluiten
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
