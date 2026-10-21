export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface HandValue {
  total: number;
  /** true when an ace is still being counted as 11 */
  soft: boolean;
  isBlackjack: boolean;
  isBust: boolean;
}

export type PlayerStatus = "waiting" | "playing" | "stood" | "bust" | "blackjack";

export type RoomPhase = "waiting" | "betting" | "playing" | "round_end" | "stopped";

export interface RoundHistoryEntry {
  roundNumber: number;
  bet: number;
  multiplier: 1 | 2;
  playerAHand: Card[];
  playerBHand: Card[];
  playerAValue: HandValue;
  playerBValue: HandValue;
  playerADoubled: boolean;
  playerBDoubled: boolean;
  winnerId: string | null;
  timestamp: number;
}

export interface PublicPlayerInfo {
  id: string;
  name: string;
  connected: boolean;
  balance: number;
  status: PlayerStatus;
  cardCount: number;
  /** only populated for the viewing player, or for both once round_end is reached */
  hand?: Card[];
  value?: HandValue;
  doubledDown: boolean;
  isBot: boolean;
}

export interface BetProposal {
  byPlayerId: string;
  amount: number;
}

export interface StopProposal {
  byPlayerId: string;
}

export interface PublicRoomState {
  code: string;
  phase: RoomPhase;
  players: PublicPlayerInfo[];
  agreedBet: number | null;
  betProposal: BetProposal | null;
  stopProposal: StopProposal | null;
  deckRemaining: number;
  deckTotal: number;
  justReshuffled: boolean;
  roundNumber: number;
  history: RoundHistoryEntry[];
  yourPlayerId: string;
}

export interface SettlementData {
  roomCode: string;
  endedAt: number;
  roundsPlayed: number;
  history: RoundHistoryEntry[];
  players: {
    id: string;
    name: string;
    email: string;
    balance: number;
  }[];
}

export interface FinalSettlement extends SettlementData {
  /** Base64-gecodeerde PDF van de afrekening, zodat downloaden altijd werkt, ook als de e-mail faalt. */
  pdfBase64: string;
}
