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

    // Re-fetches the room state using the stored rejoin token. Safe to call even when we
    // *think* we're still connected: it's a cheap, idempotent no-op on the server if nothing
    // actually changed, but it's the only way to recover when a message was missed without an
    // explicit disconnect/connect cycle (e.g. a backgrounded tab's long-poll got throttled by
    // the browser and silently stopped delivering events for a while).
    function resync() {
      const stored = loadSession();
      if (!stored) return;
      set({ rejoining: true });
      socket.emit(
        ClientEvents.JoinRoom,
        { code: stored.code, name: stored.name, email: stored.email, rejoinToken: stored.rejoinToken },
        (ack: JoinAck) => {
          set({ rejoining: false });
          if (!ack.ok) {
            // Als de kamer niet meer bestaat (bv. opgeruimd na het stoppen, of de server is
            // herstart) mag de speler niet vastzitten op de laatst bekende, inmiddels foute
            // staat - zonder dit bleef iemand die even de verbinding kwijt was voor altijd op
            // een bevroren scherm hangen terwijl de ander allang verder was.
            clearSession();
            set({ roomState: null, settlement: null, error: "Je sessie is verlopen of de kamer bestaat niet meer." });
          }
        },
      );
    }

    // Socket.io's 'connect' event fires on the first connection AND on every automatic
    // reconnect (server restart, dropped wifi, phone backgrounding, ...). Re-attempting the
    // stored rejoin here - not just once at startup - means a dropped connection recovers the
    // room on its own instead of leaving the player stuck on stale state until they refresh.
    socket.on("connect", () => {
      set({ connected: true });
      resync();
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

    // A tab that was backgrounded (phone locked, switched to another app/tab) can have its
    // connection silently stall without ever firing 'disconnect' - the browser just stops
    // waking it up to process incoming data. Re-syncing whenever the tab becomes visible again
    // catches that case too, so "the other player's stop/action never showed up" resolves
    // itself the moment they look back at the screen, no manual refresh needed.
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          resync();
        }
      });
    }
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
