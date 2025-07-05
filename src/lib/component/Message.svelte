<script lang="ts">
	import type { SessionMessage } from "$lib/server/domain";
	import UserMessage from "./UserMessage.svelte";
	import AssistantMessage from "./AssistantMessage.svelte";
	import ToolResultMessage from "./ToolResultMessage.svelte";
	import ApprovalMessage from "./ApprovalMessage.svelte";
	import DebugMessage from "./DebugMessage.svelte";

	let { 
		message,
		onapprove,
		ondeny
	}: { 
		message: SessionMessage;
		onapprove?: (event: { approvalId: string; data: any }) => void;
		ondeny?: (event: { approvalId: string; message?: string }) => void;
	} = $props();
</script>

{#if message.type === "user_message"}
	<UserMessage {message} />
{:else if message.type === "assistant_message"}
	<AssistantMessage {message} />
{:else if message.type === "tool_result_message"}
	<ToolResultMessage {message} />
{:else if message.type === "approval_message"}
	<ApprovalMessage {message} {onapprove} {ondeny} />
{:else if message.type === "debug_message"}
	<DebugMessage {message} />
{/if}
