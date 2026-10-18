import { GameRoom, generateRoomCode } from "./game.js";

const DEFAULT_NUM_DECKS = 1;

export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  createRoom(numDecks: number = DEFAULT_NUM_DECKS): GameRoom {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }
    const room = new GameRoom(code, { numDecks });
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  removeRoom(code: string): void {
    this.rooms.delete(code.toUpperCase());
  }
}
