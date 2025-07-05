<script lang="ts">
	import type { SessionStatus } from "$lib/server/domain";

	let {
		isConnected,
		isDisabled = false,
		sessionStatus,
		onsend,
	}: {
		isConnected: boolean;
		isDisabled?: boolean;
		sessionStatus: SessionStatus | null;
		onsend: (event: { message: string }) => void;
	} = $props();

	let currentMessage = $state("");
	let textareaElement: HTMLTextAreaElement;

	let canSend = $derived(sessionStatus?.status === "idle");

	function sendMessage() {
		if (!currentMessage.trim() || !isConnected || isDisabled || !canSend) return;

		onsend({ message: currentMessage.trim() });
		currentMessage = "";
		adjustTextareaHeight();
	}

	function adjustTextareaHeight() {
		if (textareaElement) {
			textareaElement.style.height = 'auto';
			textareaElement.style.height = textareaElement.scrollHeight + 'px';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			sendMessage();
		}
	}
</script>

<div class="space-y-3">
	<div class="flex gap-2 items-end">
		<textarea
			bind:this={textareaElement}
			bind:value={currentMessage}
			onkeydown={handleKeydown}
			oninput={adjustTextareaHeight}
			placeholder="Claudeに質問してください... (Ctrl+Enter で送信)"
			class="flex-1 p-3 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-none overflow-hidden min-h-[44px] max-h-[200px] font-inherit"
			rows="1"
			disabled={isDisabled || !canSend}
		></textarea>
		<button
			class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={sendMessage}
			disabled={!currentMessage.trim() || !isConnected || isDisabled || !canSend}
		>
			{!isConnected ? "接続中..." : !canSend ? "送信不可" : "送信"}
		</button>
	</div>
</div>
