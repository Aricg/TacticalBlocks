# TacticalBlocks on fnhl.ca (`/tacticalblocks/`)

This setup avoids PuckDraft port conflicts:
- PuckDraft: `127.0.0.1:5173` (existing)
- TacticalBlocks client: `127.0.0.1:5174`
- TacticalBlocks server (Colyseus): `127.0.0.1:2568`

## 1. Install services

```bash
sudo cp /home/agardner/TacticalBlocks/deployment/tacticalblocks-server.service /etc/systemd/system/
sudo cp /home/agardner/TacticalBlocks/deployment/tacticalblocks-client.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tacticalblocks-server
sudo systemctl enable tacticalblocks-client
sudo systemctl start tacticalblocks-server
sudo systemctl start tacticalblocks-client
```

To stop/play toggle quickly:

```bash
sudo systemctl stop tacticalblocks-client tacticalblocks-server
sudo systemctl start tacticalblocks-server tacticalblocks-client
```

## 2. Nginx update

Copy the location blocks from:

`/home/agardner/TacticalBlocks/deployment/fnhl.ca-tacticalblocks-nginx.conf`

Paste them into your existing `server` block for `fnhl.ca` on port `443`, above your current catch-all:

```nginx
location / {
    proxy_pass http://127.0.0.1:5173;
    ...
}
```

Then reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Verify

- Open: `https://fnhl.ca/tacticalblocks/`
- Check services:

```bash
systemctl status tacticalblocks-server
systemctl status tacticalblocks-client
```

- Check logs:

```bash
journalctl -u tacticalblocks-server -f
journalctl -u tacticalblocks-client -f
```
