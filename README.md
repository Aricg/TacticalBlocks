# TacticalBlocks

Top-down 2D tactical simulation split into client and server workspaces.

## Structure

```
TacticalBlocks/
  ├── client/   # Phaser + Vite frontend
  └── server/   # Node.js backend scaffold (Colyseus-ready)
```

## Client

```bash
cd /Users/agardner/Github/TacticalBlocks/client
npm install
npm run dev
```

By default, the client connects to `ws://localhost:2567`.

To override it, set one of these Vite env vars:
- `VITE_SERVER_ENDPOINT` (full websocket URL, for example `ws://192.168.88.237:2567`)
- `VITE_SERVER_HOST` (host/IP only, defaults to `localhost`)
- `VITE_SERVER_PORT` (optional port, defaults to `2567`)
- `VITE_MAP_IMAGE_BASE_URL` (optional map image base URL override)

### Runtime map image loading

Map textures are loaded at runtime instead of build-hashed `dist/assets/*` URLs.
This allows generated maps (for example `random-frontier-01-16c.png`) to update
without rebuilding the client bundle.

Default runtime map URL base:
- Local dev / preview root (`/`): `/maps`
- TacticalBlocks reverse-proxy path (`/tacticalblocks/...`): `/tacticalblocks/maps`

Optional override:

```bash
VITE_MAP_IMAGE_BASE_URL=/custom/maps npm run dev
```

The client Vite config serves `shared/*-16c.png` at both
`/maps/*-16c.png` and `/tacticalblocks/maps/*-16c.png` in both
`npm run dev` and `npm run preview`.

Example for LAN testing from another machine:

```bash
cd /Users/agardner/Github/TacticalBlocks/client
VITE_SERVER_HOST=192.168.88.237 npm run dev -- --host 0.0.0.0 --port 5173
```

## Server

```bash
cd /Users/agardner/Github/TacticalBlocks/server
npm install
npm run dev
```
