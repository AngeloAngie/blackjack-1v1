import { motion } from "framer-motion";
import type { Card, Suit } from "@blackjack/shared";

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RED_SUITS: Suit[] = ["hearts", "diamonds"];

interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  delay?: number;
  size?: "sm" | "md" | "lg";
}

const SIZES: Record<string, string> = {
  sm: "w-12 h-16 text-base",
  md: "w-16 h-24 text-xl",
  lg: "w-20 h-28 text-2xl",
};

export function CardView({ card, faceDown, delay = 0, size = "md" }: CardViewProps) {
  const dims = SIZES[size];
  const isRed = card ? RED_SUITS.includes(card.suit) : false;

  return (
    <motion.div
      className={`${dims} relative shrink-0`}
      style={{ perspective: 800 }}
      initial={{ y: -40, opacity: 0, rotate: -6 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
    >
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: faceDown || !card ? 180 : 0 }}
        transition={{ duration: 0.35, delay: delay + 0.08 }}
      >
        <div
          className={`card-face absolute inset-0 rounded-lg flex flex-col justify-between p-1.5 font-bold ${isRed ? "text-red-600" : "text-neutral-800"}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {card && (
            <>
              <span className="leading-none">{card.rank}</span>
              <span className="self-center text-[1.4em] leading-none">{SUIT_SYMBOL[card.suit]}</span>
              <span className="leading-none self-end rotate-180">{card.rank}</span>
            </>
          )}
        </div>
        <div
          className="card-back absolute inset-0 rounded-lg"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        />
      </motion.div>
    </motion.div>
  );
}
