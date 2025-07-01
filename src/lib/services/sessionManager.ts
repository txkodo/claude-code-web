import { ClaudeCodeHandler } from './claudeCodeHandler';

export interface SessionInfo {
	id: string;
	handler: ClaudeCodeHandler;
	createdAt: Date;
	lastAccessedAt: Date;
}

export class SessionManager {
	private sessions: Map<string, SessionInfo> = new Map();

	generateId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	createHandler(sessionId?: string): { id: string; handler: ClaudeCodeHandler } {
		const id = sessionId || this.generateId();
		
		if (this.sessions.has(id)) {
			throw new Error(`Session with id '${id}' already exists`);
		}

		const handler = new ClaudeCodeHandler();
		const now = new Date();
		
		const sessionInfo: SessionInfo = {
			id,
			handler,
			createdAt: now,
			lastAccessedAt: now
		};

		this.sessions.set(id, sessionInfo);
		
		return { id, handler };
	}

	getHandlerById(id: string): ClaudeCodeHandler | null {
		const sessionInfo = this.sessions.get(id);
		
		if (!sessionInfo) {
			return null;
		}

		// Update last accessed time
		sessionInfo.lastAccessedAt = new Date();
		
		return sessionInfo.handler;
	}

	getSessionInfo(id: string): SessionInfo | null {
		return this.sessions.get(id) || null;
	}

	removeSession(id: string): boolean {
		const sessionInfo = this.sessions.get(id);
		
		if (!sessionInfo) {
			return false;
		}

		// Clean up the handler
		sessionInfo.handler.clear();
		
		return this.sessions.delete(id);
	}

	getAllSessions(): SessionInfo[] {
		return Array.from(this.sessions.values());
	}

	getSessionCount(): number {
		return this.sessions.size;
	}

	clearAllSessions(): void {
		// Clean up all handlers
		for (const sessionInfo of this.sessions.values()) {
			sessionInfo.handler.clear();
		}
		
		this.sessions.clear();
	}
}

export const sessionManager = new SessionManager();