import { io, type Socket } from "socket.io-client";

// In productie draait de client vanaf hetzelfde domein als de server (zie server/src/index.ts),
// dus zonder expliciete VITE_SERVER_URL verbinden we automatisch met de huidige origin.
// In development draaien client (Vite) en server op verschillende poorten, dus daar is een
// expliciete fallback naar localhost:3001 nodig.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : undefined);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = SERVER_URL ? io(SERVER_URL, { autoConnect: true }) : io({ autoConnect: true });
  }
  return socket;
}
