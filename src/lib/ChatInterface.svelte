<script lang="ts">
	import { onMount } from 'svelte';

	export let directory: string;
	export let sessionId: string | undefined = undefined;

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		timestamp: Date;
		rawMessages?: any[];
	}

	let messages: Message[] = [];
	let currentMessage = '';
	let isLoading = false;
	let abortController: AbortController | null = null;
	let messagesContainer: HTMLElement;

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	async function sendMessage() {
		if (!currentMessage.trim() || isLoading) return;

		const userMessage: Message = {
			role: 'user',
			content: currentMessage.trim(),
			timestamp: new Date()
		};

		messages = [...messages, userMessage];
		const messageToSend = currentMessage.trim();
		currentMessage = '';
		isLoading = true;

		// Create new AbortController for this request
		abortController = new AbortController();

		setTimeout(scrollToBottom, 10);

		try {
			console.log('Sending request to /api/claude...');
			const requestPayload = {
				prompt: messageToSend,
				directory: directory,
				...(sessionId && { sessionId })
			};
			console.log('Request payload:', requestPayload);

			// Call our API endpoint
			const response = await fetch('/api/claude', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestPayload),
				signal: abortController.signal
			});

			console.log('Response status:', response.status);
			console.log('Response headers:', Object.fromEntries(response.headers.entries()));

			const responseText = await response.text();
			console.log('Raw response:', responseText);

			let data;
			try {
				data = JSON.parse(responseText);
				console.log('Parsed response data:', data);
			} catch (parseError) {
				console.error('Failed to parse response as JSON:', parseError);
				throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
			}

			if (!response.ok) {
				console.error('API returned error:', data);
				throw new Error(data.error || `HTTP ${response.status}: ${data.details || 'Unknown error'}`);
			}

			console.log('API call successful. Messages received:', data.messages?.length);
			
			const content = data.messages ? extractContentFromMessages(data.messages) : 'レスポンスを取得できませんでした。';
			
			const assistantMessage: Message = {
				role: 'assistant',
				content: content,
				timestamp: new Date(),
				rawMessages: data.messages || []
			};

			messages = [...messages, assistantMessage];
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				console.log('Request was cancelled');
			} else {
				console.error('Detailed error information:', {
					message: error instanceof Error ? error.message : 'Unknown error',
					stack: error instanceof Error ? error.stack : undefined,
					type: typeof error,
					error: error
				});
				
				const errorMessage: Message = {
					role: 'assistant',
					content: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
					timestamp: new Date()
				};
				messages = [...messages, errorMessage];
			}
		} finally {
			isLoading = false;
			abortController = null;
			setTimeout(scrollToBottom, 10);
		}
	}



	function cancelRequest() {
		if (abortController) {
			abortController.abort();
			abortController = null;
			isLoading = false;
		}
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

	function extractContentFromMessages(messages: any[]): string {
		let content = '';
		
		for (const message of messages) {
			if (message.type === 'result' && message.result) {
				content += message.result + '\n\n';
			} else if (message.type === 'assistant' && message.message?.content) {
				if (Array.isArray(message.message.content)) {
					for (const item of message.message.content) {
						if (item.type === 'text' && item.text) {
							content += item.text + '\n\n';
						}
					}
				}
			} else if (message.type === 'text' && message.content) {
				content += message.content + '\n\n';
			}
		}
		
		return content.trim() || 'レスポンスを取得できませんでした。';
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
					{#if message.rawMessages && message.rawMessages.length > 1}
						<div class="raw-messages-info">
							📝 {message.rawMessages.length} メッセージを受信
							<details>
								<summary>詳細を表示</summary>
								<pre class="raw-messages">{JSON.stringify(message.rawMessages, null, 2)}</pre>
							</details>
						</div>
					{/if}
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
				<button class="btn" on:click={sendMessage} disabled={!currentMessage.trim()}>
					送信
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