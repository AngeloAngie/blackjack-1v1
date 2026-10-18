import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";

function useJoinCodeFromUrl(): string {
  const [code] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("join") ?? "").toUpperCase();
  });
  return code;
}

export function Lobby() {
  const prefillCode = useJoinCodeFromUrl();
  const [mode, setMode] = useState<"create" | "join">(prefillCode ? "join" : "create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(prefillCode);
  const [submitting, setSubmitting] = useState(false);
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);

  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (mode === "create") {
      await createRoom(name.trim(), email.trim());
    } else {
      await joinRoom(code.trim().toUpperCase(), name.trim(), email.trim());
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 felt-texture">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-[var(--gold-400)]/30 bg-[var(--felt-800)]/80 backdrop-blur p-6 sm:p-8 shadow-2xl"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-[var(--gold-300)] tracking-wide">
          {"♠"} Blackjack 1v1 {"♥"}
        </h1>
        <p className="text-center text-sm text-[var(--cream-100)]/70 mt-1 mb-6">
          Speel tegen een vriend. Geen dealer, geen echt geld - gewoon bijhouden wie wie wat schuldig is.
        </p>

        <div className="flex rounded-lg overflow-hidden border border-[var(--gold-400)]/30 mb-6">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === "create" ? "bg-[var(--gold-400)] text-[var(--felt-900)]" : "text-[var(--cream-100)]/70"
            }`}
          >
            Kamer maken
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === "join" ? "bg-[var(--gold-400)] text-[var(--felt-900)]" : "text-[var(--cream-100)]/70"
            }`}
          >
            Kamer joinen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "join" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-[var(--gold-300)]/80">Kamercode</span>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BV7K2M"
                maxLength={6}
                className="rounded-lg bg-black/20 border border-[var(--gold-400)]/30 px-3 py-2 tracking-[0.3em] text-center font-mono text-lg outline-none focus:border-[var(--gold-400)]"
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--gold-300)]/80">Jouw naam</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Angie"
              className="rounded-lg bg-black/20 border border-[var(--gold-400)]/30 px-3 py-2 outline-none focus:border-[var(--gold-400)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-[var(--gold-300)]/80">E-mailadres</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@example.com"
              className="rounded-lg bg-black/20 border border-[var(--gold-400)]/30 px-3 py-2 outline-none focus:border-[var(--gold-400)]"
            />
          </label>

          {error && <p className="text-sm text-[var(--danger-400)] text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-[var(--gold-400)] text-[var(--felt-900)] font-bold py-2.5 hover:brightness-110 transition disabled:opacity-50"
          >
            {submitting ? "Even geduld..." : mode === "create" ? "Kamer aanmaken" : "Joinen"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
