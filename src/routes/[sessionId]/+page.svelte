<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ChatInterface from '$lib/ChatInterface.svelte';
	import type { ChatSession } from '$lib/sessionManager';

	let session: ChatSession | null = null;
	let isLoading = true;
	let error: string | null = null;

	$: sessionId = $page.params.sessionId;

	onMount(async () => {
		await loadSession();
	});

	async function loadSession() {
		if (!sessionId) return;
		
		isLoading = true;
		error = null;
		
		try {
			const response = await fetch(`/api/sessions/${sessionId}`);
			if (response.ok) {
				session = await response.json();
			} else if (response.status === 404) {
				error = 'セッションが見つかりません';
			} else {
				error = 'セッションの読み込みに失敗しました';
			}
		} catch (err) {
			console.error('Failed to load session:', err);
			error = 'セッションの読み込み中にエラーが発生しました';
		} finally {
			isLoading = false;
		}
	}

	function goBack() {
		goto('/');
	}
</script>

<div class="container">
	{#if isLoading}
		<div class="loading">セッションを読み込み中...</div>
	{:else if error}
		<div class="error-state">
			<h2>エラー</h2>
			<p>{error}</p>
			<button class="btn" on:click={goBack}>
				セッション一覧に戻る
			</button>
		</div>
	{:else if session}
		<div class="session-header">
			<div class="session-info">
				<h1>{session.name}</h1>
				<p class="session-details">
					<strong>ディレクトリ:</strong> {session.cwd}
				</p>
			</div>
			<button class="btn btn-secondary" on:click={goBack}>
				セッション一覧に戻る
			</button>
		</div>

		<ChatInterface directory={session.cwd} {sessionId} />
	{:else}
		<div class="error-state">
			<h2>セッションが見つかりません</h2>
			<button class="btn" on:click={goBack}>
				セッション一覧に戻る
			</button>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.loading {
		text-align: center;
		padding: 60px 20px;
		color: #6b7280;
		font-size: 1.1rem;
	}

	.error-state {
		text-align: center;
		padding: 60px 20px;
	}

	.error-state h2 {
		color: #dc3545;
		margin-bottom: 16px;
	}

	.error-state p {
		color: #6b7280;
		margin-bottom: 24px;
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20px;
		padding: 20px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.session-info h1 {
		margin: 0 0 8px 0;
		color: #1f2937;
		font-size: 1.5rem;
	}

	.session-details {
		margin: 0;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background: #4b5563;
	}
</style>