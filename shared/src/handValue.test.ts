import { describe, expect, it } from "vitest";
import { calculateHandValue } from "./handValue.js";
import type { Card } from "./types.js";

function c(rank: Card["rank"], suit: Card["suit"] = "spades"): Card {
  return { rank, suit };
}

describe("calculateHandValue", () => {
  it("telt simpele numerieke kaarten op", () => {
    expect(calculateHandValue([c("4"), c("5")]).total).toBe(9);
  });

  it("behandelt J/Q/K als 10", () => {
    expect(calculateHandValue([c("K"), c("Q")]).total).toBe(20);
  });

  it("herkent een natural blackjack (A + 10-waarde, 2 kaarten)", () => {
    const value = calculateHandValue([c("A"), c("K")]);
    expect(value.total).toBe(21);
    expect(value.isBlackjack).toBe(true);
    expect(value.isBust).toBe(false);
  });

  it("21 met meer dan 2 kaarten is geen blackjack", () => {
    const value = calculateHandValue([c("5"), c("6"), c("K")]);
    expect(value.total).toBe(21);
    expect(value.isBlackjack).toBe(false);
  });

  it("telt een aas als 11 als dat niet bust", () => {
    const value = calculateHandValue([c("A"), c("5")]);
    expect(value.total).toBe(16);
    expect(value.soft).toBe(true);
  });

  it("verlaagt een aas naar 1 om bust te voorkomen", () => {
    const value = calculateHandValue([c("A"), c("5"), c("8")]);
    expect(value.total).toBe(14);
    expect(value.soft).toBe(false);
    expect(value.isBust).toBe(false);
  });

  it("behandelt twee azen correct (A+A = 12, niet 22)", () => {
    const value = calculateHandValue([c("A"), c("A")]);
    expect(value.total).toBe(12);
    expect(value.soft).toBe(true);
  });

  it("behandelt drie azen correct (A+A+A = 13)", () => {
    const value = calculateHandValue([c("A"), c("A"), c("A")]);
    expect(value.total).toBe(13);
  });

  it("herkent bust boven 21", () => {
    const value = calculateHandValue([c("K"), c("Q"), c("5")]);
    expect(value.total).toBe(25);
    expect(value.isBust).toBe(true);
  });

  it("A+A+9 wordt 21, geen bust", () => {
    const value = calculateHandValue([c("A"), c("A"), c("9")]);
    expect(value.total).toBe(21);
    expect(value.isBust).toBe(false);
    expect(value.isBlackjack).toBe(false);
  });
});
