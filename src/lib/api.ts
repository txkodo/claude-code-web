// https://qiita.com/Kanahiro/items/b109d944f09afd02e57f

import { Hono } from 'hono';
import type { SessionManager } from "./domain";
import { SessionManagerImpl } from "./services/sessionManager";
import { z } from 'zod';
import { sValidator } from '@hono/standard-validator'
import { createBunWebSocket } from 'hono/bun';
import type { ServerWebSocket } from 'bun'
import { RealSessionHandlerFactory } from './services/realSessionHandler';
import { ClaudeCodingAgentFactory } from './services/claudeCodingAgent';

export const sessionManager: SessionManager = new SessionManagerImpl(new RealSessionHandlerFactory(new ClaudeCodingAgentFactory()));

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
    .get('/session/[id]/ws',
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

export const app = new Hono().route('/api', router);

export type Router = typeof router;
