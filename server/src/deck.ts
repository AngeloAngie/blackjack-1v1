import { randomInt } from "node:crypto";
import type { Card, Rank, Suit } from "@blackjack/shared";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function createDeck(numDecks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank });
      }
    }
  }
  return cards;
}

/** Fisher-Yates shuffle met cryptografisch veilige randomness. */
export function secureShuffle<T>(input: T[]): T[] {
  const arr = input.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const MIN_RESHUFFLE_THRESHOLD = 15;

/**
 * Het deck leeft uitsluitend hier op de server. Clients krijgen alleen
 * de kaarten die aan hen zijn uitgedeeld, nooit het deck zelf.
 */
export class Deck {
  private cards: Card[];
  private readonly numDecks: number;
  private readonly reshuffleThreshold: number;

  constructor(numDecks = 1) {
    this.numDecks = numDecks;
    this.reshuffleThreshold = Math.max(MIN_RESHUFFLE_THRESHOLD, Math.floor(numDecks * 52 * 0.2));
    this.cards = secureShuffle(createDeck(numDecks));
  }

  get totalSize(): number {
    return this.numDecks * 52;
  }

  get remaining(): number {
    return this.cards.length;
  }

  get dealt(): number {
    return this.totalSize - this.cards.length;
  }

  /** Geeft true terug als het deck (bijna) leeg was en opnieuw is geschud. */
  reshuffleIfNeeded(): boolean {
    if (this.cards.length < this.reshuffleThreshold) {
      this.cards = secureShuffle(createDeck(this.numDecks));
      return true;
    }
    return false;
  }

  draw(): Card {
    if (this.cards.length === 0) {
      this.cards = secureShuffle(createDeck(this.numDecks));
    }
    const card = this.cards.pop();
    if (!card) {
      throw new Error("Deck is onverwacht leeg na reshuffle");
    }
    return card;
  }
}
