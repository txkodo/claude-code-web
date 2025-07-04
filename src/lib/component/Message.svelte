<script lang="ts">
	import { marked } from "marked";
	import type { SessionMessage } from "$lib/server/domain";

	let { message }: { message: SessionMessage } = $props();

	function parseMarkdown(content: string): string {
		return marked(content, { async: false });
	}
</script>

{#if message.type === "tool_result_message"}
	<div class="message assistant tool-result">
		{#if message.output.type === "text"}
			<pre class="tool-output-text">{message.output.text}</pre>
		{:else if message.output.type === "image"}
			<img
				src={message.output.uri}
				alt="ツール実行結果の画像"
				class="tool-result-image"
			/>
		{/if}
	</div>
{:else if message.type === "user_message"}
	<div class="message user">
		<div class="message-content">
			{@html parseMarkdown(message.content)}
		</div>
	</div>
{:else if message.type === "assistant_message"}
	<div class="message assistant">
		<div class="message-content">
			{@html parseMarkdown(message.content)}
		</div>
	</div>
{/if}

<style>
	.message {
		margin: 12px 0;
		padding: 12px 16px;
		border-radius: 8px;
		max-width: 80%;
		position: relative;
	}

	.message.user {
		background: #e3f2fd;
		border: 1px solid #1976d2;
		margin-left: auto;
	}

	.message.assistant {
		background: #f8f9fa;
		border: 1px solid #6c757d;
		margin-right: auto;
	}

	.message-content {
		line-height: 1.6;
		word-wrap: break-word;
	}

	.message-content :global(pre) {
		background: #f8f9fa;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		padding: 16px;
		margin: 12px 0;
		font-size: 14px;
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas,
			"Liberation Mono", Menlo, monospace;
		overflow-x: auto;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.message-content :global(code) {
		background: #f3f4f6;
		border-radius: 4px;
		padding: 2px 6px;
		font-size: 0.9em;
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas,
			"Liberation Mono", Menlo, monospace;
	}

	.message-content :global(pre code) {
		background: transparent;
		border-radius: 0;
		padding: 0;
		font-size: inherit;
	}

	.message-content :global(ul),
	.message-content :global(ol) {
		padding-left: 20px;
		margin: 12px 0;
	}

	.message-content :global(li) {
		margin: 4px 0;
	}

	.message-content :global(h1),
	.message-content :global(h2),
	.message-content :global(h3),
	.message-content :global(h4),
	.message-content :global(h5),
	.message-content :global(h6) {
		margin: 16px 0 8px 0;
		font-weight: 600;
	}

	.message-content :global(h1) {
		font-size: 1.5em;
	}

	.message-content :global(h2) {
		font-size: 1.3em;
	}

	.message-content :global(h3) {
		font-size: 1.1em;
	}

	.message-content :global(blockquote) {
		border-left: 4px solid #e5e7eb;
		padding-left: 16px;
		margin: 12px 0;
		color: #6b7280;
		font-style: italic;
	}

	.message-content :global(table) {
		border-collapse: collapse;
		width: 100%;
		margin: 12px 0;
	}

	.message-content :global(th),
	.message-content :global(td) {
		border: 1px solid #e5e7eb;
		padding: 8px 12px;
		text-align: left;
	}

	.message-content :global(th) {
		background: #f9fafb;
		font-weight: 600;
	}

	.message-content :global(p) {
		margin: 8px 0;
	}

	.message-content :global(strong) {
		font-weight: 600;
	}

	.message-content :global(em) {
		font-style: italic;
	}

	.message.tool-result {
		background: #f0f9ff;
		border: 1px solid #0ea5e9;
		border-radius: 8px;
		margin: 12px 0;
		padding: 16px;
	}

	.message.tool-result .tool-output-text {
		background: #ffffff;
		border-radius: 6px;
		padding: 16px;
		font-size: 14px;
		overflow-x: auto;
		margin: 0;
		color: #1f2937;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
		font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas,
			"Liberation Mono", Menlo, monospace;
	}

	.message.tool-result .tool-result-image {
		max-width: 100%;
		max-height: 500px;
		border-radius: 6px;
		object-fit: contain;
		display: block;
		margin: 0 auto;
	}
</style>
