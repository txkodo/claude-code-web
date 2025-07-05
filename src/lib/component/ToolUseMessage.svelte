<script lang="ts">
	import type { SessionMessage } from "$lib/server/domain";

	let { message }: { message: SessionMessage.ToolUseMessage } = $props();
</script>

<div
	class="my-3 p-3 px-4 bg-purple-50 border border-purple-200 rounded-lg max-w-[80%] mr-auto relative"
>
	<div class="text-sm font-medium text-purple-800 mb-2">
		🔧 {message.name}
	</div>
	{#if message.output === null}
		<div class="text-xs text-purple-600 mb-2">ツール実行中...</div>
	{:else}
		<div class="text-xs text-green-600 mb-2">✅ ツール実行完了</div>
	{/if}
	<pre
		class="bg-purple-100 border border-purple-200 rounded p-2 text-xs overflow-x-auto text-purple-700">{JSON.stringify(
			message.input,
			null,
			2,
		)}</pre>
	{#if message.output !== null}
		<div class="mt-3 pt-3 border-t border-purple-200">
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
		</div>
	{/if}
</div>