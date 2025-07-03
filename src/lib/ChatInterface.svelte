<script lang="ts">
	import { onMount } from 'svelte';

	export let sessionId: string;

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		timestamp: Date;
	}

	let messages: Message[] = [];
	let currentMessage = '';
	let isLoading = false;
	let websocket: WebSocket | null = null;
	let messagesContainer: HTMLElement;
	let isConnected = false;

	onMount(async () => {
		await connectWebSocket();
		return () => {
			if (websocket) {
				websocket.close();
			}
		};
	});

	async function connectWebSocket() {
		websocket = new WebSocket(`/api/session/${sessionId}/ws`);

		websocket.onopen = () => {
			console.log('WebSocket connected');
			isConnected = true;
		};

		websocket.onmessage = (event) => {
			console.log('WebSocket message');
			const sessionEvent = JSON.parse(event.data);
			handleSessionEvent(sessionEvent);
		};

		websocket.onclose = () => {
			console.log('WebSocket disconnected');
			isConnected = false;
		};

		websocket.onerror = (error) => {
			console.error('WebSocket error:', error);
			isConnected = false;
		};
	}

	function handleSessionEvent(event: any) {
		switch (event.type) {
			case 'push_user_message':
				messages = [...messages, {
					role: 'user',
					content: event.message.content,
					timestamp: new Date()
				}];
				break;
			case 'push_agent_message':
				messages = [...messages, {
					role: 'assistant',
					content: event.message.content,
					timestamp: new Date()
				}];
				break;
			case 'ask_approval':
				// TODO: 承認ダイアログの実装
				console.log('Approval requested:', event);
				break;
		}
		setTimeout(scrollToBottom, 10);
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function sendMessage() {
		if (!currentMessage.trim() || !isConnected || isLoading) return;

		const message = {
			msgId: crypto.randomUUID(),
			content: currentMessage.trim()
		};

		websocket?.send(JSON.stringify(message));
		currentMessage = '';
		isLoading = true;
	}



	function cancelRequest() {
		isLoading = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			sendMessage();
		}
	}

	function clearChat() {
		messages = [];
	}

	function formatTimestamp(date: Date): string {
		return date.toLocaleTimeString('ja-JP', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

</script>

<div class="card">
	<div class="chat-header">
		<h2>Claude Code Chat</h2>
		<div class="chat-controls">
			<button class="btn btn-secondary" on:click={clearChat} disabled={isLoading}>
				チャットをクリア
			</button>
		</div>
	</div>

	<div class="chat-container">
		<div class="messages" bind:this={messagesContainer}>
			{#each messages as message}
				<div class="message {message.role}">
					<div class="message-content">
						{message.content}
					</div>
					<div class="message-time">
						{formatTimestamp(message.timestamp)}
					</div>
				</div>
			{/each}
			
			{#if isLoading}
				<div class="message assistant loading">
					<div class="message-content">
						<div class="typing-indicator">
							<span></span>
							<span></span>
							<span></span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<div class="input-area">
			<textarea
				bind:value={currentMessage}
				on:keydown={handleKeydown}
				placeholder="Claudeに質問してください... (Ctrl+Enter で送信)"
				class="input message-input"
				disabled={isLoading}
				rows="3"
			></textarea>
			
			{#if isLoading}
				<button class="btn btn-danger" on:click={cancelRequest}>
					キャンセル
				</button>
			{:else}
				<button class="btn" on:click={sendMessage} disabled={!currentMessage.trim() || !isConnected}>
					{isConnected ? '送信' : '接続中...'}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e5e7eb;
	}

	.chat-header h2 {
		margin: 0;
		color: #374151;
	}

	.chat-controls {
		display: flex;
		gap: 8px;
	}

	.btn-secondary {
		background: #6b7280;
	}

	.btn-secondary:hover {
		background: #4b5563;
	}

	.message-content {
		line-height: 1.6;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.message-time {
		font-size: 12px;
		opacity: 0.7;
		margin-top: 8px;
	}

	.message.user .message-time {
		text-align: right;
	}

	.loading {
		opacity: 0.8;
	}

	.typing-indicator {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #6b7280;
		animation: typing 1.4s infinite ease-in-out;
	}

	.typing-indicator span:nth-child(1) {
		animation-delay: -0.32s;
	}

	.typing-indicator span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes typing {
		0%, 80%, 100% {
			transform: scale(0);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.message-input {
		resize: vertical;
		min-height: 44px;
		max-height: 200px;
	}

	.loading {
		opacity: 0.8;
	}

	.typing-indicator {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #6b7280;
		animation: typing 1.4s infinite ease-in-out;
	}

	.typing-indicator span:nth-child(1) {
		animation-delay: -0.32s;
	}

	.typing-indicator span:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes typing {
		0%, 80%, 100% {
			transform: scale(0);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.btn-danger {
		background: #dc3545;
		color: white;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	.raw-messages-info {
		margin-top: 8px;
		font-size: 12px;
		color: #6b7280;
	}

	.raw-messages-info details {
		margin-top: 4px;
	}

	.raw-messages-info summary {
		cursor: pointer;
		color: #3b82f6;
		text-decoration: underline;
	}

	.raw-messages {
		background: #f8f9fa;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 8px;
		margin-top: 4px;
		font-size: 11px;
		max-height: 200px;
		overflow: auto;
		white-space: pre-wrap;
	}
</style>