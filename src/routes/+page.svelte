<script lang="ts">
	import { onMount } from 'svelte';
	import ChatInterface from '$lib/ChatInterface.svelte';
	import DirectorySelector from '$lib/DirectorySelector.svelte';

	let selectedDirectory = '';
	let apiKey = '';
	let isConfigured = false;

	onMount(() => {
		// Load saved configuration
		const savedApiKey = localStorage.getItem('anthropic-api-key');
		const savedDirectory = localStorage.getItem('selected-directory');
		
		if (savedApiKey) {
			apiKey = savedApiKey;
		}
		if (savedDirectory) {
			selectedDirectory = savedDirectory;
		}
		
		isConfigured = !!(apiKey && selectedDirectory);
	});

	function handleDirectorySelect(event: CustomEvent<string>) {
		selectedDirectory = event.detail;
		localStorage.setItem('selected-directory', selectedDirectory);
		checkConfiguration();
	}

	function handleApiKeyChange() {
		localStorage.setItem('anthropic-api-key', apiKey);
		checkConfiguration();
	}

	function checkConfiguration() {
		isConfigured = !!(apiKey && selectedDirectory);
	}

	function resetConfiguration() {
		apiKey = '';
		selectedDirectory = '';
		localStorage.removeItem('anthropic-api-key');
		localStorage.removeItem('selected-directory');
		isConfigured = false;
	}
</script>

<div class="container">
	<h1>Claude Code Web App</h1>
	
	{#if !isConfigured}
		<div class="card">
			<h2>設定</h2>
			
			<div class="form-group">
				<label for="api-key">Anthropic API Key:</label>
				<input
					id="api-key"
					type="password"
					bind:value={apiKey}
					on:input={handleApiKeyChange}
					placeholder="sk-ant-..."
					class="input"
				/>
			</div>

			<DirectorySelector on:directorySelected={handleDirectorySelect} />
			
			{#if selectedDirectory}
				<div class="directory-info">
					選択されたディレクトリ: {selectedDirectory}
				</div>
			{/if}
		</div>
	{:else}
		<div class="card">
			<div class="config-info">
				<h3>現在の設定</h3>
				<p><strong>ディレクトリ:</strong> {selectedDirectory}</p>
				<p><strong>API Key:</strong> 設定済み</p>
				<button class="btn btn-danger" on:click={resetConfiguration}>
					設定をリセット
				</button>
			</div>
		</div>

		<ChatInterface {apiKey} directory={selectedDirectory} />
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

	.form-group {
		margin-bottom: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 500;
		color: #374151;
	}

	.config-info {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.config-info p {
		margin: 0;
		color: #6b7280;
	}
</style>