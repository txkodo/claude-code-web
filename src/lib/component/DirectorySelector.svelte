<script lang="ts">
	let { 
		ondirectorySelected 
	}: { 
		ondirectorySelected: (directory: string) => void;
	} = $props();

	let directoryInput = $state<HTMLInputElement>();
	let selectedDirectory = $state('');

	async function handleDirectorySelect() {
		try {
			// Use the File System Access API if available (Chrome/Edge)
			if ('showDirectoryPicker' in window) {
				const dirHandle = await (window as any).showDirectoryPicker();
				selectedDirectory = dirHandle.name;
				ondirectorySelected(selectedDirectory);
			} else {
				// Fallback: ask user to input directory path manually
				const userInput = prompt('ディレクトリのパスを入力してください:');
				if (userInput && userInput.trim()) {
					selectedDirectory = userInput.trim();
					ondirectorySelected(selectedDirectory);
				}
			}
		} catch (error) {
			console.error('Directory selection error:', error);
		}
	}

	function handleManualInput() {
		if (selectedDirectory.trim()) {
			ondirectorySelected(selectedDirectory.trim());
		}
	}
</script>

<div class="directory-selector">
	<h3>作業ディレクトリの選択</h3>
	
	<div class="selector-options">
		<div class="option">
			<button class="btn" onclick={handleDirectorySelect}>
				ディレクトリを選択
			</button>
			<small>ブラウザのディレクトリ選択ダイアログを使用</small>
		</div>
		
		<div class="divider">または</div>
		
		<div class="option">
			<input
				bind:this={directoryInput}
				bind:value={selectedDirectory}
				type="text"
				placeholder="/path/to/your/project"
				class="input"
				onblur={handleManualInput}
				onkeydown={(e) => e.key === 'Enter' && handleManualInput()}
			/>
			<small>ディレクトリパスを直接入力</small>
		</div>
	</div>
</div>

<style>
	.directory-selector {
		margin-bottom: 20px;
	}

	.directory-selector h3 {
		margin-bottom: 16px;
		color: #374151;
		font-size: 1.1rem;
	}

	.selector-options {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.option {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.option small {
		color: #6b7280;
		font-size: 12px;
		margin-left: 4px;
	}

	.divider {
		text-align: center;
		color: #9ca3af;
		font-size: 14px;
		position: relative;
		margin: 8px 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: #e5e7eb;
	}

	.divider::before {
		left: 0;
	}

	.divider::after {
		right: 0;
	}
</style>