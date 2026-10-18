import { useState } from "react";
import { isMuted, setMuted } from "../lib/sounds";

export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted());

  function toggle() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  return (
    <button
      onClick={toggle}
      title={muted ? "Geluid aanzetten" : "Geluid dempen"}
      className="absolute top-4 left-4 text-lg rounded-lg border border-[var(--gold-400)]/40 text-[var(--gold-300)]/80 px-2.5 py-1.5 hover:bg-[var(--gold-400)]/10 transition"
    >
      {muted ? "\u{1F507}" : "\u{1F50A}"}
    </button>
  );
}
