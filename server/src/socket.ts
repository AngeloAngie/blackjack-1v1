import type { Server, Socket } from "socket.io";
import {
  ClientEvents,
  ServerEvents,
  type CreateRoomPayload,
  type FinalSettlement,
  type JoinRoomPayload,
  type ProposeBetPayload,
  type RespondBetPayload,
  type RespondStopPayload,
} from "@blackjack/shared";
import { GameRoom, generateId } from "./game.js";
import { RoomManager } from "./rooms.js";
import { sendSettlementEmails } from "./email.js";
import { generateSettlementPdf } from "./pdf.js";
import { scheduleBotTurn } from "./bot.js";

const RECONNECT_GRACE_MS = 5 * 60 * 1000;
const ROOM_CLEANUP_DELAY_MS = 2 * 60 * 1000;

interface AppSocketData {
  code?: string;
  playerId?: string;
}

type AppServer = Server<any, any, any, AppSocketData>;
type AppSocket = Socket<any, any, any, AppSocketData>;

type Ack = (response: { ok: true; code: string; playerId: string; rejoinToken: string } | { ok: false; error: string }) => void;

const MAX_NAME_LENGTH = 40;

// Begrenst ook de lengte, niet alleen "niet leeg": zonder dit kon een speler een naam van
// megabytes sturen die vervolgens in elke state-broadcast, e-mail en PDF terechtkwam.
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_NAME_LENGTH;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const MAX_DECKS = 8;

// payload.numDecks komt rechtstreeks van de client - zonder deze check kon 0 of een negatief
// getal het deck voorgoed leeg laten (elke ronde crasht daarna), en een absurd hoog getal
// onnodig veel geheugen/CPU kosten. De server mag de client hier nooit op zijn woord geloven.
function sanitizeNumDecks(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) return 1;
  return Math.min(value, MAX_DECKS);
}

export function registerSocketHandlers(io: AppServer, roomManager: RoomManager): void {
  const disconnectTimers = new Map<string, NodeJS.Timeout>();
  // De Settlement-gebeurtenis (incl. PDF) wordt maar één keer uitgezonden, op het moment dat de
  // sessie stopt. Een speler die op dat exacte moment offline was (haperende verbinding, tabblad
  // op de achtergrond) zou 'm anders voorgoed missen en vast blijven zitten op een leeg scherm
  // zonder afrekening. Door 'm hier te cachen kan een latere herverbinding 'm alsnog krijgen.
  const settlementCache = new Map<string, FinalSettlement>();

  function broadcastState(room: GameRoom): void {
    for (const { playerId, socketId } of room.getConnectedSockets()) {
      if (socketId) {
        io.to(socketId).emit(ServerEvents.RoomState, room.toPublicState(playerId));
      }
    }
  }

  async function finalizeSettlement(room: GameRoom): Promise<void> {
    const settlement = room.toSettlement();
    // De PDF gaat altijd mee in het socket-event, ongeacht of de e-mail straks lukt - zo kan
    // iedereen de afrekening downloaden, ook als het e-mailen faalt of nog niet is ingesteld.
    const pdfBuffer = await generateSettlementPdf(settlement);
    const settlementWithPdf: FinalSettlement = { ...settlement, pdfBase64: pdfBuffer.toString("base64") };
    settlementCache.set(room.code, settlementWithPdf);
    for (const { socketId } of room.getConnectedSockets()) {
      if (socketId) io.to(socketId).emit(ServerEvents.Settlement, settlementWithPdf);
    }
    // Een potje tegen de computer heeft geen tweede e-mailadres om naar te mailen.
    if (!room.hasBot) {
      try {
        await sendSettlementEmails(settlement);
      } catch (err) {
        const sgBody = (err as { response?: { body?: unknown } })?.response?.body;
        console.error(
          `Versturen van afrekeningsmail voor kamer ${room.code} is mislukt:`,
          err instanceof Error ? err.message : err,
          sgBody ? `SendGrid response body: ${JSON.stringify(sgBody)}` : "",
        );
      }
    }
    setTimeout(() => {
      roomManager.removeRoom(room.code);
      settlementCache.delete(room.code);
    }, ROOM_CLEANUP_DELAY_MS);
  }

  /**
   * Voert `mutate` uit op de room, zendt de nieuwe staat uit, handelt het eventueel
   * stoppen van de sessie af, en laat daarna de computerspeler (indien aanwezig)
   * checken of hij iets moet doen (bieden beantwoorden, hitten/standen, stoppen
   * accepteren). Dit is het enige punt waar elke wijziging - van een mens of van de
   * bot zelf - doorheen loopt, zodat state-uitzending en afrekening nooit vergeten
   * worden, voor beide soorten acties.
   */
  function applyRoomChange(room: GameRoom, mutate: () => void): void {
    const wasStopped = room.phase === "stopped";
    mutate();
    broadcastState(room);
    if (!wasStopped && room.phase === "stopped") {
      // Zonder .catch() crasht een falende promise hier de hele Node-server (onafgehandelde
      // rejection) - en dan raken BEIDE spelers alsnog vast, zonder dat er ook maar een
      // foutmelding verstuurd is. Loggen en doorgaan is hier de enige veilige optie.
      finalizeSettlement(room).catch((err) => {
        console.error(`Afronden van sessie in kamer ${room.code} is onverwacht mislukt:`, err);
      });
    }
    scheduleBotTurn(room, (botMutate) => {
      try {
        applyRoomChange(room, botMutate);
      } catch (err) {
        console.error(`Bot-actie mislukt in kamer ${room.code}:`, err);
      }
    });
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
    try {
      applyRoomChange(room, () => fn(room, playerId));
    } catch (err) {
      socket.emit(ServerEvents.Error, { message: err instanceof Error ? err.message : "Onbekende fout" });
    }
  }

  io.on("connection", (socket: AppSocket) => {
    socket.on(ClientEvents.CreateRoom, (payload: CreateRoomPayload, ack: Ack) => {
      const vsComputer = payload?.vsComputer === true;
      if (!isNonEmptyString(payload?.name) || (!vsComputer && !isValidEmail(payload?.email))) {
        ack({ ok: false, error: "Vul een geldige naam en e-mailadres in" });
        return;
      }
      const room = roomManager.createRoom(sanitizeNumDecks(payload?.numDecks));
      const playerId = generateId();
      const rejoinToken = generateId();
      room.addPlayer({
        id: playerId,
        name: payload.name.trim(),
        email: vsComputer ? "" : payload.email.trim(),
        rejoinToken,
      });
      room.setSocket(playerId, socket.id, true);
      if (vsComputer) room.addBot();
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
          // Was de sessie al gestopt vóórdat deze speler terugkwam (bv. net offline op het moment
          // van stoppen), dan heeft die de eenmalige Settlement-uitzending gemist. Zonder dit bleef
          // iemand voor altijd op een leeg bord hangen zonder afrekening of PDF te kunnen zien.
          if (room.phase === "stopped") {
            const cached = settlementCache.get(code);
            if (cached) socket.emit(ServerEvents.Settlement, cached);
          }
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
          finalizeSettlement(stillRoom).catch((err) => {
            console.error(`Afronden van sessie in kamer ${stillRoom.code} is onverwacht mislukt:`, err);
          });
        }
      }, RECONNECT_GRACE_MS);
      disconnectTimers.set(key, timer);
    });
  });
}
