<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";
	import ChatInterface from "$lib/component/ChatInterface.svelte";
	import { apiClient } from "$lib/client/api.svelte";
	import type { SessionStatus } from "$lib/server/domain";

	let sessionExists = $state(false);
	let isLoading = $state(true);
	let error: string | null = $state(null);
	let sessionStatus: SessionStatus | null = $state(null);

	let sessionId = $derived($page.params.sessionId);

	onMount(async () => {
		await loadSession();
	});

	async function loadSession() {
		if (!sessionId) return;

		isLoading = true;
		error = null;

		try {
			const response = await apiClient.session.$get();
			if (response.ok) {
				const data = await response.json();
				sessionExists = data.sessionIds.includes(sessionId);
				if (!sessionExists) {
					error = "セッションが見つかりません";
				} else {
					// Load session status
					try {
						const statusResponse = await apiClient.session[
							":sessionId"
						].status.$get({ param: { sessionId } });
						if (statusResponse.ok) {
							const statusData = await statusResponse.json();
							sessionStatus = statusData.status;
						}
					} catch (statusError) {
						console.error(
							"Failed to load session status:",
							statusError,
						);
					}
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

	function getStatusColor(status: SessionStatus["status"]): string {
		switch (status) {
			case "running":
				return "bg-green-500";
			case "waiting_for_approval":
				return "bg-yellow-500";
			case "idle":
				return "bg-gray-500";
			default:
				return "bg-gray-500";
		}
	}

	function getStatusText(status: SessionStatus["status"]): string {
		switch (status) {
			case "running":
				return "実行中";
			case "waiting_for_approval":
				return "承認待ち";
			case "idle":
				return "待機中";
			default:
				return "不明";
		}
	}
</script>

<div class="max-w-6xl mx-auto h-[100vh] flex flex-col">
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
		<div class="mb-4">
			{#if sessionStatus}
				<div
					class="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<h2 class="text-lg font-semibold text-gray-800">
								セッション {sessionId}
							</h2>
							<div class="flex items-center gap-2">
								<div
									class="w-2 h-2 rounded-full {getStatusColor(
										sessionStatus.status,
									)}"
								></div>
								<span class="text-sm text-gray-600"
									>{getStatusText(sessionStatus.status)}</span
								>
							</div>
						</div>
						<button
							class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors duration-200"
							onclick={goBack}
						>
							戻る
						</button>
					</div>
					<div class="text-xs text-gray-500 mt-2">
						{sessionStatus.cwd}
					</div>
				</div>
			{:else}
				<div
					class="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
				>
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-gray-800">
							セッション {sessionId}
						</h2>
						<button
							class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors duration-200"
							onclick={goBack}
						>
							戻る
						</button>
					</div>
				</div>
			{/if}
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
