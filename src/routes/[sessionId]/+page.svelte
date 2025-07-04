<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import ChatInterface from "$lib/component/ChatInterface.svelte";

	let sessionExists = $state(false);
	let isLoading = $state(true);
	let error: string | null = $state(null);

	let sessionId = $derived($page.params.sessionId);

	onMount(async () => {
		await loadSession();
	});

	async function loadSession() {
		if (!sessionId) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch("/api/session");
			if (response.ok) {
				const data = await response.json();
				sessionExists = data.sessionIds.includes(sessionId);
				if (!sessionExists) {
					error = "セッションが見つかりません";
				}
			} else {
				error = "セッションの読み込みに失敗しました";
			}
		} catch (err) {
			console.error("Failed to load session:", err);
			error = "セッションの読み込み中にエラーが発生しました";
		} finally {
			isLoading = false;
		}
	}

	function goBack() {
		goto("/");
	}
</script>

<div class="max-w-6xl mx-auto p-5">
	{#if isLoading}
		<div class="text-center py-15 px-5 text-gray-600 text-lg">
			セッションを読み込み中...
		</div>
	{:else if error}
		<div class="text-center py-15 px-5">
			<h2 class="text-red-600 mb-4 text-xl font-semibold">エラー</h2>
			<p class="text-gray-600 mb-6">{error}</p>
			<button
				class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
				onclick={goBack}
			>
				セッション一覧に戻る
			</button>
		</div>
	{:else if sessionExists}
		<div
			class="flex justify-between items-start mb-5 p-5 bg-white rounded-lg shadow-sm border border-gray-200"
		>
			<div>
				<h1 class="text-gray-800 text-2xl font-semibold mb-2">
					セッション {sessionId}
				</h1>
			</div>
			<button
				class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200"
				onclick={goBack}
			>
				セッション一覧に戻る
			</button>
		</div>

		<ChatInterface {sessionId} />
	{:else}
		<div class="text-center py-15 px-5">
			<h2 class="text-red-600 mb-4 text-xl font-semibold">
				セッションが見つかりません
			</h2>
			<button
				class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
				onclick={goBack}
			>
				セッション一覧に戻る
			</button>
		</div>
	{/if}
</div>
