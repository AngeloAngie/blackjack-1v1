import type { Card, HandValue, Rank } from "./types.js";

function baseRankValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

/**
 * Standaard blackjack-waardeberekening: azen tellen als 11, en worden
 * automatisch verlaagd naar 1 (één voor één) totdat de hand niet meer bust is,
 * of totdat er geen azen meer over zijn om te verlagen.
 */
export function calculateHandValue(cards: Card[]): HandValue {
  let total = 0;
  let aceCount = 0;

  for (const card of cards) {
    total += baseRankValue(card.rank);
    if (card.rank === "A") aceCount++;
  }

  let acesStillHigh = aceCount;
  while (total > 21 && acesStillHigh > 0) {
    total -= 10;
    acesStillHigh--;
  }

  const isBust = total > 21;
  const soft = acesStillHigh > 0 && !isBust;
  const isBlackjack = cards.length === 2 && total === 21 && !isBust;

  return { total, soft, isBlackjack, isBust };
}
