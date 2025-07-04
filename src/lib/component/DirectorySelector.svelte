<script lang="ts">
	let {
		ondirectorySelected,
	}: {
		ondirectorySelected: (directory: string) => void;
	} = $props();

	let directoryInput = $state<HTMLInputElement>();
	let selectedDirectory = $state("");

	async function handleDirectorySelect() {
		try {
			// Use the File System Access API if available (Chrome/Edge)
			if ("showDirectoryPicker" in window) {
				const dirHandle = await (window as any).showDirectoryPicker();
				selectedDirectory = dirHandle.name;
				ondirectorySelected(selectedDirectory);
			} else {
				// Fallback: ask user to input directory path manually
				const userInput = prompt(
					"ディレクトリのパスを入力してください:",
				);
				if (userInput && userInput.trim()) {
					selectedDirectory = userInput.trim();
					ondirectorySelected(selectedDirectory);
				}
			}
		} catch (error) {
			console.error("Directory selection error:", error);
		}
	}

	function handleManualInput() {
		if (selectedDirectory.trim()) {
			ondirectorySelected(selectedDirectory.trim());
		}
	}
</script>

<div class="mb-5">
	<h3 class="mb-4 text-gray-700 text-lg font-medium">
		作業ディレクトリの選択
	</h3>

	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<button
				class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors duration-200 self-start"
				onclick={handleDirectorySelect}
			>
				ディレクトリを選択
			</button>
			<small class="text-gray-500 text-xs ml-1"
				>ブラウザのディレクトリ選択ダイアログを使用</small
			>
		</div>

		<div class="text-center text-gray-400 text-sm relative my-2">
			<span class="bg-white px-3">または</span>
			<div class="absolute inset-0 flex items-center">
				<div class="w-full border-t border-gray-200"></div>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<input
				bind:this={directoryInput}
				bind:value={selectedDirectory}
				type="text"
				placeholder="/path/to/your/project"
				class="p-3 border border-gray-300 rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100"
				onblur={handleManualInput}
				onkeydown={(e) => e.key === "Enter" && handleManualInput()}
			/>
			<small class="text-gray-500 text-xs ml-1"
				>ディレクトリパスを直接入力</small
			>
		</div>
	</div>
</div>
