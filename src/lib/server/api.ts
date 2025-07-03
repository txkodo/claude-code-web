// api-server.ts - 独立したAPIサーバー
import { Hono } from 'hono';
import { createBunWebSocket } from 'hono/bun';
import type { SessionManager, WsClientMessage, WsServerMessage } from "./domain";
import { SessionManagerImpl } from "./services/sessionManager";
import { z } from 'zod';
import { sValidator } from '@hono/standard-validator'
import { RealSessionHandlerFactory } from './services/realSessionHandler';
import { ClaudeCodingAgentFactory } from './services/claudeCodingAgent';
import type { ServerWebSocket } from 'bun';

const sessionManager: SessionManager = new SessionManagerImpl(new RealSessionHandlerFactory(new ClaudeCodingAgentFactory()));

// WebSocket設定
const { upgradeWebSocket, websocket } = createBunWebSocket();

let sockets = new Set<ServerWebSocket>();

// API定義
export const apiRouter = new Hono()
    .use(async (x, next) => {
        console.log(`Request: ${x.req.method} ${x.req.path}`);
        await next();
    })
    .get('/ws', upgradeWebSocket((c) => {
        return {
            onOpen(evt, ws) {
                const rawWs = ws.raw as ServerWebSocket;
                sockets.add(rawWs);
                const username = `User ${Math.round(Math.random() * 999_999)}`;
                ws.send(JSON.stringify({ type: 'name', data: username }));
                console.log(`WebSocket connection opened for ${username}`);
            },
            async onMessage(evt, ws) {
                const rawWs = ws.raw as ServerWebSocket;
                try {
                    const data = JSON.parse(evt.data.toString()) as WsClientMessage;
                    switch (data.type) {
                        case 'subscribe': {
                            rawWs.subscribe(data.sessionId)
                            break;
                        }
                        case 'unsubscribe': {
                            rawWs.unsubscribe(data.sessionId);
                            break;
                        }
                        case 'chat': {
                            try {
                                const session = sessionManager.getSessionById(data.sessionId);
                                if (session) {
                                    await session.pushMessage({
                                        msgId: crypto.randomUUID(),
                                        content: data.message,
                                    })
                                } else {
                                    console.error(`Session ${data.sessionId} not found`);
                                    ws.send(JSON.stringify({
                                        type: 'error',
                                        sessionId: data.sessionId,
                                        error: 'Session not found'
                                    }));
                                }
                            } catch (error) {
                                console.error('Error processing chat message:', error);
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    sessionId: data.sessionId,
                                    error: error instanceof Error ? error.message : 'Unknown error'
                                }));
                            }
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            },
            onClose(evt, ws) {
                console.log('WebSocket connection closed');
                const rawWs = ws.raw as ServerWebSocket;
                sockets.delete(rawWs);
            },
        };
    }))
    .post('/session',
        sValidator("json", z.object({ cwd: z.string() })),
        async (c) => {
            const id = await sessionManager.createSession(c.req.valid('json').cwd);
            sessionManager.getSessionById(id)?.listenEvent((event, unsubscribe) => {
                sockets.forEach((ws) => {
                    if (ws.isSubscribed(id)) {
                        ws.send(JSON.stringify({ type: 'event', sessionId: id, event: event, } satisfies WsServerMessage));
                    }
                });
            })
            return c.json({ sessionId: id });
        })
    .get('/session', async (c) => {
        const sessions = await sessionManager.listSessions();
        return c.json({ sessionIds: sessions });
    });

export type ApiRouter = typeof apiRouter;
