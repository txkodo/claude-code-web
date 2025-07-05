<script lang="ts">
	import type { SessionMessage } from "$lib/server/domain";

	let { message }: { message: SessionMessage.DebugMessage } = $props();
</script>

<div
	class="my-3 p-3 px-4 bg-gray-100 border border-gray-300 rounded-lg max-w-[80%] mr-auto relative opacity-70"
>
	<div class="text-xs text-gray-500 mb-1">DEBUG</div>
	<pre class="text-sm overflow-x-auto m-0 text-gray-700 whitespace-pre-wrap break-words font-mono">{message.content}</pre>
</div>