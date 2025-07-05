<script lang="ts">
	import { marked } from "marked";
	import type { SessionMessage } from "$lib/server/domain";

	let { message }: { message: SessionMessage.AssistantMessage } = $props();

	function parseMarkdown(content: string): string {
		return marked(content, { async: false });
	}
</script>

<div
	class="my-3 p-3 px-4 bg-gray-50 border border-gray-500 rounded-lg max-w-[80%] mr-auto relative"
>
	<div class="leading-6 break-words prose prose-sm max-w-none">
		{@html parseMarkdown(message.content)}
	</div>
</div>