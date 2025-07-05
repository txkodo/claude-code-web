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
	<div class="text-xs text-purple-600 mb-2">ツール実行中...</div>
	<pre
		class="bg-purple-100 border border-purple-200 rounded p-2 text-xs overflow-x-auto text-purple-700">{JSON.stringify(
			message.input,
			null,
			2,
		)}</pre>
</div>