<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import DirectorySelector from "$lib/component/DirectorySelector.svelte";
	import { apiClient } from "$lib/client/api.svelte";

	let sessionIds: string[] = $state([]);
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
		} catch (error) {
			console.error("Failed to load sessions:", error);
		} finally {
			isLoading = false;
		}
	}

	async function createSession() {
		if (!selectedDirectory) return;

		try {
			const res = await apiClient
				.session.$post({
					json: { cwd: selectedDirectory },
				})
				.then((res) => res.json());

			goto(`/${res.sessionId}`);
		} catch (error) {
			console.error("Failed to create session:", error);
		}
	}

	function handleDirectorySelect(event: CustomEvent<string>) {
		selectedDirectory = event.detail;
	}

	function formatDate(date: string | Date): string {
		const d = new Date(date);
		return d.toLocaleString("ja-JP");
	}
</script>

<div class="container">
	<h1>Claude Code セッション</h1>

	{#if isLoading}
		<div class="loading">読み込み中...</div>
	{:else}
		<div class="sessions-section">
			<div class="section-header">
				<h2>セッション一覧</h2>
				<button
					class="btn"
					onclick={() => (showCreateForm = !showCreateForm)}
				>
					{showCreateForm ? "キャンセル" : "新しいセッション"}
				</button>
			</div>

			{#if showCreateForm}
				<div class="card create-session">
					<h3>新しいセッションを作成</h3>

					<DirectorySelector
						on:directorySelected={handleDirectorySelect}
					/>

					{#if selectedDirectory}
						<div class="directory-info">
							選択されたディレクトリ: {selectedDirectory}
						</div>
					{/if}

					<div class="form-actions">
						<button
							class="btn"
							onclick={createSession}
							disabled={!selectedDirectory}
						>
							セッションを作成
						</button>
					</div>
				</div>
			{/if}

			{#if sessionIds.length === 0}
				<div class="empty-state">
					<p>
						セッションがありません。新しいセッションを作成してください。
					</p>
				</div>
			{:else}
				<div class="sessions-grid">
					{#each sessionIds as sessionId}
						<div class="session-card">
							<div class="session-header">
								<h3>セッション {sessionId}</h3>
							</div>
							<div class="session-actions">
								<button
									class="btn"
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

<style>
	h1 {
		text-align: center;
		color: white;
		margin-bottom: 30px;
		font-size: 2.5rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	h2 {
		margin-bottom: 20px;
		color: #374151;
	}

	h3 {
		margin-bottom: 12px;
		color: #374151;
	}

	.loading {
		text-align: center;
		padding: 40px;
		color: #6b7280;
	}

	.sessions-section {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.create-session {
		margin-bottom: 30px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}

	.empty-state {
		text-align: center;
		padding: 60px 20px;
		color: #6b7280;
	}

	.sessions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 20px;
	}

	.session-card {
		background: white;
		border-radius: 8px;
		padding: 20px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16px;
	}

	.session-header h3 {
		margin: 0;
		color: #1f2937;
		font-size: 1.1rem;
	}

	.session-actions {
		display: flex;
		gap: 10px;
	}

	.directory-info {
		background: #f3f4f6;
		padding: 10px;
		border-radius: 4px;
		margin-top: 10px;
		font-size: 0.9rem;
		color: #374151;
	}
</style>
