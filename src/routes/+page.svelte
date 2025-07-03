<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import DirectorySelector from '$lib/component/DirectorySelector.svelte';

	let sessionIds: string[] = [];
	let isLoading = false;
	let showCreateForm = false;
	let selectedDirectory = '';

	onMount(async () => {
		await loadSessions();
	});

	async function loadSessions() {
		isLoading = true;
		try {
			const response = await fetch('/api/session');
			if (!response.ok) {
				throw new Error(`Failed to list sessions: ${response.statusText}`);
			}
			const data = await response.json();
			sessionIds = data.sessionIds;
		} catch (error) {
			console.error('Failed to load sessions:', error);
		} finally {
			isLoading = false;
		}
	}

	async function createSession() {
		if (!selectedDirectory) return;

		try {
			const response = await fetch('/api/session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ cwd: selectedDirectory }),
			});
			
			if (!response.ok) {
				throw new Error(`Failed to create session: ${response.statusText}`);
			}
			
			const data = await response.json();
			goto(`/${data.sessionId}`);
		} catch (error) {
			console.error('Failed to create session:', error);
		}
	}


	function handleDirectorySelect(event: CustomEvent<string>) {
		selectedDirectory = event.detail;
	}

	function formatDate(date: string | Date): string {
		const d = new Date(date);
		return d.toLocaleString('ja-JP');
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
				<button class="btn" on:click={() => showCreateForm = !showCreateForm}>
					{showCreateForm ? 'キャンセル' : '新しいセッション'}
				</button>
			</div>

			{#if showCreateForm}
				<div class="card create-session">
					<h3>新しいセッションを作成</h3>

					<DirectorySelector on:directorySelected={handleDirectorySelect} />
					
					{#if selectedDirectory}
						<div class="directory-info">
							選択されたディレクトリ: {selectedDirectory}
						</div>
					{/if}

					<div class="form-actions">
						<button 
							class="btn" 
							on:click={createSession}
							disabled={!selectedDirectory}
						>
							セッションを作成
						</button>
					</div>
				</div>
			{/if}

			{#if sessionIds.length === 0}
				<div class="empty-state">
					<p>セッションがありません。新しいセッションを作成してください。</p>
				</div>
			{:else}
				<div class="sessions-grid">
					{#each sessionIds as sessionId}
						<div class="session-card">
							<div class="session-header">
								<h3>セッション {sessionId}</h3>
							</div>
							<div class="session-actions">
								<button class="btn" on:click={() => goto(`/${sessionId}`)}>
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

	.form-group {
		margin-bottom: 20px;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 500;
		color: #374151;
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

	.session-info {
		margin-bottom: 16px;
	}

	.session-info p {
		margin: 4px 0;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.session-actions {
		display: flex;
		gap: 10px;
	}

	.btn-icon {
		padding: 4px 8px;
		font-size: 0.8rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		background: #dc3545;
		color: white;
	}

	.btn-icon:hover {
		background: #c82333;
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