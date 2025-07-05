//#region Domain Types

export type SessionMessage =
    | SessionMessage.UserMessage
    | SessionMessage.AssistantMessage
    | SessionMessage.ToolResultMessage
    | SessionMessage.ApprovalMessage
    | SessionMessage.DebugMessage
    | SessionMessage.ToolUseMessage;

export namespace SessionMessage {
    export type UserMessage = {
        type: "user_message";
        msgId: string;
        content: string;
    }
    export type AssistantMessage = {
        type: "assistant_message";
        msgId: string;
        content: string;
    }
    export type ToolResultMessage = {
        type: "tool_result_message";
        msgId: string;
        output: { type: "image"; uri: string; } | { type: "text"; text: string; };
    }
    export type ToolUseMessage = {
        type: "tool_use_message";
        msgId: string;
        name: string;
        input: unknown;
    }
    export type ApprovalMessage = {
        type: "approval_message";
        msgId: string;
        approvalId: string;
        request: any;
        response: CodingApproval | null;
    }
    export type DebugMessage = {
        type: "debug_message";
        msgId: string;
        content: string;
    }
}

export type ServerEvent =
    | SessionEvent.PushMessage
    | SessionEvent.UpdateMessage
    | SessionEvent.DeleteMessage;

export namespace SessionEvent {
    export type PushMessage = {
        type: "push_message",
        sessionId: string;
        message: SessionMessage
    }
    export type UpdateMessage = {
        type: "update_message",
        sessionId: string;
        message: SessionMessage
    }
    export type DeleteMessage = {
        type: "delete_message",
        sessionId: string;
        messageId: string
    }
}

export type ClientEvent = {
    type: "subscribe"
    sessionId: string;
} | {
    type: "unsubscribe"
    sessionId: string;
} | {
    type: "chat"
    sessionId: string;
    message: string;
} | {
    type: "answer_approval"
    sessionId: string;
    approvalId: string;
    data: CodingApproval;
}

export namespace ClientEvent {
    export type SubscribeSession = {
        type: "subscribe_session",
        sessionId: string;
    }
    export type UnsubscribeSession = {
        type: "unsubscribe_session",
        sessionId: string;
    }
    export type SendUserMessage = {
        type: "send_user_message",
        messageId: string
    }
    export type AnswerApproval = {
        type: "answer_approval",
        sessionId: string;
        approvalId: string;
        data: CodingApproval;
    }
}

//#endregion

//#region Helper Types

export type CodingApproval = { behavior: "allow"; updatedInput: any; } | { behavior: "deny"; message: string; }

//#endregion

//#region Service Interfaces

export interface SessionManager {
    getSessionById(sessionId: string): SessionHandler | null;
    listSessions(): string[];
    createSession(cwd: string): string;
}

export interface SessionHandler {
    sessionId(): string;
    pushMessage(massage: string): Promise<void | Error>;
    listenEvent(listener: (event: ServerEvent, unsubnscribe: () => void) => void): { unsubscribe(): void };
    getAllMessages(): SessionMessage[];
    answerApproval(approvalId: string, data: CodingApproval): Promise<void>;
    close(): Promise<void>;
}

export interface SessionHandlerFactory {
    createSession(cwd: string, id: string): SessionHandler;
}

export interface CodingAgent {
    process(props: {
        prompt: string,
        permitAction: (data: any) => Promise<CodingApproval>
    }): AsyncIterable<SessionMessage>;
    close(): Promise<void>;
}

export interface CodingAgentFactory {
    createAgent(cwd: string): CodingAgent;
}

//#endregion