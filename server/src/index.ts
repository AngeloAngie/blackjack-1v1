import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { RoomManager } from "./rooms.js";
import { registerSocketHandlers } from "./socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
// In productie draait de client vanaf hetzelfde domein als de server (zie onder), dus een vaste
// CLIENT_ORIGIN is alleen nodig als je de frontend apart hostet. In development staat elke
// localhost-poort toe, zodat Vite's automatische poortkeuze nooit CORS blokkeert.
const corsOrigin = isProduction ? process.env.CLIENT_ORIGIN ?? true : true;

const app = express();
app.use(cors({ origin: corsOrigin }));
app.get("/health", (_req, res) => res.json({ ok: true }));

if (isProduction) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigin },
});

const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager);

httpServer.listen(PORT, () => {
  console.log(`Blackjack server draait op poort ${PORT} (${isProduction ? "production" : "development"})`);
});
