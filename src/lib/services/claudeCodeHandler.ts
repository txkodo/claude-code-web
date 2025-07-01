import { query, type SDKMessage } from '@anthropic-ai/claude-code';

export interface ClaudeCodeEvent {
	type: 'message' | 'error' | 'complete';
	data?: SDKMessage;
	messages?: SDKMessage[];
	error?: string;
}

export type EventListener = (event: ClaudeCodeEvent) => void;
export type UnsubscribeFunction = () => boolean;

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

	listen(listener: EventListener): UnsubscribeFunction {
		this.listeners.push(listener);
		
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
				return true;
			}
			return false;
		};
	}

	private emit(event: ClaudeCodeEvent): void {
		this.listeners.forEach(listener => listener(event));
	}

	async send(message: string): Promise<void> {
		if (this.abortController !== null) {
			throw new Error('A request is already in progress. Abort the current request before sending a new one.');
		}
		
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