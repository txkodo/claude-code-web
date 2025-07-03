export type UserMessage = {
    msgId: string;
    content: string;
}

export type AgentMessage = {
    msgId: string;
    content: string;
}

export type SessionEvent =
    | SessionEvent.PushUserMessage
    | SessionEvent.PushAgentMessage
    | SessionEvent.UpdateAgentMessage
    | SessionEvent.DeleteAgentMessage
    | SessionEvent.AskApproval
    | SessionEvent.AnswerApproval;

export namespace SessionEvent {
    export type PushUserMessage = {
        type: "push_user_message",
        message: UserMessage
    }
    export type PushAgentMessage = {
        type: "push_agent_message",
        message: AgentMessage
    }
    export type UpdateAgentMessage = {
        type: "update_agent_message",
        message: AgentMessage
    }
    export type DeleteAgentMessage = {
        type: "delete_agent_message",
        message: AgentMessage
    }
    export type AskApproval = {
        type: "ask_approval",
        approvalId: string;
        data: any;
    }
    export type AnswerApproval = {
        type: "answer_approval",
        approvalId: string;
        data: CodingPermission;
    }
}


export interface SessionManager {
    getSessionById(sessionId: string): SessionHandler | null;
    listSessions(): string[];
    createSession(cwd: string): string;
}

export interface SessionHandler {
    sessionId(): string;
    pushMessage(massage: UserMessage): Promise<void | Error>;
    listenEvent(listener: (event: SessionEvent, unsubnscribe: () => void) => void): { unsubscribe(): void };
    answerApproval(approvalId: string, data: CodingPermission): Promise<void>;
    close(): Promise<void>;
}

export interface SessionHandlerFactory {
    createSession(cwd: string, id: string): SessionHandler;
}

export type CodingPermission = { behavior: "allow"; updatedInput: any; } | { behavior: "deny"; message: string; }

export interface CodingAgent {
    process(props: {
        prompt: string,
        permitAction: (data: any) => Promise<CodingPermission>
    }): AsyncIterable<AgentMessage>;
    close(): Promise<void>;
}

export interface CodingAgentFactory {
    createAgent(cwd: string): CodingAgent;
}

export type WsClientMessage = {
    type: "subscribe"
    sessionId: string;
} | {
    type: "unsubscribe"
    sessionId: string;
} | {
    type: "chat"
    sessionId: string;
    message: string;
}

export type WsServerMessage = {
    type: "event"
    sessionId: string;
    event: SessionEvent
}