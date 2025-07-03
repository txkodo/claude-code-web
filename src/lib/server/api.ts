// api-server.ts - 独立したAPIサーバー
import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { SessionManager } from "./domain";
import { SessionManagerImpl } from "./services/sessionManager";
import { z } from 'zod';
import { sValidator } from '@hono/standard-validator'
import { RealSessionHandlerFactory } from './services/realSessionHandler';
import { ClaudeCodingAgentFactory } from './services/claudeCodingAgent';

const sessionManager: SessionManager = new SessionManagerImpl(new RealSessionHandlerFactory(new ClaudeCodingAgentFactory()));

// WebSocket設定
const { upgradeWebSocket } = createBunWebSocket();

// API定義
export const apiRouter = new Hono()
    .use(async (x, next) => {
        console.log(`Request: ${x.req.method} ${x.req.path}`);
        await next();
    })
    .get('/ws', upgradeWebSocket((c) => {
        return {
            onOpen(evt, ws) {
                const username = `User ${Math.round(Math.random() * 999_999)}`;
                ws.send(JSON.stringify({ type: 'name', data: username }));
                console.log(`WebSocket connection opened for ${username}`);
            },
            onMessage(evt, ws) {
                try {
                    const data = JSON.parse(evt.data.toString());
                    if (data.type === 'message') {
                        console.log(`Message from user: ${data.message}`);
                        ws.send(JSON.stringify({
                            type: 'message',
                            data: {
                                from: 'User',
                                message: data.message,
                                time: new Date().toLocaleString(),
                            }
                        }));
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            },
            onClose(evt, ws) {
                console.log('WebSocket connection closed');
            },
        };
    }))
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

export type ApiRouter = typeof apiRouter;
