import { query, type SDKMessage } from '@anthropic-ai/claude-code';

export interface ClaudeCodeEvent {
	type: 'message' | 'error' | 'complete';
	data?: SDKMessage;
	messages?: SDKMessage[];
	error?: string;
}

export type EventListener = (event: ClaudeCodeEvent) => void;

export class ClaudeCodeHandler {
	private claudeCodeSessionId: string | null = null;
	private abortController: AbortController | null = null;
	private listeners: EventListener[] = [];

	constructor(sessionId?: string) {
		this.claudeCodeSessionId = sessionId || null;
	}

	getSessionId(): string | null {
		return this.claudeCodeSessionId;
	}

	setSessionId(sessionId: string): void {
		this.claudeCodeSessionId = sessionId;
	}

	listen(listener: EventListener): void {
		this.listeners.push(listener);
	}

	private emit(event: ClaudeCodeEvent): void {
		this.listeners.forEach(listener => listener(event));
	}

	async send(message: string): Promise<void> {
		this.abortController = new AbortController();

		try {
			const messages: SDKMessage[] = [];
			
			for await (const sdkMessage of query({
				prompt: message,
				abortController: this.abortController,
				options: {
					maxTurns: 3,
				},
			})) {
				messages.push(sdkMessage);
				
				this.emit({ 
					type: 'message', 
					data: sdkMessage 
				});

				if (sdkMessage.type === 'system' && sdkMessage.session_id) {
					if (this.claudeCodeSessionId !== sdkMessage.session_id) {
						this.claudeCodeSessionId = sdkMessage.session_id;
					}
				}
			}

			this.emit({ 
				type: 'complete',
				messages: messages
			});

		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				this.emit({ type: 'error', error: 'Request aborted' });
			} else {
				this.emit({ 
					type: 'error', 
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		} finally {
			this.abortController = null;
		}
	}

	abort(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
	}

	clear(): void {
		this.abort();
		this.claudeCodeSessionId = null;
		this.listeners = [];
	}
}

export const claudeCodeHandler = new ClaudeCodeHandler();