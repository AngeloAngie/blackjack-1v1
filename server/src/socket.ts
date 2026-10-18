import type { Server, Socket } from "socket.io";
import {
  ClientEvents,
  ServerEvents,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type ProposeBetPayload,
  type RespondBetPayload,
  type RespondStopPayload,
} from "@blackjack/shared";
import { GameRoom, generateId } from "./game.js";
import { RoomManager } from "./rooms.js";
import { sendSettlementEmails } from "./email.js";

const RECONNECT_GRACE_MS = 5 * 60 * 1000;
const ROOM_CLEANUP_DELAY_MS = 2 * 60 * 1000;

interface AppSocketData {
  code?: string;
  playerId?: string;
}

type AppServer = Server<any, any, any, AppSocketData>;
type AppSocket = Socket<any, any, any, AppSocketData>;

type Ack = (response: { ok: true; code: string; playerId: string; rejoinToken: string } | { ok: false; error: string }) => void;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function registerSocketHandlers(io: AppServer, roomManager: RoomManager): void {
  const disconnectTimers = new Map<string, NodeJS.Timeout>();

  function broadcastState(room: GameRoom): void {
    for (const { playerId, socketId } of room.getConnectedSockets()) {
      if (socketId) {
        io.to(socketId).emit(ServerEvents.RoomState, room.toPublicState(playerId));
      }
    }
  }

  async function finalizeSettlement(room: GameRoom): Promise<void> {
    const settlement = room.toSettlement();
    for (const { socketId } of room.getConnectedSockets()) {
      if (socketId) io.to(socketId).emit(ServerEvents.Settlement, settlement);
    }
    try {
      await sendSettlementEmails(settlement);
    } catch (err) {
      console.error(`Versturen van afrekeningsmail voor kamer ${room.code} is mislukt:`, err);
    }
    setTimeout(() => roomManager.removeRoom(room.code), ROOM_CLEANUP_DELAY_MS);
  }

  function withRoom(
    socket: AppSocket,
    fn: (room: GameRoom, playerId: string) => void,
  ): void {
    const { code, playerId } = socket.data;
    if (!code || !playerId) {
      socket.emit(ServerEvents.Error, { message: "Je bent niet verbonden met een kamer" });
      return;
    }
    const room = roomManager.getRoom(code);
    if (!room) {
      socket.emit(ServerEvents.Error, { message: "Deze kamer bestaat niet meer" });
      return;
    }
    const wasStopped = room.phase === "stopped";
    try {
      fn(room, playerId);
    } catch (err) {
      socket.emit(ServerEvents.Error, { message: err instanceof Error ? err.message : "Onbekende fout" });
      return;
    }
    broadcastState(room);
    if (!wasStopped && room.phase === "stopped") {
      void finalizeSettlement(room);
    }
  }

  io.on("connection", (socket: AppSocket) => {
    socket.on(ClientEvents.CreateRoom, (payload: CreateRoomPayload, ack: Ack) => {
      if (!isNonEmptyString(payload?.name) || !isValidEmail(payload?.email)) {
        ack({ ok: false, error: "Vul een geldige naam en e-mailadres in" });
        return;
      }
      const room = roomManager.createRoom(payload.numDecks);
      const playerId = generateId();
      const rejoinToken = generateId();
      room.addPlayer({ id: playerId, name: payload.name.trim(), email: payload.email.trim(), rejoinToken });
      room.setSocket(playerId, socket.id, true);
      socket.join(room.code);
      socket.data.code = room.code;
      socket.data.playerId = playerId;
      ack({ ok: true, code: room.code, playerId, rejoinToken });
      broadcastState(room);
    });

    socket.on(ClientEvents.JoinRoom, (payload: JoinRoomPayload, ack: Ack) => {
      const code = (payload?.code ?? "").toUpperCase().trim();
      const room = roomManager.getRoom(code);
      if (!room) {
        ack({ ok: false, error: "Kamer niet gevonden" });
        return;
      }

      if (isNonEmptyString(payload.rejoinToken)) {
        const existing = room.findByRejoinToken(payload.rejoinToken);
        if (existing) {
          const key = `${code}:${existing.id}`;
          const timer = disconnectTimers.get(key);
          if (timer) {
            clearTimeout(timer);
            disconnectTimers.delete(key);
          }
          // Een eerdere, nog open verbinding (bv. een vergeten oud tabblad) mag niet stiekem
          // acties kunnen blijven sturen nadat deze nieuwe verbinding het spelerslot overneemt.
          const previousSocketId = room.getPlayer(existing.id)?.socketId;
          if (previousSocketId && previousSocketId !== socket.id) {
            io.sockets.sockets.get(previousSocketId)?.disconnect(true);
          }
          room.setSocket(existing.id, socket.id, true);
          socket.join(code);
          socket.data.code = code;
          socket.data.playerId = existing.id;
          ack({ ok: true, code, playerId: existing.id, rejoinToken: existing.rejoinToken });
          broadcastState(room);
          return;
        }
      }

      if (room.isFull) {
        ack({ ok: false, error: "Deze kamer is al vol" });
        return;
      }
      if (!isNonEmptyString(payload?.name) || !isValidEmail(payload?.email)) {
        ack({ ok: false, error: "Vul een geldige naam en e-mailadres in" });
        return;
      }
      const playerId = generateId();
      const rejoinToken = generateId();
      room.addPlayer({ id: playerId, name: payload.name.trim(), email: payload.email.trim(), rejoinToken });
      room.setSocket(playerId, socket.id, true);
      socket.join(code);
      socket.data.code = code;
      socket.data.playerId = playerId;
      ack({ ok: true, code, playerId, rejoinToken });
      broadcastState(room);
    });

    socket.on(ClientEvents.ProposeBet, (payload: ProposeBetPayload) => {
      withRoom(socket, (room, playerId) => room.proposeBet(playerId, payload.amount));
    });

    socket.on(ClientEvents.RespondBet, (payload: RespondBetPayload) => {
      withRoom(socket, (room, playerId) => room.respondBet(playerId, payload.accept, payload.counterAmount));
    });

    socket.on(ClientEvents.Hit, () => {
      withRoom(socket, (room, playerId) => room.hit(playerId));
    });

    socket.on(ClientEvents.Stand, () => {
      withRoom(socket, (room, playerId) => room.stand(playerId));
    });

    socket.on(ClientEvents.DoubleDown, () => {
      withRoom(socket, (room, playerId) => room.doubleDown(playerId));
    });

    socket.on(ClientEvents.ContinueToNextRound, () => {
      withRoom(socket, (room) => room.startNextRound());
    });

    socket.on(ClientEvents.ProposeStop, () => {
      withRoom(socket, (room, playerId) => room.proposeStop(playerId));
    });

    socket.on(ClientEvents.RespondStop, (payload: RespondStopPayload) => {
      withRoom(socket, (room, playerId) => room.respondStop(playerId, payload.accept));
    });

    socket.on(ClientEvents.ForceStop, () => {
      withRoom(socket, (room) => room.forceStop());
    });

    socket.on("disconnect", () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId) return;
      const room = roomManager.getRoom(code);
      if (!room) return;

      // Als deze speler inmiddels via een nieuwere verbinding is gereconnect, is dit een
      // verouderde socket die niets meer mag wijzigen aan de (al actuele) verbindingsstatus.
      const player = room.getPlayer(playerId);
      if (!player || player.socketId !== socket.id) return;

      room.setSocket(playerId, null, false);
      broadcastState(room);

      const key = `${code}:${playerId}`;
      const timer = setTimeout(() => {
        disconnectTimers.delete(key);
        const stillRoom = roomManager.getRoom(code);
        if (!stillRoom) return;
        const player = stillRoom.getPlayer(playerId);
        if (!player || player.connected) return;

        if (stillRoom.phase === "waiting") {
          roomManager.removeRoom(code);
          return;
        }
        if (stillRoom.phase !== "stopped") {
          stillRoom.forceStop();
          broadcastState(stillRoom);
          void finalizeSettlement(stillRoom);
        }
      }, RECONNECT_GRACE_MS);
      disconnectTimers.set(key, timer);
    });
  });
}
