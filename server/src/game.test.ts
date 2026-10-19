import { describe, expect, it } from "vitest";
import type { Card } from "@blackjack/shared";
import { GameRoom, generateId } from "./game.js";
import type { Deck } from "./deck.js";

function c(rank: Card["rank"], suit: Card["suit"] = "spades"): Card {
  return { rank, suit };
}

class FakeDeck {
  private queue: Card[];
  constructor(queue: Card[]) {
    this.queue = queue;
  }
  get remaining() {
    return this.queue.length;
  }
  get totalSize() {
    return 52;
  }
  get dealt() {
    return 52 - this.queue.length;
  }
  reshuffleIfNeeded() {
    return false;
  }
  draw(): Card {
    const card = this.queue.shift();
    if (!card) throw new Error("FakeDeck is leeg");
    return card;
  }
}

function setup(queue: Card[]) {
  const room = new GameRoom("TEST01", { deck: new FakeDeck(queue) as unknown as Deck });
  const a = room.addPlayer({ id: generateId(), name: "Alice", email: "alice@example.com", rejoinToken: "a" });
  const b = room.addPlayer({ id: generateId(), name: "Bob", email: "bob@example.com", rejoinToken: "b" });
  return { room, a, b };
}

describe("GameRoom - inzet onderhandeling", () => {
  it("start een ronde pas als beide spelers akkoord zijn", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8")]);
    room.proposeBet(a.id, 100);
    expect(room.phase).toBe("betting");
    room.respondBet(b.id, true);
    expect(room.phase).toBe("playing");
    expect(room.agreedBet).toBe(100);
  });

  it("ondersteunt een tegenvoorstel", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8")]);
    room.proposeBet(a.id, 500);
    room.respondBet(b.id, false, 200);
    expect(room.betProposal).toEqual({ byPlayerId: b.id, amount: 200 });
    room.respondBet(a.id, true);
    expect(room.agreedBet).toBe(200);
  });
});

describe("GameRoom - winnaar bepalen", () => {
  it("hoogste waarde zonder bust wint (20 verslaat 19)", () => {
    const { room, a, b } = setup([c("K"), c("Q"), c("10"), c("9")]); // a: K+Q=20, b: 10+9=19
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    room.stand(a.id);
    room.stand(b.id);
    expect(room.phase).toBe("round_end");
    expect(room.getPlayer(a.id)!.balance).toBe(100);
    expect(room.getPlayer(b.id)!.balance).toBe(-100);
  });

  it("bust verliest direct", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8"), c("10")]);
    room.proposeBet(a.id, 50);
    room.respondBet(b.id, true);
    room.hit(a.id); // a: 10+9+10 = 29 bust
    room.stand(b.id);
    expect(room.getPlayer(a.id)!.status).toBe("bust");
    expect(room.getPlayer(b.id)!.balance).toBe(50);
    expect(room.getPlayer(a.id)!.balance).toBe(-50);
  });

  it("blackjack verslaat een gewone 21", () => {
    const { room, a, b } = setup([c("A"), c("K"), c("10"), c("9"), c("2")]);
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    expect(room.getPlayer(a.id)!.status).toBe("blackjack");
    room.hit(b.id); // b: 10+9+2 = 21, geen blackjack (3 kaarten)
    room.stand(b.id);
    expect(room.phase).toBe("round_end");
    expect(room.getPlayer(a.id)!.balance).toBe(100);
    expect(room.getPlayer(b.id)!.balance).toBe(-100);
  });

  it("gelijke waarde is een push, geen saldowijziging", () => {
    const { room, a, b } = setup([c("K"), c("9"), c("Q"), c("9")]); // beide 19
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    room.stand(a.id);
    room.stand(b.id);
    expect(room.getPlayer(a.id)!.balance).toBe(0);
    expect(room.getPlayer(b.id)!.balance).toBe(0);
    expect(room.history[0].winnerId).toBeNull();
  });

  it("allebei bust is een push", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8"), c("10"), c("10")]);
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    room.hit(a.id); // 29 bust
    room.hit(b.id); // 28 bust
    expect(room.getPlayer(a.id)!.status).toBe("bust");
    expect(room.getPlayer(b.id)!.status).toBe("bust");
    expect(room.getPlayer(a.id)!.balance).toBe(0);
    expect(room.getPlayer(b.id)!.balance).toBe(0);
  });

  it("double down verdubbelt de inzet voor de hele ronde", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8"), c("K")]); // a: 10+9 -> double -> +K = 29? recompute below
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    // a heeft 10+9=19, double down trekt K erbij -> 29, bust. b staat op 18 en stand.
    room.doubleDown(a.id);
    room.stand(b.id);
    expect(room.getPlayer(a.id)!.status).toBe("bust");
    expect(room.getPlayer(b.id)!.balance).toBe(200); // bet 100 * multiplier 2
    expect(room.getPlayer(a.id)!.balance).toBe(-200);
  });
});

describe("GameRoom - stoppen", () => {
  it("eenzijdig stoppen midden in een ronde annuleert zonder saldowijziging", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8")]);
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    room.forceStop();
    expect(room.phase).toBe("stopped");
    expect(room.getPlayer(a.id)!.balance).toBe(0);
    expect(room.getPlayer(b.id)!.balance).toBe(0);
  });

  it("stop-voorstel moet geaccepteerd worden door de ander", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8")]);
    room.proposeStop(a.id);
    expect(() => room.respondStop(a.id, true)).toThrow();
    room.respondStop(b.id, false);
    expect(room.stopProposal).toBeNull();
    expect(room.phase).not.toBe("stopped");
    room.proposeStop(a.id);
    room.respondStop(b.id, true);
    expect(room.phase).toBe("stopped");
  });
});

describe("GameRoom - tegen de computer", () => {
  it("addBot vult de kamer meteen en zet de fase op betting", () => {
    const room = new GameRoom("BOT001", { deck: new FakeDeck([]) as unknown as Deck });
    expect(room.hasBot).toBe(false);
    room.addPlayer({ id: generateId(), name: "Angie", email: "angie@example.com", rejoinToken: "a" });
    expect(room.phase).toBe("waiting");
    const bot = room.addBot();
    expect(bot.isBot).toBe(true);
    expect(room.hasBot).toBe(true);
    expect(room.isFull).toBe(true);
    expect(room.phase).toBe("betting");
  });

  it("speelt een volledige ronde met de bot als tweede speler", () => {
    const room = new GameRoom("BOT002", {
      deck: new FakeDeck([c("K"), c("Q"), c("10"), c("9")]) as unknown as Deck,
    });
    const human = room.addPlayer({ id: generateId(), name: "Angie", email: "angie@example.com", rejoinToken: "a" });
    const bot = room.addBot();
    room.proposeBet(human.id, 100);
    room.respondBet(bot.id, true);
    room.stand(human.id);
    room.stand(bot.id);
    expect(room.phase).toBe("round_end");
    expect(room.getPlayer(human.id)!.balance).toBe(100);
    expect(room.getPlayer(bot.id)!.balance).toBe(-100);
  });
});

describe("GameRoom - geen info-lek vóór de reveal", () => {
  it("verbergt bust/blackjack van de tegenstander tijdens het spelen (ziet eruit als 'stood')", () => {
    const { room, a, b } = setup([c("10"), c("9"), c("10"), c("8"), c("10")]);
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true);
    room.hit(a.id); // a: 10+9+10 = 29, bust

    // a's eigen view: ziet zijn eigen echte status.
    const aView = room.toPublicState(a.id);
    expect(aView.players.find((p) => p.id === a.id)!.status).toBe("bust");

    // b's view op a (nog niet gerevealed, b is zelf nog aan het spelen): moet "stood" lijken,
    // niet "bust" - anders weet b al dat hij gewonnen heeft voor zijn eigen beurt klaar is.
    const bView = room.toPublicState(b.id);
    expect(bView.players.find((p) => p.id === a.id)!.status).toBe("stood");
    expect(bView.players.find((p) => p.id === a.id)!.hand).toBeUndefined();

    room.stand(b.id);
    expect(room.phase).toBe("round_end");

    // Na de reveal ziet iedereen de echte status.
    const afterReveal = room.toPublicState(b.id);
    expect(afterReveal.players.find((p) => p.id === a.id)!.status).toBe("bust");
  });

  it("verbergt ook een natural blackjack van de tegenstander tot de reveal", () => {
    const { room, a, b } = setup([c("A"), c("K"), c("10"), c("9"), c("2")]);
    room.proposeBet(a.id, 100);
    room.respondBet(b.id, true); // a krijgt direct blackjack

    const bView = room.toPublicState(b.id);
    expect(bView.players.find((p) => p.id === a.id)!.status).toBe("stood");

    room.hit(b.id);
    room.stand(b.id);
    const afterReveal = room.toPublicState(b.id);
    expect(afterReveal.players.find((p) => p.id === a.id)!.status).toBe("blackjack");
  });
});
