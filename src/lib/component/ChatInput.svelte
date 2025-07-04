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

<div class="input-container">
	<div class="input-area">
		<textarea
			bind:value={currentMessage}
			onkeydown={handleKeydown}
			placeholder="Claudeに質問してください... (Ctrl+Enter で送信)"
			class="input message-input"
			rows="3"
			disabled={isDisabled}
		></textarea>
		<div>
			<div class="input-header">
				<button class="btn btn-secondary" onclick={clearChat}>
					リセット
				</button>
			</div>
			<button
				class="btn btn-primary"
				onclick={sendMessage}
				disabled={!currentMessage.trim() || !isConnected || isDisabled}
			>
				{isConnected ? "送信" : "接続中..."}
			</button>
		</div>
	</div>
</div>

<style>
	.input-header {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 12px;
	}

	.input-area {
		display: flex;
		gap: 8px;
		align-items: flex-end;
	}

	.input {
		flex: 1;
		padding: 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 14px;
		transition: border-color 0.2s;
	}

	.input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.input:disabled {
		background: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}

	.message-input {
		resize: vertical;
		min-height: 44px;
		max-height: 200px;
		font-family: inherit;
	}

	.btn {
		padding: 12px 24px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}
</style>
