<script lang="ts">
	import type { SessionMessage } from "$lib/server/domain";

	let { message, cwd }: { message: SessionMessage.ToolUseMessage; cwd?: string } = $props();
	
	let isExpanded = $state(false);
	
	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
	
	function truncateCommand(input: any): string {
		if (typeof input === 'object' && input !== null && 'command' in input) {
			const command = input.command;
			if (typeof command === 'string' && command.length > 50) {
				return command.substring(0, 50) + '...';
			}
			return command;
		}
		return JSON.stringify(input).substring(0, 50) + '...';
	}
	
	function getFilePath(input: any): string {
		if (typeof input === 'object' && input !== null && 'file_path' in input) {
			const fullPath = input.file_path;
			if (typeof fullPath === 'string' && cwd) {
				// CWDからの相対パスを計算
				if (fullPath.startsWith(cwd)) {
					const relativePath = fullPath.substring(cwd.length);
					const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
					return cleanPath ? './' + cleanPath : './';
				}
				// CWDに含まれない場合は絶対パスを表示
				return fullPath;
			} else if (typeof fullPath === 'string') {
				// CWDが提供されない場合は従来の表示
				const parts = fullPath.split('/');
				if (parts.length > 3) {
					return '.../' + parts.slice(-3).join('/');
				}
				return fullPath;
			}
		}
		return '';
	}
</script>

<div
	class="my-3 p-3 px-4 bg-purple-50 border border-purple-200 rounded-lg max-w-[80%] mr-auto relative"
>
	<button 
		class="flex items-center justify-between cursor-pointer w-full text-left p-0 bg-transparent border-0 hover:bg-purple-100 rounded transition-colors"
		onclick={toggleExpanded}
		aria-expanded={isExpanded}
		aria-label="ツール実行詳細を{isExpanded ? '閉じる' : '開く'}"
	>
		<div class="text-sm font-medium text-purple-800 flex items-center gap-2">
			🔧 {message.name}
			{#if message.name === 'Bash'}
				<span class="text-xs text-purple-600 font-mono">
					({truncateCommand(message.input)})
				</span>
			{:else if message.name === 'Edit' || message.name === 'Read'}
				<span class="text-xs text-purple-600 font-mono">
					({getFilePath(message.input)})
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if message.output === null}
				<div class="text-xs text-purple-600">実行中...</div>
			{:else}
				<div class="text-xs text-green-600">✅</div>
			{/if}
			<span class="text-purple-600 hover:text-purple-800 text-sm">
				{isExpanded ? '▼' : '▶'}
			</span>
		</div>
	</button>
	
	{#if isExpanded}
		<div class="mt-3 pt-3 border-t border-purple-200">
			<div class="text-xs font-medium text-purple-800 mb-2">入力:</div>
			<pre
				class="bg-purple-100 border border-purple-200 rounded p-2 text-xs overflow-x-auto text-purple-700 mb-3">{JSON.stringify(
					message.input,
					null,
					2,
				)}</pre>
			
			{#if message.output !== null}
				<div class="text-xs font-medium text-purple-800 mb-2">実行結果:</div>
				{#each message.output as output}
					{#if output.type === "text"}
						<pre
							class="bg-sky-50 border border-sky-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{output.text}</pre>
					{:else if output.type === "image"}
						<img
							src={output.uri}
							alt="ツール実行結果の画像"
							class="max-w-full max-h-[300px] rounded-md object-contain block mx-auto mt-2"
						/>
					{/if}
				{/each}
			{/if}
		</div>
	{/if}
</div>