import http from "node:http";
import { Server } from "colyseus";
import { Encoder } from "@colyseus/schema";
import { BattleRoom } from "./rooms/BattleRoom.js";

const PORT = Number(process.env.PORT ?? 2567);
const DEFAULT_SCHEMA_BUFFER_SIZE_BYTES = 128 * 1024;
const configuredSchemaBufferSize = Number.parseInt(
  process.env.TB_SCHEMA_BUFFER_SIZE_BYTES ?? "",
  10,
);
Encoder.BUFFER_SIZE =
  Number.isFinite(configuredSchemaBufferSize) && configuredSchemaBufferSize > 0
    ? configuredSchemaBufferSize
    : DEFAULT_SCHEMA_BUFFER_SIZE_BYTES;

const server = http.createServer();
const gameServer = new Server({ server });

gameServer.define("battle", BattleRoom);

gameServer.listen(PORT);
console.log(`Colyseus listening on ws://localhost:${PORT}`);
console.log(`@colyseus/schema Encoder.BUFFER_SIZE=${Encoder.BUFFER_SIZE}`);
