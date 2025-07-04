<script lang="ts">
	import type {
		ClientEvent,
		ServerEvent,
		SessionMessage,
	} from "$lib/server/domain";
	import { onMount, untrack } from "svelte";
	import Message from "./Message.svelte";
	import ApprovalRequest from "./ApprovalRequest.svelte";
	import ChatInput from "./ChatInput.svelte";

	let { sessionId }: { sessionId: string } = $props();

	type UIMessage = SessionMessage & {
		// UI固有の状態を追加（approval_message専用）
		approvalStatus?: "pending" | "approved" | "denied";
	};

	let messages = $state<UIMessage[]>([]);
	let socket = $state<WebSocket | null>(null);
	let messagesContainer = $state<HTMLElement>();
	let isConnected = $state(false);

	onMount(async () => {
		console.log("Connecting to WebSocket for session:", sessionId);
		await requestNotificationPermission();
		await loadMessages();
		connectSocket();
		return () => {
			if (socket) {
				socket.close();
			}
		};
	});

	async function requestNotificationPermission() {
		if ("Notification" in window) {
			const permission = await Notification.requestPermission();
			console.log("Notification permission:", permission);
		}
	}

	async function loadMessages() {
		try {
			const response = await fetch(`/api/session/${sessionId}/messages`);
			if (response.ok) {
				const data = await response.json();
				messages = data.messages.map((msg: SessionMessage) => {
					if (msg.type === "approval_message") {
						return {
							...msg,
							approvalStatus:
								msg.response === null
									? "pending"
									: msg.response.behavior === "allow"
										? "approved"
										: "denied",
						};
					}
					return msg;
				});
			}
		} catch (error) {
			console.error("Failed to load messages:", error);
		}
	}

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
		type Hook = (data: ServerEvent) => void;

		const hooks: Hook[] = [approvalNotificationHook, updateMessagesHook];

		for (const hook of hooks) {
			try {
				hook(data);
			} catch (error) {
				console.error("Error in message hook:", error);
			}
		}
	}

	function approvalNotificationHook(data: ServerEvent) {
		if (
			data.type === "push_message" &&
			data.message.type === "approval_message"
		) {
			if (data.message.response === null) {
				// 承認リクエストの通知を送信
				sendApprovalNotification(data.message.request);
			}
		}
	}

	function updateMessagesHook(data: ServerEvent) {
		switch (data.type) {
			case "push_message":
				messages = [...messages, data.message];
				break;
			case "update_message":
				messages = messages.map((msg) => {
					if (msg.msgId === data.message.msgId) {
						// メッセージが更新された場合
						return data.message;
					}
					return msg;
				});
				break;
		}
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

	function handleApproval(event: { approvalId: string; data: any }) {
		if (!socket) return;

		const approvalMessage: ClientEvent = {
			type: "answer_approval",
			sessionId: sessionId,
			approvalId: event.approvalId,
			data: { behavior: "allow", updatedInput: event.data },
		};

		socket.send(JSON.stringify(approvalMessage));
		// メッセージのステータスを即座に更新
		messages = messages.map((msg) => {
			if (
				msg.type === "approval_message" &&
				msg.approvalId === event.approvalId
			) {
				return { ...msg, approvalStatus: "approved" };
			}
			return msg;
		});
	}

	function handleDenial(event: { approvalId: string; message?: string }) {
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
		messages = messages.map((msg) => {
			if (
				msg.type === "approval_message" &&
				msg.approvalId === event.approvalId
			) {
				return { ...msg, approvalStatus: "denied" };
			}
			return msg;
		});
	}

	function sendApprovalNotification(request: any) {
		// 通知APIが利用可能かチェック
		if (!("Notification" in window)) {
			console.warn("This browser does not support notifications");
			return;
		}

		// 通知権限がない場合は何もしない
		if (Notification.permission !== "granted") {
			console.warn("Notification permission not granted");
			return;
		}

		// 通知のタイトルと内容を生成
		const title = "Claude Code - 承認が必要です";
		let body = "Claudeが操作の承認を求めています。";

		if (request?.tool?.name) {
			body = `${request.tool.name} の実行承認が必要です。`;
		} else if (request?.description) {
			body = request.description;
		}

		// 通知を送信
		try {
			const notification = new Notification(title, {
				body,
				icon: "/favicon.ico",
				tag: "claude-approval",
				requireInteraction: true,
			});

			// 通知をクリックした時の処理
			notification.onclick = () => {
				window.focus();
				notification.close();
			};
		} catch (error) {
			console.error("Failed to send notification:", error);
		}
	}
</script>

<div class="chat-container">
	<div class="messages" bind:this={messagesContainer}>
		{#each messages as message}
			{#if message.type === "approval_message"}
				<ApprovalRequest
					approvalRequest={{
						approvalId: message.approvalId,
						data: message.request,
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
		isDisabled={messages.some(
			(msg) =>
				msg.type === "approval_message" &&
				msg.approvalStatus === "pending",
		)}
		onsend={sendMessage}
		onclear={clearChat}
	/>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 70vh;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
	}
</style>
