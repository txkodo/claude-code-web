import type { SessionHandler, SessionHandlerFactory, SessionManager } from "$lib/server/domain";

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

