import http from "node:http";
import next from "next";
import { attachWatchPartySocket } from "./src/lib/websocket/server.js";

const dev = !process.argv.includes("--production");
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();
const server = http.createServer((request, response) => handle(request, response));
attachWatchPartySocket(server);
server.listen(port, hostname, () => console.info(`Cinemora listening on http://${hostname}:${port}`));
