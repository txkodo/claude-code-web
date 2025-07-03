import type { CodingAgent, CodingAgentFactory, CodingPermission, SessionEvent, SessionHandler, SessionHandlerFactory, UserMessage } from "$lib/server/domain";

export class RealSessionHandler implements SessionHandler {
  #codingAgent: CodingAgent;
  #sessionId: string;
  #handlers: ((event: SessionEvent) => void)[];
  #busy: boolean = false;

  constructor(props: {
    sessionId: string,
    agent: CodingAgent
  }) {
    this.#codingAgent = props.agent;
    this.#sessionId = props.sessionId;
    this.#handlers = [];
  }

  sessionId(): string {
    return this.#sessionId;
  }

  async pushMessage(message: UserMessage): Promise<void | Error> {
    if (this.#busy) {
      return new Error('作業中です.');
    }
    this.#busy = true;

    const process = async () => {
      try {
        this.#emitEvent({ type: "push_user_message", message })

        const iter = this.#codingAgent.process({
          prompt: message.content,
          permitAction: (data) => {
            // ID付きのイベントを発行し、ユーザーからの応答を待つ
            const approvalId = crypto.randomUUID();
            this.#emitEvent({ type: "ask_approval", approvalId, data });
            return new Promise<CodingPermission>((resolve) => {
              this.listenEvent((event, unsubscribe) => {
                if (event.type === "answer_approval" && event.approvalId === approvalId) {
                  unsubscribe();
                  resolve(event.data);
                }
              });
            });
          }
        })
        for await (const message of iter) {
          this.#emitEvent({ type: "push_agent_message", message: { msgId: crypto.randomUUID(), content: JSON.stringify(message) } })
        }
        this.#busy = false;
      }
      catch (error) {
        if (error instanceof Error) {
          return error;
        } else {
          return new Error(`Unknown error: ${error}`);
        }
      } finally {
        this.#busy = false;
      }
    }

    // 処理は開始するだけで完了は待たない
    process()
  }

  async answerApproval(approvalId: string, data: CodingPermission): Promise<void> {
    this.#emitEvent({ type: "answer_approval", approvalId, data });
  }

  listenEvent(listener: (event: SessionEvent, unsubnscribe: () => void) => void): { unsubscribe(): void; } {
    let unsubscribe = () => { }
    let _listener = (event: SessionEvent) => listener(event, unsubscribe);
    this.#handlers.push(_listener);
    unsubscribe = () => this.#handlers = this.#handlers.filter(h => h !== _listener);
    return { unsubscribe };
  }

  async close(): Promise<void> {
    return
  }

  #emitEvent(event: SessionEvent): void {
    for (const handler of this.#handlers) {
      handler(event);
    }
  }
}

export class RealSessionHandlerFactory implements SessionHandlerFactory {
  #codingAgentFactory: CodingAgentFactory;
  constructor(codingAgentFactory: CodingAgentFactory) {
    this.#codingAgentFactory = codingAgentFactory;
  }
  createSession(cwd: string, id: string): SessionHandler {
    return new RealSessionHandler({
      sessionId: id,
      agent: this.#codingAgentFactory.createAgent(cwd)
    });
  }
}