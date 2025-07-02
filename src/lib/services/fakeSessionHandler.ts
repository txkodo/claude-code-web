import type { SessionEvent, SessionHandler, UserMessage } from "$lib/domain";

export class FakeSessionHandler implements SessionHandler {
  #sessionId: string;
  #cwd: string;
  #handlers: ((event: SessionEvent) => void)[];

  constructor(sessionId: string, cwd: string) {
    this.#sessionId = sessionId;
    this.#cwd = cwd;
    this.#handlers = [];
  }

  sessionId(): string {
    return this.#sessionId;
  }

  async pushMessage(message: UserMessage): Promise<void | Error> {
    // Fake implementation - just emit a simple response
    this.#emitEvent({
      type: "push_agent_message",
      message: {
        msgId: crypto.randomUUID(),
        content: `Fake response to: ${message.content}`
      }
    });
  }

  listenEvent(listener: (event: SessionEvent, unsubscribe: () => void) => void): { unsubscribe(): void; } {
    let unsubscribe = () => { }
    let _listener = (event: SessionEvent) => listener(event, unsubscribe);
    this.#handlers.push(_listener);
    unsubscribe = () => this.#handlers = this.#handlers.filter(h => h !== _listener);
    return { unsubscribe };
  }

  async close(): Promise<void> {
    this.#handlers = [];
  }

  #emitEvent(event: SessionEvent): void {
    for (const handler of this.#handlers) {
      handler(event);
    }
  }
}