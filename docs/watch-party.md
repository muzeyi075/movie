# Watch Party

## Local development

1. Copy the Watch Party variables from `.env.example` into `.env.local` and keep the existing MongoDB and Firebase values configured.
2. Start MongoDB. Redis is optional for one process and required for synchronized rooms across multiple app instances.
3. Run `npm run dev`. The custom `server.mjs` starts Next.js and Socket.IO on the same port.
4. Open `/watch-parties`, create a room, and share `/watch-party/<ROOM_ID>`.

Authenticated Firebase users can create and join rooms. Premium movie access is checked against the stored user subscription on the server.

## Runtime design

MongoDB stores `WatchParty` and `WatchPartyMessage` documents. Chat loads the newest 100 records and supports older pages with `?before=<ISO_DATE>`. Playback state is held in process memory for low-latency sync and important play, pause, and seek state is persisted without writing every time update.

Set `REDIS_URL` in a multi-instance deployment. The Socket.IO Redis adapter forwards room events across instances. Use sticky WebSocket routing at the load balancer and terminate TLS before the app server.

Rooms expire after `WATCH_PARTY_EXPIRY_MINUTES` without activity. The host can end a room, and a disconnect transfers host ownership to the longest-connected remaining participant. Private rooms are excluded from discovery and require the invitation room URL before the join endpoint accepts them.

## Production

Build with `npm run build`, then run `npm start`. Set a strong `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, MongoDB credentials, Firebase Admin credentials, and Redis credentials through the deployment secret manager. Never commit `.env` files, Firebase private keys, wallet seeds, or Redis URLs.

For 100+ viewers per room, use Redis, a managed MongoDB deployment, WebSocket-aware load balancing, and metrics around connection count, rejected events, chat rate limits, room expiry, and host transfers. The server validates room membership, host playback permissions, message size, allowed reactions, event rates, and movie premium access.
