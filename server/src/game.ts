import { randomUUID } from "node:crypto";
import {
  calculateHandValue,
  type BetProposal,
  type Card,
  type PlayerStatus,
  type PublicPlayerInfo,
  type PublicRoomState,
  type RoomPhase,
  type RoundHistoryEntry,
  type StopProposal,
} from "@blackjack/shared";
import { Deck } from "./deck.js";

export interface PlayerInfo {
  id: string;
  name: string;
  email: string;
  rejoinToken: string;
  isBot?: boolean;
}

interface Player extends PlayerInfo {
  socketId: string | null;
  connected: boolean;
  balance: number;
  hand: Card[];
  status: PlayerStatus;
  doubledDown: boolean;
  isBot: boolean;
}

const MAX_PLAYERS = 2;
export const BOT_PLAYER_ID = "bot";

export class GameRoom {
  readonly code: string;
  readonly createdAt = Date.now();
  private readonly deck: Deck;
  private players: Player[] = [];
  phase: RoomPhase = "waiting";
  agreedBet: number | null = null;
  betProposal: BetProposal | null = null;
  stopProposal: StopProposal | null = null;
  justReshuffled = false;
  roundNumber = 0;
  history: RoundHistoryEntry[] = [];
  stoppedAt: number | null = null;

  constructor(code: string, options: { numDecks?: number; deck?: Deck } = {}) {
    this.code = code;
    this.deck = options.deck ?? new Deck(options.numDecks ?? 1);
  }

  get isFull(): boolean {
    return this.players.length >= MAX_PLAYERS;
  }

  get playerCount(): number {
    return this.players.length;
  }

  get hasBot(): boolean {
    return this.players.some((p) => p.isBot);
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  private other(playerId: string): Player | undefined {
    return this.players.find((p) => p.id !== playerId);
  }

  addPlayer(info: PlayerInfo): Player {
    if (this.isFull) throw new Error("Deze kamer is vol");
    const player: Player = {
      ...info,
      isBot: info.isBot ?? false,
      socketId: null,
      connected: true,
      balance: 0,
      hand: [],
      status: "waiting",
      doubledDown: false,
    };
    this.players.push(player);
    if (this.players.length === MAX_PLAYERS) {
      this.phase = "betting";
    }
    return player;
  }

  /** Voegt een computerspeler toe zodat er direct, zonder tweede mens, gespeeld kan worden. */
  addBot(): Player {
    return this.addPlayer({
      id: BOT_PLAYER_ID,
      name: "Computer",
      email: "",
      rejoinToken: generateId(),
      isBot: true,
    });
  }

  setSocket(playerId: string, socketId: string | null, connected: boolean): void {
    const player = this.getPlayer(playerId);
    if (!player) return;
    player.socketId = socketId;
    player.connected = connected;
  }

  findByRejoinToken(token: string): Player | undefined {
    return this.players.find((p) => p.rejoinToken === token);
  }

  getConnectedSockets(): { playerId: string; socketId: string | null }[] {
    return this.players.map((p) => ({ playerId: p.id, socketId: p.socketId }));
  }

  proposeBet(playerId: string, amount: number): void {
    if (this.phase !== "betting") throw new Error("Nu kan geen inzet worden voorgesteld");
    if (!Number.isInteger(amount) || amount <= 0) throw new Error("Ongeldige inzet");
    this.betProposal = { byPlayerId: playerId, amount };
  }

  respondBet(playerId: string, accept: boolean, counterAmount?: number): void {
    if (this.phase !== "betting") throw new Error("Nu kan geen inzet worden beantwoord");
    const proposal = this.betProposal;
    if (!proposal) throw new Error("Er is geen openstaand voorstel");
    if (proposal.byPlayerId === playerId) throw new Error("Je kunt je eigen voorstel niet beantwoorden");

    if (!accept) {
      if (counterAmount !== undefined) {
        if (!Number.isInteger(counterAmount) || counterAmount <= 0) {
          throw new Error("Ongeldige inzet");
        }
        this.betProposal = { byPlayerId: playerId, amount: counterAmount };
      } else {
        this.betProposal = null;
      }
      return;
    }

    this.agreedBet = proposal.amount;
    this.betProposal = null;
    this.startRound();
  }

  private startRound(): void {
    this.roundNumber += 1;
    this.justReshuffled = this.deck.reshuffleIfNeeded();
    for (const player of this.players) {
      player.hand = [this.deck.draw(), this.deck.draw()];
      player.doubledDown = false;
      const value = calculateHandValue(player.hand);
      player.status = value.isBlackjack ? "blackjack" : "playing";
    }
    this.phase = "playing";
    this.maybeResolveRound();
  }

  hit(playerId: string): void {
    const player = this.requireActivePlayer(playerId);
    player.hand.push(this.deck.draw());
    const value = calculateHandValue(player.hand);
    if (value.isBust) player.status = "bust";
    this.maybeResolveRound();
  }

  stand(playerId: string): void {
    const player = this.requireActivePlayer(playerId);
    player.status = "stood";
    this.maybeResolveRound();
  }

  doubleDown(playerId: string): void {
    const player = this.requireActivePlayer(playerId);
    if (player.hand.length !== 2) {
      throw new Error("Double down is alleen mogelijk direct na de eerste twee kaarten");
    }
    player.doubledDown = true;
    player.hand.push(this.deck.draw());
    const value = calculateHandValue(player.hand);
    player.status = value.isBust ? "bust" : "stood";
    this.maybeResolveRound();
  }

  private requireActivePlayer(playerId: string): Player {
    if (this.phase !== "playing") throw new Error("Er is nu geen actieve ronde");
    const player = this.getPlayer(playerId);
    if (!player) throw new Error("Onbekende speler");
    if (player.status !== "playing") throw new Error("Je bent al klaar met deze ronde");
    return player;
  }

  private isDone(player: Player): boolean {
    return player.status === "stood" || player.status === "bust" || player.status === "blackjack";
  }

  private maybeResolveRound(): void {
    if (this.phase !== "playing") return;
    if (this.players.length < MAX_PLAYERS) return;
    if (!this.players.every((p) => this.isDone(p))) return;
    this.resolveRound();
  }

  private resolveRound(): void {
    const [a, b] = this.players;
    const valueA = calculateHandValue(a.hand);
    const valueB = calculateHandValue(b.hand);
    const multiplier: 1 | 2 = a.doubledDown || b.doubledDown ? 2 : 1;

    let winnerId: string | null;
    if (valueA.isBust && valueB.isBust) {
      winnerId = null;
    } else if (valueA.isBust) {
      winnerId = b.id;
    } else if (valueB.isBust) {
      winnerId = a.id;
    } else if (valueA.isBlackjack && valueB.isBlackjack) {
      winnerId = null;
    } else if (valueA.isBlackjack) {
      winnerId = a.id;
    } else if (valueB.isBlackjack) {
      winnerId = b.id;
    } else if (valueA.total > valueB.total) {
      winnerId = a.id;
    } else if (valueB.total > valueA.total) {
      winnerId = b.id;
    } else {
      winnerId = null;
    }

    const bet = this.agreedBet ?? 0;
    const transfer = bet * multiplier;
    if (winnerId === a.id) {
      a.balance += transfer;
      b.balance -= transfer;
    } else if (winnerId === b.id) {
      b.balance += transfer;
      a.balance -= transfer;
    }

    this.history.push({
      roundNumber: this.roundNumber,
      bet,
      multiplier,
      playerAHand: [...a.hand],
      playerBHand: [...b.hand],
      playerAValue: valueA,
      playerBValue: valueB,
      playerADoubled: a.doubledDown,
      playerBDoubled: b.doubledDown,
      winnerId,
      timestamp: Date.now(),
    });

    this.phase = "round_end";
  }

  startNextRound(): void {
    if (this.phase !== "round_end") throw new Error("De vorige ronde is nog niet klaar");
    for (const player of this.players) {
      player.hand = [];
      player.status = "waiting";
      player.doubledDown = false;
    }
    this.agreedBet = null;
    this.phase = "betting";
  }

  proposeStop(playerId: string): void {
    this.stopProposal = { byPlayerId: playerId };
  }

  respondStop(playerId: string, accept: boolean): boolean {
    const proposal = this.stopProposal;
    if (!proposal) throw new Error("Er is geen stop-voorstel");
    if (proposal.byPlayerId === playerId) throw new Error("Je kunt je eigen voorstel niet beantwoorden");
    if (!accept) {
      this.stopProposal = null;
      return false;
    }
    this.finalize();
    return true;
  }

  /** Eenzijdig stoppen: mag altijd, annuleert een lopende ronde zonder balanswijziging. */
  forceStop(): void {
    this.finalize();
  }

  private finalize(): void {
    this.phase = "stopped";
    this.stoppedAt = Date.now();
    this.stopProposal = null;
    this.betProposal = null;
  }

  toPublicState(viewerId: string): PublicRoomState {
    const revealAll = this.phase === "round_end" || this.phase === "stopped";
    const players: PublicPlayerInfo[] = this.players.map((p) => {
      const value = p.hand.length > 0 ? calculateHandValue(p.hand) : undefined;
      const isViewer = p.id === viewerId;
      const canSeeRealStatus = isViewer || revealAll;
      // Voor de tegenstander mag "bust" of "blackjack" er vóór de reveal niet anders uitzien dan
      // een gewone "stood" - anders verklap je via de status alleen al wie er gewonnen heeft
      // terwijl de ander nog aan het spelen is (bv. "mijn tegenstander is al bust, ik hoef niet
      // meer te riskeren"). Je eigen status blijft wel altijd je eigen echte status.
      const status: PlayerStatus = canSeeRealStatus
        ? p.status
        : p.status === "bust" || p.status === "blackjack"
          ? "stood"
          : p.status;
      return {
        id: p.id,
        name: p.name,
        connected: p.connected,
        balance: p.balance,
        status,
        cardCount: p.hand.length,
        doubledDown: p.doubledDown,
        isBot: p.isBot,
        hand: isViewer || revealAll ? p.hand : undefined,
        value: isViewer || revealAll ? value : undefined,
      };
    });

    return {
      code: this.code,
      phase: this.phase,
      players,
      agreedBet: this.agreedBet,
      betProposal: this.betProposal,
      stopProposal: this.stopProposal,
      deckRemaining: this.deck.remaining,
      deckTotal: this.deck.totalSize,
      justReshuffled: this.justReshuffled,
      roundNumber: this.roundNumber,
      history: this.history,
      yourPlayerId: viewerId,
    };
  }

  toSettlement() {
    return {
      roomCode: this.code,
      endedAt: this.stoppedAt ?? Date.now(),
      roundsPlayed: this.history.length,
      history: this.history,
      players: this.players.map((p) => ({ id: p.id, name: p.name, email: p.email, balance: p.balance })),
    };
  }
}

export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function generateId(): string {
  return randomUUID();
}
