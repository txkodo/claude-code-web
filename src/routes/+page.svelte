<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import DirectorySelector from "$lib/component/DirectorySelector.svelte";
	import { apiClient } from "$lib/client/api.svelte";
	import type { SessionStatus } from "$lib/server/domain";

	let sessionIds: string[] = $state([]);
	let sessionStatuses: Map<string, SessionStatus> = $state(new Map());
	let isLoading = $state(false);
	let showCreateForm = $state(false);
	let selectedDirectory = $state<string | null>(null);

	onMount(async () => {
		await loadSessions();
	});

	async function loadSessions() {
		isLoading = true;
		try {
			const res = await apiClient.session
				.$get()
				.then((res) => res.json());
			sessionIds = res.sessionIds;
			
			// Load status for each session
			const statusPromises = sessionIds.map(async (sessionId) => {
				try {
					const statusRes = await apiClient.session[":sessionId"].status
						.$get({ param: { sessionId } })
						.then((res) => res.json());
					return [sessionId, statusRes.status] as const;
				} catch (error) {
					console.error(`Failed to load status for session ${sessionId}:`, error);
					return null;
				}
			});
			
			const statuses = await Promise.all(statusPromises);
			sessionStatuses = new Map(statuses.filter(Boolean));
		} catch (error) {
			console.error("Failed to load sessions:", error);
		} finally {
			isLoading = false;
		}
	}

	async function createSession() {
		if (!selectedDirectory) return;

		try {
			const res = await apiClient.session
				.$post({
					json: { cwd: selectedDirectory },
				})
				.then((res) => res.json());

			goto(`/${res.sessionId}`);
		} catch (error) {
			console.error("Failed to create session:", error);
		}
	}

	function handleDirectorySelect(directory: string) {
		selectedDirectory = directory;
	}

	function formatDate(date: string | Date): string {
		const d = new Date(date);
		return d.toLocaleString("ja-JP");
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

<div class="container mx-auto px-4">
	<h1 class="text-center text-white mb-8 text-4xl drop-shadow-lg">
		Claude Code セッション
	</h1>

	{#if isLoading}
		<div class="text-center py-10 text-gray-600">読み込み中...</div>
	{:else}
		<div class="max-w-6xl mx-auto">
			<div class="flex justify-between items-center mb-5">
				<h2 class="mb-5 text-gray-700 text-xl font-semibold">
					セッション一覧
				</h2>
				<button
					class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
					onclick={() => (showCreateForm = !showCreateForm)}
				>
					{showCreateForm ? "キャンセル" : "新しいセッション"}
				</button>
			</div>

			{#if showCreateForm}
				<div
					class="bg-white rounded-lg p-5 shadow-md border border-gray-200 mb-8"
				>
					<h3 class="mb-3 text-gray-700 text-lg font-medium">
						新しいセッションを作成
					</h3>

					<DirectorySelector
						ondirectorySelected={handleDirectorySelect}
					/>

					{#if selectedDirectory}
						<div
							class="bg-gray-50 p-3 rounded border mt-3 text-sm text-gray-700"
						>
							選択されたディレクトリ: {selectedDirectory}
						</div>
					{/if}

					<div class="flex gap-3 mt-5">
						<button
							class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={createSession}
							disabled={!selectedDirectory}
						>
							セッションを作成
						</button>
					</div>
				</div>
			{/if}

			{#if sessionIds.length === 0}
				<div class="text-center py-15 px-5 text-gray-600">
					<p>
						セッションがありません。新しいセッションを作成してください。
					</p>
				</div>
			{:else}
				<div
					class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
				>
					{#each sessionIds as sessionId}
						{@const status = sessionStatuses.get(sessionId)}
						<div
							class="bg-white rounded-lg p-5 shadow-sm border border-gray-200"
						>
							<div class="flex justify-between items-start mb-4">
								<div class="flex-1">
									<h3 class="text-gray-800 text-lg font-medium">
										セッション {sessionId}
									</h3>
									{#if status}
										<div class="flex items-center gap-2 mt-2">
											<div class="w-2 h-2 rounded-full {getStatusColor(status.status)}"></div>
											<span class="text-sm text-gray-600">{getStatusText(status.status)}</span>
										</div>
										<div class="text-xs text-gray-500 mt-1">
											{status.cwd}
										</div>
									{/if}
								</div>
							</div>
							<div class="flex gap-3">
								<button
									class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200"
									onclick={() => goto(`/${sessionId}`)}
								>
									チャットを開く
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
