export type UserMessage = {
    msgId: string;
    content: string;
}

export type AgentMessage = {
    msgId: string;
    content: string;
}

export type SessionEvent = {
    type: "push_user_message",
    message: UserMessage
} | {
    type: "push_agent_message",
    message: AgentMessage
} | {
    type: "update_agent_message",
    message: AgentMessage
} | {
    type: "delete_agent_message",
    message: AgentMessage
} | {
    type: "ask_approval",
    approvalId: string;
    data: any;
} | {
    type: "answer_approval",
    approvalId: string;
    data: CodingPermission;
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