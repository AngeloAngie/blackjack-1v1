import { describe, expect, it } from "vitest";
import { createDeck, Deck, secureShuffle } from "./deck.js";
import type { Card } from "@blackjack/shared";

function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

describe("createDeck", () => {
  it("maakt een deck van 52 unieke kaarten voor 1 deck", () => {
    const deck = createDeck(1);
    expect(deck).toHaveLength(52);
    const unique = new Set(deck.map(cardKey));
    expect(unique.size).toBe(52);
  });

  it("maakt 104 kaarten voor 2 decks, elke kaart exact 2 keer", () => {
    const deck = createDeck(2);
    expect(deck).toHaveLength(104);
    const counts = new Map<string, number>();
    for (const card of deck) {
      counts.set(cardKey(card), (counts.get(cardKey(card)) ?? 0) + 1);
    }
    expect(counts.size).toBe(52);
    for (const count of counts.values()) {
      expect(count).toBe(2);
    }
  });
});

describe("secureShuffle", () => {
  it("behoudt alle elementen (geen verlies/duplicatie) en verandert de volgorde", () => {
    const original = createDeck(1);
    const shuffled = secureShuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.map(cardKey).sort()).toEqual(original.map(cardKey).sort());
    // Kans dat shuffle exact dezelfde volgorde geeft is astronomisch klein.
    expect(shuffled.map(cardKey)).not.toEqual(original.map(cardKey));
  });
});

describe("Deck", () => {
  it("nooit duplicaten binnen hetzelfde deck, en dealt + remaining = totalSize", () => {
    const deck = new Deck(1);
    const seen = new Set<string>();
    for (let i = 0; i < 52; i++) {
      const card = deck.draw();
      const key = cardKey(card);
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(deck.dealt + deck.remaining).toBe(deck.totalSize);
    }
    expect(deck.remaining).toBe(0);
    expect(seen.size).toBe(52);
  });

  it("schudt automatisch opnieuw als het deck onder de drempel komt", () => {
    const deck = new Deck(1);
    // Trek kaarten tot net onder de reshuffle-drempel.
    while (deck.remaining > 10) {
      deck.draw();
    }
    const reshuffled = deck.reshuffleIfNeeded();
    expect(reshuffled).toBe(true);
    expect(deck.remaining).toBe(deck.totalSize);
  });

  it("schudt niet opnieuw als er nog genoeg kaarten zijn", () => {
    const deck = new Deck(1);
    const reshuffled = deck.reshuffleIfNeeded();
    expect(reshuffled).toBe(false);
    expect(deck.remaining).toBe(deck.totalSize);
  });

  it("forceert een reshuffle i.p.v. te crashen als er toch te veel wordt getrokken", () => {
    const deck = new Deck(1);
    for (let i = 0; i < 52; i++) deck.draw();
    expect(deck.remaining).toBe(0);
    const card = deck.draw();
    expect(card).toBeDefined();
    expect(deck.remaining).toBe(51);
  });

  it("werkt ook correct met meerdere decks", () => {
    const deck = new Deck(2);
    expect(deck.totalSize).toBe(104);
    const seen = new Map<string, number>();
    for (let i = 0; i < 104; i++) {
      const card = deck.draw();
      const key = cardKey(card);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const count of seen.values()) {
      expect(count).toBe(2);
    }
    expect(deck.remaining).toBe(0);
  });
});
