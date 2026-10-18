// Socket.io event names, gedeeld tussen client en server zodat ze nooit uit sync raken.

export const ClientEvents = {
  CreateRoom: "room:create",
  JoinRoom: "room:join",
  ProposeBet: "bet:propose",
  RespondBet: "bet:respond",
  Hit: "action:hit",
  Stand: "action:stand",
  DoubleDown: "action:double",
  ProposeStop: "stop:propose",
  RespondStop: "stop:respond",
  ForceStop: "stop:force",
  ContinueToNextRound: "round:continue",
} as const;

export const ServerEvents = {
  RoomState: "room:state",
  Error: "room:error",
  Settlement: "session:settlement",
} as const;

export interface CreateRoomPayload {
  name: string;
  email: string;
  numDecks?: number;
}

export interface JoinRoomPayload {
  code: string;
  name: string;
  email: string;
  rejoinToken?: string;
}

export interface ProposeBetPayload {
  amount: number;
}

export interface RespondBetPayload {
  accept: boolean;
  counterAmount?: number;
}

export interface RespondStopPayload {
  accept: boolean;
}

export interface ServerErrorPayload {
  message: string;
}

export interface RoomCreatedPayload {
  code: string;
  playerId: string;
  rejoinToken: string;
}
