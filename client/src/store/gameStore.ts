import { create } from "zustand";
import {
  ClientEvents,
  ServerEvents,
  type FinalSettlement,
  type PublicRoomState,
} from "@blackjack/shared";
import { getSocket } from "../lib/socket";
import { clearSession, loadSession, saveSession } from "../lib/storage";

type JoinAck = { ok: true; code: string; playerId: string; rejoinToken: string } | { ok: false; error: string };

interface GameStoreState {
  initialized: boolean;
  connected: boolean;
  rejoining: boolean;
  roomState: PublicRoomState | null;
  settlement: FinalSettlement | null;
  error: string | null;

  init: () => void;
  createRoom: (name: string, email: string, numDecks?: number) => Promise<string | null>;
  createSoloRoom: (name: string) => Promise<string | null>;
  joinRoom: (code: string, name: string, email: string) => Promise<string | null>;
  proposeBet: (amount: number) => void;
  respondBet: (accept: boolean, counterAmount?: number) => void;
  hit: () => void;
  stand: () => void;
  doubleDown: () => void;
  continueRound: () => void;
  proposeStop: () => void;
  respondStop: (accept: boolean) => void;
  forceStop: () => void;
  clearError: () => void;
  resetToLobby: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  initialized: false,
  connected: false,
  rejoining: false,
  roomState: null,
  settlement: null,
  error: null,

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });
    const socket = getSocket();

    // Socket.io's 'connect' event fires on the first connection AND on every automatic
    // reconnect (server restart, dropped wifi, phone backgrounding, ...). Re-attempting the
    // stored rejoin here - not just once at startup - means a dropped connection recovers the
    // room on its own instead of leaving the player stuck on stale state until they refresh.
    socket.on("connect", () => {
      set({ connected: true });
      const stored = loadSession();
      if (stored) {
        set({ rejoining: true });
        socket.emit(
          ClientEvents.JoinRoom,
          { code: stored.code, name: stored.name, email: stored.email, rejoinToken: stored.rejoinToken },
          (ack: JoinAck) => {
            set({ rejoining: false });
            if (!ack.ok) {
              clearSession();
            }
          },
        );
      }
    });
    socket.on("disconnect", () => {
      set({ connected: false });
    });
    socket.on(ServerEvents.RoomState, (state: PublicRoomState) => {
      set({ roomState: state });
    });
    socket.on(ServerEvents.Error, (payload: { message: string }) => {
      set({ error: payload.message });
    });
    socket.on(ServerEvents.Settlement, (settlement: FinalSettlement) => {
      set({ settlement });
      clearSession();
    });
  },

  createRoom: (name, email, numDecks) =>
    new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(ClientEvents.CreateRoom, { name, email, numDecks }, (ack: JoinAck) => {
        if (ack.ok) {
          saveSession({ code: ack.code, playerId: ack.playerId, rejoinToken: ack.rejoinToken, name, email });
          set({ error: null });
          resolve(ack.code);
        } else {
          set({ error: ack.error });
          resolve(null);
        }
      });
    }),

  createSoloRoom: (name) =>
    new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(ClientEvents.CreateRoom, { name, email: "", vsComputer: true }, (ack: JoinAck) => {
        if (ack.ok) {
          saveSession({ code: ack.code, playerId: ack.playerId, rejoinToken: ack.rejoinToken, name, email: "" });
          set({ error: null });
          resolve(ack.code);
        } else {
          set({ error: ack.error });
          resolve(null);
        }
      });
    }),

  joinRoom: (code, name, email) =>
    new Promise((resolve) => {
      const socket = getSocket();
      socket.emit(ClientEvents.JoinRoom, { code, name, email }, (ack: JoinAck) => {
        if (ack.ok) {
          saveSession({ code: ack.code, playerId: ack.playerId, rejoinToken: ack.rejoinToken, name, email });
          set({ error: null });
          resolve(ack.code);
        } else {
          set({ error: ack.error });
          resolve(null);
        }
      });
    }),

  proposeBet: (amount) => getSocket().emit(ClientEvents.ProposeBet, { amount }),
  respondBet: (accept, counterAmount) => getSocket().emit(ClientEvents.RespondBet, { accept, counterAmount }),
  hit: () => getSocket().emit(ClientEvents.Hit),
  stand: () => getSocket().emit(ClientEvents.Stand),
  doubleDown: () => getSocket().emit(ClientEvents.DoubleDown),
  continueRound: () => getSocket().emit(ClientEvents.ContinueToNextRound),
  proposeStop: () => getSocket().emit(ClientEvents.ProposeStop),
  respondStop: (accept) => getSocket().emit(ClientEvents.RespondStop, { accept }),
  forceStop: () => getSocket().emit(ClientEvents.ForceStop),
  clearError: () => set({ error: null }),
  resetToLobby: () => {
    clearSession();
    set({ roomState: null, settlement: null, error: null });
  },
}));
