// api-server.ts - 独立したAPIサーバー
import { Hono } from 'hono';
import type { SessionManager } from "./domain";
import { SessionManagerImpl } from "./services/sessionManager";
import { z } from 'zod';
import { sValidator } from '@hono/standard-validator'
import { RealSessionHandlerFactory } from './services/realSessionHandler';
import { ClaudeCodingAgentFactory } from './services/claudeCodingAgent';
const sessionManager: SessionManager = new SessionManagerImpl(new RealSessionHandlerFactory(new ClaudeCodingAgentFactory()));

// API定義
const router = new Hono()
    .use(async (x, next) => {
        console.log(`Request: ${x.req.method} ${x.req.path}`);
        await next();
    })
    .post('/session',
        sValidator("json", z.object({ cwd: z.string() })),
        async (c) => {
            const id = await sessionManager.createSession(c.req.valid('json').cwd);
            return c.json({ sessionId: id });
        })
    .get('/session', async (c) => {
        const sessions = await sessionManager.listSessions();
        return c.json({ sessionIds: sessions });
    });

export const app = new Hono().route('/api', router);
export type ApiRouter = typeof router;
