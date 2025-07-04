<script lang="ts">
	import { marked } from "marked";
	import type { SessionMessage } from "$lib/server/domain";

	let { message }: { message: SessionMessage } = $props();

	function parseMarkdown(content: string): string {
		return marked(content, { async: false });
	}
</script>

{#if message.type === "tool_result_message"}
	<div
		class="my-3 p-4 bg-sky-50 border border-sky-200 rounded-lg max-w-[80%] mr-auto"
	>
		{#if message.output.type === "text"}
			<pre
				class="bg-white rounded-md p-4 text-sm overflow-x-auto m-0 text-gray-800 leading-6 whitespace-pre-wrap break-words font-mono">{message
					.output.text}</pre>
		{:else if message.output.type === "image"}
			<img
				src={message.output.uri}
				alt="ツール実行結果の画像"
				class="max-w-full max-h-[500px] rounded-md object-contain block mx-auto"
			/>
		{/if}
	</div>
{:else if message.type === "user_message"}
	<div
		class="my-3 p-3 px-4 bg-blue-50 border border-blue-500 rounded-lg max-w-[80%] ml-auto relative"
	>
		<div class="leading-6 break-words prose prose-sm max-w-none">
			{@html parseMarkdown(message.content)}
		</div>
	</div>
{:else if message.type === "assistant_message"}
	<div
		class="my-3 p-3 px-4 bg-gray-50 border border-gray-500 rounded-lg max-w-[80%] mr-auto relative"
	>
		<div class="leading-6 break-words prose prose-sm max-w-none">
			{@html parseMarkdown(message.content)}
		</div>
	</div>
{/if}
