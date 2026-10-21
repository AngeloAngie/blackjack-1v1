import type { Card, Suit } from "@blackjack/shared";

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RED_SUITS: Suit[] = ["hearts", "diamonds"];

/**
 * Lichtgewicht, statische kaartweergave (geen animatie) voor lijsten met veel kaarten tegelijk,
 * zoals een rondegeschiedenis van 100+ rondes - de volle CardView met Framer Motion zou daar te
 * zwaar voor zijn.
 */
export function MiniCard({ card }: { card: Card }) {
  const isRed = RED_SUITS.includes(card.suit);
  return (
    <span
      className={`inline-flex items-center justify-center gap-0.5 rounded border px-1.5 py-0.5 text-xs font-bold bg-[var(--cream-100)] border-black/10 ${
        isRed ? "text-red-600" : "text-neutral-800"
      }`}
    >
      {card.rank}
      {SUIT_SYMBOL[card.suit]}
    </span>
  );
}
