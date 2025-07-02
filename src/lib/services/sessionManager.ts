import type { SessionHandler, SessionManager } from "$lib/domain";
import { ClaudeSessionHandler } from "./claudeSessionHandler";
import { FakeSessionHandler } from "./fakeSessionHandler";

export interface SessionHandlerFactory {
    createSession(cwd: string, id: string): SessionHandler;
}

export class SessionHandlerFactoryFake implements SessionHandlerFactory {
    createSession(cwd: string, id: string): SessionHandler {
        return new FakeSessionHandler(id, cwd);
    }
}

export class SessionHandlerFactoryClaude implements SessionHandlerFactory {
    createSession(cwd: string, id: string): SessionHandler {
        return new ClaudeSessionHandler(id, cwd);
    }
}

export class SessionManagerImpl implements SessionManager {
    #sessionMap: Map<string, SessionHandler>;
    #sessionHandlerFactory: SessionHandlerFactory;
    constructor(sessionHandlerFactory: SessionHandlerFactory) {
        this.#sessionMap = new Map<string, SessionHandler>();
        this.#sessionHandlerFactory = sessionHandlerFactory;
    }
    createSession(cwd: string): string {
        const sessionId = crypto.randomUUID();
        const sessionHandler = this.#sessionHandlerFactory.createSession(cwd, sessionId);
        this.#sessionMap.set(sessionId, sessionHandler);
        return sessionId;
    }
    getSessionById(sessionId: string): SessionHandler | null {
        return this.#sessionMap.get(sessionId) ?? null;
    }
    listSessions(): string[] {
        return Array.from(this.#sessionMap.keys());
    }
}