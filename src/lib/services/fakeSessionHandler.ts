import type { SessionEvent, SessionHandler, SessionHandlerFactory, UserMessage } from "$lib/domain";

export class FakeSessionHandler implements SessionHandler {
    #sessionId: string;
    #cwd: string;
    constructor(private readonly _sessionId: string, private readonly _cwd: string) {
        this.#sessionId = _sessionId;
        this.#cwd = _cwd;
    }

    sessionId(): string {
        return this.#sessionId;
    }

    pushMessage(massage: UserMessage): Promise<void | Error> {
        throw new Error("Method not implemented.");
    }

    listenEvent(listener: (event: SessionEvent, unsubnscribe: () => void) => void): { unsubscribe(): void; } {
        throw new Error("Method not implemented.");
    }

    close(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export class FakeSessionHandlerFactory implements SessionHandlerFactory {
    createSession(cwd: string, id: string): SessionHandler {
        return new FakeSessionHandler(id, cwd);
    }
}
　