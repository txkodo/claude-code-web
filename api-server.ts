// api-server.ts - 独立したAPIサーバー
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { SessionManager } from "./src/lib/domain";
import { SessionManagerImpl } from "./src/lib/services/sessionManager";
import { z } from 'zod';
import { sValidator } from '@hono/standard-validator'
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun'
import { RealSessionHandlerFactory } from './src/lib/services/realSessionHandler';
import { ClaudeCodingAgentFactory } from './src/lib/services/claudeCodingAgent';

const sessionManager: SessionManager = new SessionManagerImpl(new RealSessionHandlerFactory(new ClaudeCodingAgentFactory()));

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()

// API定義
const router = new Hono()
    .post('/session',
        sValidator("json", z.object({ cwd: z.string() })),
        async (c) => {
            const id = await sessionManager.createSession(c.req.valid('json').cwd);
            return c.json({ sessionId: id });
        })
    .get('/session', async (c) => {
        const sessions = await sessionManager.listSessions();
        return c.json({ sessionIds: sessions });
    })
    .get('/session/:id/ws',
        upgradeWebSocket((c) => {
            const handler = sessionManager.getSessionById(c.req.param('id'));
            let unsubscribe: (() => void) | undefined = undefined;
            return {
                onOpen(evt, ws) {
                    console.log('Connection opened', evt);
                    unsubscribe = handler?.listenEvent(event => { ws.send(JSON.stringify(event)); })?.unsubscribe;
                },
                onMessage(event, ws) {
                    handler?.pushMessage(JSON.parse(event.data.toString()))
                },
                onClose: () => {
                    unsubscribe?.();
                    console.log('Connection closed')
                },
            }
        })
    );

const app = new Hono()
    .use('*', cors({
        origin: ['http://localhost:5173', 'http://localhost:4173'], // Viteのデフォルトポート
        credentials: true,
    }))
    .route('/api', router);

const port = process.env.API_PORT || 3002;

export default {
    port: port,
    fetch: app.fetch,
    websocket,
};


console.log(`🚀 API Server running on http://localhost:${port}`);