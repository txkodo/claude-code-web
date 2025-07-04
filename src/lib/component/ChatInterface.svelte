<script lang="ts">
	import type { ClientEvent, ServerEvent } from "$lib/server/domain";
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
		type?: "text" | "tool_result" | "approval_request";
		approvalId?: string;
		approvalData?: any;
		approvalStatus?: "pending" | "approved" | "denied";
	}


	let messages = $state<MessageType[]>([]);
	let socket = $state<WebSocket | null>(null);
	let messagesContainer = $state<HTMLElement>();
	let isConnected = $state(false);

	onMount(() => {
		console.log("Connecting to WebSocket for session:", sessionId);
		connectSocket();
		return () => {
			if (socket) {
				socket.close();
			}
		};
	})

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
				} satisfies ClientEvent),
			);
			isConnected = true;
		};

		socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as ServerEvent;
				console.dir(data, { depth: null });
				handleSocketMessage(data);
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error);
			}
		};

		socket.onclose = () => {
			console.log("WebSocket disconnected");
			isConnected = false;
		};

		socket.onerror = (error) => {
			console.error("WebSocket error:", error);
			isConnected = false;
		};
	}

	function handleSocketMessage(data: ServerEvent) {
		switch (data.type) {
			case "push_message":
				switch (data.message.type) {
					case "user_message":
						messages = [
							...messages,
							{ role: "user", content: data.message.content },
						];
						break;
					case "assistant_message":
						messages = [
							...messages,
							{
								role: "assistant",
								type: "text",
								content: data.message.content,
							},
						];
						break;
					case "tool_result_message":
						messages = [
							...messages,
							{
								role: "assistant",
								type: "tool_result",
								toolOutput: data.message.output,
							},
						];
						break;
					case "approval_message":
						if (data.message.response === null) {
							// 新しい承認リクエスト - メッセージとして追加
							messages = [
								...messages,
								{
									role: "assistant",
									type: "approval_request",
									content: "許可リクエスト",
									approvalId: data.message.approvalId,
									approvalData: data.message.request,
									approvalStatus: "pending",
								},
							];
						}
						break;
				}
				break;
			case "update_message":
				if (data.message.type === "approval_message" && data.message.response !== null) {
					// 承認レスポンスが更新された - メッセージのステータスを更新
					messages = messages.map(msg => {
						if (msg.approvalId === data.message.approvalId) {
							return {
								...msg,
								approvalStatus: data.message.response.behavior === "allow" ? "approved" : "denied"
							};
						}
						return msg;
					});
				}
				break;
		}
		// スクロールは$effectで自動処理
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function sendMessage(event: { message: string }) {
		if (!isConnected || !socket) return;

		const message: ClientEvent = {
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

		const approvalMessage: ClientEvent = {
			type: "answer_approval",
			sessionId: sessionId,
			approvalId: event.approvalId,
			data: { behavior: "allow", updatedInput: event.data },
		};

		socket.send(JSON.stringify(approvalMessage));
		// メッセージのステータスを即座に更新
		messages = messages.map(msg => {
			if (msg.approvalId === event.approvalId) {
				return { ...msg, approvalStatus: "approved" };
			}
			return msg;
		});
	}

	function handleDenial(
		event: { approvalId: string; message?: string },
	) {
		if (!socket) return;

		const approvalMessage: ClientEvent = {
			type: "answer_approval",
			sessionId: sessionId,
			approvalId: event.approvalId,
			data: {
				behavior: "deny",
				message: event.message || "拒否されました",
			},
		};

		socket.send(JSON.stringify(approvalMessage));
		// メッセージのステータスを即座に更新
		messages = messages.map(msg => {
			if (msg.approvalId === event.approvalId) {
				return { ...msg, approvalStatus: "denied" };
			}
			return msg;
		});
	}
</script>

<div class="card">
	<div class="chat-header">
		<h2>Claude Code Chat</h2>
	</div>

	<div class="chat-container">
		<div class="messages" bind:this={messagesContainer}>
			{#each messages as message}
				{#if message.type === "approval_request"}
					<ApprovalRequest
						approvalRequest={{
							approvalId: message.approvalId!,
							data: message.approvalData
						}}
						approvalStatus={message.approvalStatus}
						onapprove={handleApproval}
						ondeny={handleDenial}
					/>
				{:else}
					<Message {message} />
				{/if}
			{/each}
		</div>

		<ChatInput
			{isConnected}
			isDisabled={messages.some(msg => msg.approvalStatus === "pending")}
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
