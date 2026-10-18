import { calculateHandValue } from "@blackjack/shared";
import { BOT_PLAYER_ID, type GameRoom } from "./game.js";

const MIN_THINK_MS = 600;
const MAX_THINK_MS = 1400;

function thinkDelay(): number {
  return MIN_THINK_MS + Math.random() * (MAX_THINK_MS - MIN_THINK_MS);
}

/**
 * De computer speelt "dealer-stijl": hit zolang de hand onder 17 zit, anders stand.
 * Hij verdubbelt nooit, en accepteert altijd meteen het voorgestelde bedrag en elk
 * verzoek om te stoppen van de menselijke speler - zo blijft de inzet-onderhandeling
 * en stop-flow voor de speler identiek aan een potje tegen een vriend, alleen sneller.
 *
 * `applyChange` moet de meegegeven mutatie uitvoeren op de room, de nieuwe staat
 * uitzenden, en (bij het stoppen van de sessie) de afrekening afhandelen - zie
 * `applyRoomChange` in socket.ts. Na elke bot-actie wordt deze functie opnieuw
 * aangeroepen zodat de keten vanzelf stopt zodra de computer niets meer te doen heeft.
 */
export function scheduleBotTurn(room: GameRoom, applyChange: (mutate: () => void) => void): void {
  if (!room.hasBot) return;
  const bot = room.getPlayer(BOT_PLAYER_ID);
  if (!bot) return;

  if (room.phase === "betting" && room.betProposal && room.betProposal.byPlayerId !== BOT_PLAYER_ID) {
    setTimeout(() => applyChange(() => room.respondBet(BOT_PLAYER_ID, true)), thinkDelay());
    return;
  }

  if (room.phase === "playing" && bot.status === "playing") {
    setTimeout(() => {
      const value = calculateHandValue(bot.hand);
      applyChange(() => (value.total < 17 ? room.hit(BOT_PLAYER_ID) : room.stand(BOT_PLAYER_ID)));
    }, thinkDelay());
    return;
  }

  if (room.stopProposal && room.stopProposal.byPlayerId !== BOT_PLAYER_ID) {
    setTimeout(() => applyChange(() => room.respondStop(BOT_PLAYER_ID, true)), thinkDelay());
  }
}
