import type { HandValue, PublicPlayerInfo } from "@blackjack/shared";
import { CardView } from "./CardView";

const STATUS_LABEL: Record<PublicPlayerInfo["status"], string> = {
  waiting: "Wacht op volgende ronde",
  playing: "Aan het spelen...",
  stood: "Staat",
  bust: "Bust!",
  blackjack: "Blackjack!",
};

function valueLabel(value: HandValue | undefined): string {
  if (!value) return "";
  if (value.isBlackjack) return "Blackjack";
  if (value.isBust) return `Bust (${value.total})`;
  return value.soft ? `${value.total} (soft)` : `${value.total}`;
}

interface HandProps {
  player: PublicPlayerInfo;
  isMe: boolean;
  isTurn: boolean;
}

export function Hand({ player, isMe, isTurn }: HandProps) {
  const cards = player.hand;
  // De tegenstander stuurt soms maar 1 open kaart (de rest blijft dicht tot de reveal), dus het
  // aantal kaartruggen is het verschil tussen de echte handgrootte en wat er al zichtbaar is.
  const placeholderCount = player.cardCount - (cards?.length ?? 0);

  return (
    <div className={`flex flex-col items-center gap-2 ${isTurn ? "opacity-100" : "opacity-90"}`}>
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${player.connected ? "bg-[var(--success-400)]" : "bg-[var(--danger-400)]"}`}
          title={player.connected ? "Verbonden" : "Verbinding verbroken"}
        />
        <span className="font-semibold text-[var(--cream-100)]">
          {player.isBot ? "🤖 " : ""}
          {player.name} {isMe ? "(jij)" : ""}
        </span>
        {player.doubledDown && (
          <span className="text-xs uppercase tracking-wide rounded px-1.5 py-0.5 bg-[var(--gold-400)]/20 text-[var(--gold-300)] border border-[var(--gold-400)]/40">
            Double
          </span>
        )}
      </div>

      <div className="flex gap-1.5 min-h-[6rem] items-center justify-center">
        {cards?.map((card, i) => <CardView key={i} card={card} delay={i * 0.12} />)}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <CardView key={`ph-${i}`} delay={i * 0.12} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span
          className={`text-sm font-bold ${player.status === "bust" ? "text-[var(--danger-400)]" : player.status === "blackjack" ? "text-[var(--gold-300)]" : "text-[var(--cream-100)]"}`}
        >
          {player.value ? valueLabel(player.value) : " "}
        </span>
        <span className="text-xs uppercase tracking-wide text-[var(--gold-300)]/80">
          {isTurn && player.status === "playing" ? "→ " : ""}
          {STATUS_LABEL[player.status]}
        </span>
      </div>
    </div>
  );
}
