import type { CodingAgent, CodingAgentFactory, CodingApproval, ServerEvent, SessionHandler, SessionHandlerFactory, SessionMessage, SessionMessageChange, SessionStatus } from "$lib/server/domain";

export class RealSessionHandler implements SessionHandler {
  #codingAgent: CodingAgent;
  #sessionId: string;
  #handlers: ((event: ServerEvent) => void)[];
  #busy: boolean = false;
  #approvalMessages: Map<string, SessionMessage.ApprovalMessage> = new Map();
  #messages: SessionMessage[] = [];
  #cwd: string;
  #abortController: AbortController | null = null;

  constructor(props: {
    sessionId: string,
    agent: CodingAgent,
    cwd: string
  }) {
    this.#codingAgent = props.agent;
    this.#sessionId = props.sessionId;
    this.#handlers = [];
    this.#cwd = props.cwd;
  }

  sessionId(): string {
    return this.#sessionId;
  }

  async pushMessage(message: string): Promise<void | Error> {
    if (this.#busy) {
      return new Error('作業中です.');
    }
    this.#busy = true;
    this.#abortController = new AbortController();
    this.#emitEvent({ type: "update_session_status", sessionId: this.#sessionId, status: this.getStatus() });

    const process = async () => {
      try {
        const userMessage: SessionMessage.UserMessage = {
          type: "user_message",
          msgId: crypto.randomUUID(),
          content: message
        };
        this.#emitEvent({ type: "push_message", sessionId: this.#sessionId, message: userMessage })

        const iter = this.#codingAgent.process({
          prompt: message,
          abortSignal: this.#abortController?.signal,
          permitAction: (data) => {
            // ID付きのイベントを発行し、ユーザーからの応答を待つ
            const approvalId = crypto.randomUUID();
            const approvalMessage: SessionMessage.ApprovalMessage = {
              type: "approval_message",
              msgId: crypto.randomUUID(),
              approvalId,
              request: data,
              response: null
            };
            this.#approvalMessages.set(approvalId, approvalMessage);
            this.#emitEvent({ type: "push_message", sessionId: this.#sessionId, message: approvalMessage });
            this.#emitEvent({ type: "update_session_status", sessionId: this.#sessionId, status: this.getStatus() });
            return new Promise<CodingApproval>((resolve) => {
              this.listenEvent((event, unsubscribe) => {
                if (event.type === "update_message" && event.message.type === "approval_message" && event.message.approvalId === approvalId && event.message.response) {
                  unsubscribe();
                  resolve(event.message.response);
                }
              });
            });
          }
        })
        for await (const messageChange of iter) {
          this.#emitEvent({ type: messageChange.mode === "push" ? "push_message" : "update_message", sessionId: this.#sessionId, message: messageChange.message })
        }
      }
      catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("Session processing was cancelled");
        } else {
          console.error("Error in session handler:", error);
        }
      } finally {
        this.#busy = false;
        this.#abortController = null;
        this.#emitEvent({ type: "update_session_status", sessionId: this.#sessionId, status: this.getStatus() });
      }
    }

    // 処理は開始するだけで完了は待たない
    process()
  }

  async answerApproval(approvalId: string, data: CodingApproval): Promise<void> {
    const existingMessage = this.#approvalMessages.get(approvalId);
    if (!existingMessage) {
      throw new Error(`Approval message with ID ${approvalId} not found`);
    }
    
    const updatedMessage: SessionMessage.ApprovalMessage = {
      ...existingMessage,
      response: data
    };
    this.#approvalMessages.set(approvalId, updatedMessage);
    this.#emitEvent({ type: "update_message", sessionId: this.#sessionId, message: updatedMessage });
    this.#emitEvent({ type: "update_session_status", sessionId: this.#sessionId, status: this.getStatus() });
  }

  listenEvent(listener: (event: ServerEvent, unsubnscribe: () => void) => void): { unsubscribe(): void; } {
    let unsubscribe = () => { }
    let _listener = (event: ServerEvent) => listener(event, unsubscribe);
    this.#handlers.push(_listener);
    unsubscribe = () => this.#handlers = this.#handlers.filter(h => h !== _listener);
    return { unsubscribe };
  }

  getAllMessages(): SessionMessage[] {
    return [...this.#messages];
  }

  async close(): Promise<void> {
    return
  }

  getStatus(): SessionStatus {
    let status: SessionStatus["status"] = "idle";
    if (this.#busy) {
      const hasWaitingApproval = Array.from(this.#approvalMessages.values()).some(msg => msg.response === null);
      status = hasWaitingApproval ? "waiting_for_approval" : "running";
    }
    return {
      status,
      cwd: this.#cwd
    };
  }

  async cancel(): Promise<void> {
    if (this.#abortController) {
      this.#abortController.abort();
    }
  }

  #emitEvent(event: ServerEvent): void {
    console.dir(event, { depth: null });
    
    // Store messages in the messages array
    switch (event.type) {
      case "push_message":
        this.#messages.push(event.message);
        break;
      case "update_message":
        const index = this.#messages.findIndex(m => m.msgId === event.message.msgId);
        if (index !== -1) {
          this.#messages[index] = event.message;
        }
        break;
      case "delete_message":
        this.#messages = this.#messages.filter(m => m.msgId !== event.messageId);
        break;
    }
    
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
      agent: this.#codingAgentFactory.createAgent(cwd),
      cwd
    });
  }
}