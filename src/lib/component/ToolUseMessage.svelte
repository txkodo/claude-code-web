<script lang="ts">
	import type { SessionMessage } from "$lib/server/domain";
	import { getRelativePath } from "$lib/server/util/toolContentParser";

	let { message, cwd }: { message: SessionMessage.ToolUseMessage; cwd?: string } = $props();
	
	let isExpanded = $state(false);
	
	function toggleExpanded() {
		isExpanded = !isExpanded;
	}
	
	// Fallback functions for legacy support
	function getCommand(input: any): string {
		if (typeof input === 'object' && input !== null && 'command' in input) {
			return input.command;
		}
		return JSON.stringify(input);
	}
	
	function getFilePath(input: any): string {
		if (typeof input === 'object' && input !== null && 'file_path' in input) {
			return getRelativePath(input.file_path, cwd);
		}
		return '';
	}

	function getWriteContent(input: any): string {
		if (typeof input === 'object' && input !== null && 'content' in input) {
			return input.content;
		}
		return '';
	}

	function getEditOldString(input: any): string {
		if (typeof input === 'object' && input !== null && 'old_string' in input) {
			return input.old_string;
		}
		return '';
	}

	function getEditNewString(input: any): string {
		if (typeof input === 'object' && input !== null && 'new_string' in input) {
			return input.new_string;
		}
		return '';
	}
</script>

<div
	class="my-3 p-3 px-4 bg-purple-50 border border-purple-200 rounded-lg w-full relative"
>
	<button 
		class="cursor-pointer w-full text-left p-0 bg-transparent border-0 hover:bg-purple-100 rounded transition-colors"
		onclick={toggleExpanded}
		aria-expanded={isExpanded}
		aria-label="ツール実行詳細を{isExpanded ? '閉じる' : '開く'}"
	>
		{#if message.name === 'Bash' || message.name === 'Edit' || message.name === 'Read' || message.name === 'Write'}
			<!-- Bash/Edit/Read/Writeの場合は二行構成 -->
			<div class="flex items-center justify-between mb-1">
				<div class="text-sm font-medium text-purple-800 flex items-center gap-2">
					🔧 {message.name}
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
			</div>
			<div class="text-xs text-purple-600 font-mono break-words">
				{#if message.content}
					{#if message.content.tool === 'Bash'}
						{message.content.command}
					{:else if message.content.tool === 'Write' || message.content.tool === 'Edit' || message.content.tool === 'Read'}
						{getRelativePath(message.content.path, cwd)}
					{:else}
						{message.name}
					{/if}
				{:else}
					{#if message.name === 'Bash'}
						{getCommand(message.input)}
					{:else if message.name === 'Edit' || message.name === 'Read'}
						{getFilePath(message.input)}
					{:else if message.name === 'Write'}
						{getFilePath(message.input)}
					{/if}
				{/if}
			</div>
		{:else}
			<!-- その他のツールは一行構成 -->
			<div class="flex items-center justify-between">
				<div class="text-sm font-medium text-purple-800 flex items-center gap-2">
					🔧 {message.name}
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
			</div>
		{/if}
	</button>
	
	{#if isExpanded}
		<div class="mt-3 pt-3 border-t border-purple-200">
			{#if message.content}
				<!-- 新しいToolUseContent形式での表示 -->
				{#if message.content.tool === 'Write'}
					<div class="text-xs font-medium text-purple-800 mb-2">コンテンツ:</div>
					{#if message.content.highlightedContent}
						<div class="bg-sky-50 border border-sky-200 rounded p-2 text-xs overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!border-0 [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words">
							{@html message.content.highlightedContent}
						</div>
					{:else}
						<pre class="bg-sky-50 border border-sky-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{message.content.content}</pre>
					{/if}
				{:else if message.content.tool === 'Edit'}
					<div class="text-xs font-medium text-purple-800 mb-2">変更前:</div>
					{#if message.content.highlightedOldContent}
						<div class="bg-red-50 border border-red-200 rounded p-2 text-xs overflow-x-auto mb-3 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!border-0 [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words">
							{@html message.content.highlightedOldContent}
						</div>
					{:else}
						<pre class="bg-red-50 border border-red-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono mb-3">{message.content.oldContent}</pre>
					{/if}
					<div class="text-xs font-medium text-purple-800 mb-2">変更後:</div>
					{#if message.content.highlightedNewContent}
						<div class="bg-green-50 border border-green-200 rounded p-2 text-xs overflow-x-auto [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!border-0 [&_pre]:!whitespace-pre-wrap [&_pre]:!break-words">
							{@html message.content.highlightedNewContent}
						</div>
					{:else}
						<pre class="bg-green-50 border border-green-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{message.content.newContent}</pre>
					{/if}
				{:else if message.content.tool === 'Read'}
					<div class="text-xs font-medium text-purple-800 mb-2">読み取り対象:</div>
					<div class="text-xs text-gray-600 font-mono">{getRelativePath(message.content.path, cwd)}</div>
				{:else if message.content.tool === 'Bash'}
					<div class="text-xs font-medium text-purple-800 mb-2">コマンド:</div>
					<pre class="bg-gray-100 border border-gray-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{message.content.command}</pre>
				{:else}
					<div class="text-xs font-medium text-purple-800 mb-2">入力:</div>
					<pre class="bg-purple-100 border border-purple-200 rounded p-2 text-xs overflow-x-auto text-purple-700 mb-3">{JSON.stringify(message.content.data, null, 2)}</pre>
				{/if}
			{:else}
				<!-- 従来形式での表示（fallback） -->
				{#if message.name === 'Write'}
					<div class="text-xs font-medium text-purple-800 mb-2">コンテンツ:</div>
					<pre class="bg-sky-50 border border-sky-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{getWriteContent(message.input)}</pre>
				{:else if message.name === 'Edit'}
					<div class="text-xs font-medium text-purple-800 mb-2">変更前:</div>
					<pre class="bg-red-50 border border-red-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono mb-3">{getEditOldString(message.input)}</pre>
					<div class="text-xs font-medium text-purple-800 mb-2">変更後:</div>
					<pre class="bg-green-50 border border-green-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{getEditNewString(message.input)}</pre>
				{:else}
					<div class="text-xs font-medium text-purple-800 mb-2">入力:</div>
					<pre class="bg-purple-100 border border-purple-200 rounded p-2 text-xs overflow-x-auto text-purple-700 mb-3">{JSON.stringify(message.input, null, 2)}</pre>
				{/if}
			{/if}
			
			{#if message.output !== null}
				<div class="text-xs font-medium text-purple-800 mb-2">実行結果:</div>
				{#each message.output as output}
					{#if output.type === "text"}
						<pre class="bg-sky-50 border border-sky-200 rounded p-2 text-xs overflow-x-auto text-gray-800 whitespace-pre-wrap break-words font-mono">{output.text}</pre>
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