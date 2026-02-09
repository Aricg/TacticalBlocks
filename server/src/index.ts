import http from "node:http";
import { Server } from "colyseus";
import { Encoder } from "@colyseus/schema";
import { BattleRoom } from "./rooms/BattleRoom.js";

const PORT = Number(process.env.PORT ?? 2567);
Encoder.BUFFER_SIZE = 32 * 1024;

const server = http.createServer();
const gameServer = new Server({ server });

gameServer.define("battle", BattleRoom);

gameServer.listen(PORT);
console.log(`Colyseus listening on ws://localhost:${PORT}`);
