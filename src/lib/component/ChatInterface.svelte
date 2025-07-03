<script lang="ts">
	import type { WsClientMessage, WsServerMessage } from "$lib/server/domain";
	import { onMount, untrack } from "svelte";
	import Message from "./Message.svelte";
	import ApprovalRequest from "./ApprovalRequest.svelte";
	import ChatInput from "./ChatInput.svelte";

	let { sessionId }: { sessionId: string } = $props();

	interface MessageType {
		role: "user" | "assistant";
		content?: string;
		toolOutput?:
			| { type: "image"; uri: string }
			| { type: "text"; text: string };
		type?: "text" | "tool_result";
	}

	interface ApprovalRequestType {
		approvalId: string;
		data: any;
	}

	let messages = $state<MessageType[]>([]);
	let socket = $state<WebSocket | null>(null);
	let messagesContainer = $state<HTMLElement>();
	let isConnected = $state(false);
	let pendingApproval = $state<ApprovalRequestType | null>(null);

	$effect(() => {
		connectSocket();
		return () => {
			if (socket) {
				socket.close();
			}
		};
	});

	// メッセージが追加されたら自動スクロール
	$effect(() => {
		if (messages.length > 0) {
			untrack(() => setTimeout(scrollToBottom, 10));
		}
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
				console.dir(data, { depth: null });
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
					const agentMessage = data.event.message;
					if (agentMessage.type === "tool_result") {
						messages = [
							...messages,
							{
								role: "assistant",
								type: "tool_result",
								toolOutput: agentMessage.toolOutput,
							},
						];
					} else {
						messages = [
							...messages,
							{
								role: "assistant",
								type: "text",
								content: agentMessage.content,
							},
						];
					}
					break;
				case "ask_approval":
					pendingApproval = {
						approvalId: data.event.approvalId,
						data: data.event.data,
					};
					break;
			}
			// スクロールは$effectで自動処理
		}
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function sendMessage(event: { message: string }) {
		if (!isConnected || !socket) return;

		const message: WsClientMessage = {
			type: "chat",
			sessionId: sessionId,
			message: event.message,
		};

		socket.send(JSON.stringify(message));
	}

	function clearChat() {
		messages = [];
	}

	function handleApproval(
		event:{ approvalId: string; data: any },
	) {
		if (!socket) return;

		const approvalMessage: WsClientMessage = {
			type: "answer_approval",
			sessionId: sessionId,
			approvalId: event.approvalId,
			data: { behavior: "allow", updatedInput: event.data },
		};

		socket.send(JSON.stringify(approvalMessage));
		pendingApproval = null;
	}

	function handleDenial(
		event: { approvalId: string; message?: string },
	) {
		if (!socket) return;

		const approvalMessage: WsClientMessage = {
			type: "answer_approval",
			sessionId: sessionId,
			approvalId: event.approvalId,
			data: {
				behavior: "deny",
				message: event.message || "拒否されました",
			},
		};

		socket.send(JSON.stringify(approvalMessage));
		pendingApproval = null;
	}
</script>

<div class="card">
	<div class="chat-header">
		<h2>Claude Code Chat</h2>
	</div>

	<div class="chat-container">
		<div class="messages" bind:this={messagesContainer}>
			{#each messages as message}
				<Message {message} />
			{/each}
		</div>

		{#if pendingApproval}
			<ApprovalRequest
				approvalRequest={pendingApproval}
				onapprove={handleApproval}
				ondeny={handleDenial}
			/>
		{/if}

		<ChatInput
			{isConnected}
			isDisabled={!!pendingApproval}
			onsend={sendMessage}
			onclear={clearChat}
		/>
	</div>
</div>

<style>
	.card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		margin: 20px auto;
		max-width: 1200px;
	}

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

	.chat-container {
		display: flex;
		flex-direction: column;
		height: 70vh;
		gap: 16px;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #fafafa;
	}
</style>
