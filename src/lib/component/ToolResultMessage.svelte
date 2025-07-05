<script lang="ts">
	import type { SessionMessage } from "$lib/server/domain";

	let { message }: { message: SessionMessage.ToolResultMessage } = $props();
</script>

<div
	class="my-3 p-4 bg-sky-50 border border-sky-200 rounded-lg max-w-[80%] mr-auto"
>
	{#if message.output.type === "text"}
		<pre
			class="text-sm overflow-x-auto m-0 text-gray-800 whitespace-pre-wrap break-words font-mono">{message
				.output.text}</pre>
	{:else if message.output.type === "image"}
		<img
			src={message.output.uri}
			alt="ツール実行結果の画像"
			class="max-w-full max-h-[500px] rounded-md object-contain block mx-auto"
		/>
	{/if}
</div>