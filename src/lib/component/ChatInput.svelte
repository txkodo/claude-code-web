<script lang="ts">
	let {
		isConnected,
		isDisabled = false,
		onsend,
		onclear,
	}: {
		isConnected: boolean;
		isDisabled?: boolean;
		onsend: (event: { message: string }) => void;
		onclear: () => void;
	} = $props();

	let currentMessage = $state("");

	function sendMessage() {
		if (!currentMessage.trim() || !isConnected || isDisabled) return;

		onsend({ message: currentMessage.trim() });
		currentMessage = "";
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			event.preventDefault();
			sendMessage();
		}
	}

	function clearChat() {
		onclear();
	}
</script>

<div class="space-y-3">
	<div class="flex justify-end">
		<button
			class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
			onclick={clearChat}
		>
			リセット
		</button>
	</div>
	<div class="flex gap-2 items-end">
		<textarea
			bind:value={currentMessage}
			onkeydown={handleKeydown}
			placeholder="Claudeに質問してください... (Ctrl+Enter で送信)"
			class="flex-1 p-3 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-y min-h-[44px] max-h-[200px] font-inherit"
			rows="3"
			disabled={isDisabled}
		></textarea>
		<button
			class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
			onclick={sendMessage}
			disabled={!currentMessage.trim() || !isConnected || isDisabled}
		>
			{isConnected ? "送信" : "接続中..."}
		</button>
	</div>
</div>
