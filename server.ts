import http from 'node:http';
import { WebSocketServer } from 'ws';
import { RpcTarget, newWebSocketRpcSession, nodeHttpBatchRpcResponse, RpcStub } from 'capnweb';

import { CounterServer } from './types.js';

class LiveCounter extends RpcTarget implements CounterServer {
    private count = 0;
    private callbacks: Array<RpcStub<(count: number) => void>> = [];

    async get() {
        return this.count;
    }

    async increment() {
        this.count++;
        console.log('[SERVER] Increment', this.count);
        this.notify();
    }

    async notify() {
        for(const callback of this.callbacks) {
            try {
                console.log('[SERVER] Notifying client', this.count);
                await callback(this.count);
            } catch (err) {
                console.error('[SERVER] Error notifying client', err);
            }
        }
    }

    async subscribe(callback: RpcStub<(count: number) => void>) {
        this.callbacks.push(callback.dup());
    }
}

// Create HTTP server
const httpServer = http.createServer(async (request, response) => {
    if (request.headers.upgrade?.toLowerCase() === 'websocket') {
        // Ignore, should be handled by WebSocketServer instead.
        return;
    }

    // Accept Cap'n Web requests at `/api`.
    if (request.url === "/api") {
        try {
            await nodeHttpBatchRpcResponse(request, response, new LiveCounter(), {
                // If you are accepting WebSockets, then you might as well accept cross-origin HTTP, since
                // WebSockets always permit cross-origin request anyway.
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        } catch (err) {
            response.writeHead(500, { 'content-type': 'text/plain' });
            response.end(String((err as Error)?.stack || err));
        }
        return;
    }

    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end("Not Found");
});

// Set up WebSocket server for Cap'n Web
const wsServer = new WebSocketServer({ server: httpServer });
wsServer.on('connection', (ws) => {
    console.log('[SERVER] New WebSocket connection');
    // The `as any` here is because the `ws` module seems to have its own `WebSocket` type
    // declaration that's incompatible with the standard one. In practice, though, they are
    // compatible enough for Cap'n Web!
    newWebSocketRpcSession(ws as any, new LiveCounter());
});

// Start server on port 8080
const PORT = 8080;
httpServer.listen(PORT, () => {
    console.log(`[SERVER] Cap'n Web server listening on port ${PORT}`);
    console.log(`[SERVER] WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`[SERVER] HTTP batch endpoint: http://localhost:${PORT}/api`);
});