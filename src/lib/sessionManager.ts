export interface ChatSession {
	id: string;
	name: string;
	cwd: string;
	claudeSessionId?: string;
	createdAt: Date;
	lastUsed: Date;
	messageCount: number;
}

export interface SessionStore {
	sessions: Map<string, ChatSession>;
}

// In-memory session store (in production, you'd want to use a database)
const sessionStore: SessionStore = {
	sessions: new Map()
};

export function generateSessionId(): string {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createSession(name: string, cwd: string): ChatSession {
	const id = generateSessionId();
	const session: ChatSession = {
		id,
		name,
		cwd,
		createdAt: new Date(),
		lastUsed: new Date(),
		messageCount: 0
	};
	
	sessionStore.sessions.set(id, session);
	return session;
}

export function getSession(id: string): ChatSession | undefined {
	return sessionStore.sessions.get(id);
}

export function getAllSessions(): ChatSession[] {
	return Array.from(sessionStore.sessions.values()).sort((a, b) => 
		b.lastUsed.getTime() - a.lastUsed.getTime()
	);
}

export function updateSession(id: string, updates: Partial<ChatSession>): ChatSession | undefined {
	const session = sessionStore.sessions.get(id);
	if (!session) return undefined;
	
	const updatedSession = { ...session, ...updates, lastUsed: new Date() };
	sessionStore.sessions.set(id, updatedSession);
	return updatedSession;
}

export function deleteSession(id: string): boolean {
	return sessionStore.sessions.delete(id);
}

export function updateSessionClaudeId(sessionId: string, claudeSessionId: string): void {
	const session = getSession(sessionId);
	if (session) {
		session.claudeSessionId = claudeSessionId;
		session.lastUsed = new Date();
	}
}

export function incrementMessageCount(sessionId: string): void {
	const session = getSession(sessionId);
	if (session) {
		session.messageCount++;
		session.lastUsed = new Date();
	}
}