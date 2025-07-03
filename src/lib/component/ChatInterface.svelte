<script lang="ts">
	import type { WsClientMessage, WsServerMessage } from "$lib/server/domain";
	import { onMount } from "svelte";

	export let sessionId: string;

	interface Message {
		role: "user" | "assistant";
		content: string;
	}

	let messages: Message[] = [];
	let currentMessage = "";
	let socket: WebSocket | null = null;
	let messagesContainer: HTMLElement;
	let isConnected = false;

	onMount(() => {
		connectSocket();
		return () => {
			if (socket) {
				socket.close();
			}
		};
	});

	function connectSocket() {
		const wsUrl = `ws://localhost:3001/api/ws`;
		socket = new WebSocket(wsUrl);

		socket.onopen = () => {
			console.log("WebSocket connected");
			socket?.send(
				JSON.stringify({
					type: "subscribe",
					sessionId: sessionId,
				} satisfies WsClientMessage),
			);
			isConnected = true;
		};

		socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as WsServerMessage;
				console.log("WebSocket message:", data);
				handleSocketMessage(data);
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error);
			}
		};

		socket.onclose = () => {
			console.log("WebSocket disconnected");
			isConnected = false;
			socket?.send(
				JSON.stringify({
					type: "unsubscribe",
					sessionId: sessionId,
				} satisfies WsClientMessage),
			);
		};

		socket.onerror = (error) => {
			console.error("WebSocket error:", error);
			isConnected = false;
		};
	}

	function handleSocketMessage(data: WsServerMessage) {
		if (data.type === "event") {
			switch (data.event.type) {
				case "push_user_message":
					messages = [
						...messages,
						{ role: "user", content: data.event.message.content },
					];
					break;
				case "push_agent_message":
					messages = [
						...messages,
						{
							role: "assistant",
							content: data.event.message.content,
						},
					];
					break;
			}
			setTimeout(scrollToBottom, 10);
		}
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function sendMessage() {
		if (!currentMessage.trim() || !isConnected || !socket) return;

		const message: WsClientMessage = {
			type: "chat",
			sessionId: sessionId,
			message: currentMessage.trim(),
		};

		socket.send(JSON.stringify(message));
		currentMessage = "";
	}

	function cancelRequest() {}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			sendMessage();
		}
	}

	function clearChat() {
		messages = [];
	}

	function formatTimestamp(date: Date): string {
		return date.toLocaleTimeString("ja-JP", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
</script>

<div class="card">
	<div class="chat-header">
		<h2>Claude Code Chat</h2>
		<div class="chat-controls">
			<button
				class="btn btn-secondary"
				on:click={clearChat}
			>
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
				</div>
			{/each}
		</div>

		<div class="input-area">
			<textarea
				bind:value={currentMessage}
				on:keydown={handleKeydown}
				placeholder="Claudeに質問してください... (Ctrl+Enter で送信)"
				class="input message-input"
				rows="3"
			></textarea>

			<button
				class="btn"
				on:click={sendMessage}
				disabled={!currentMessage.trim() || !isConnected}
			>
				{isConnected ? "送信" : "接続中..."}
			</button>
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
		0%,
		80%,
		100% {
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
		0%,
		80%,
		100% {
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
