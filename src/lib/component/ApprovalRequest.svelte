<script lang="ts">
	interface ApprovalRequest {
		approvalId: string;
		data: any;
	}

	let {
		approvalRequest,
		approvalStatus,
		onapprove,
		ondeny,
	}: {
		approvalRequest: ApprovalRequest;
		approvalStatus?: "pending" | "approved" | "denied";
		onapprove: (event: { approvalId: string; data: any }) => void;
		ondeny: (event: { approvalId: string; message?: string }) => void;
	} = $props();

	function handleApprove() {
		onapprove({
			approvalId: approvalRequest.approvalId,
			data: approvalRequest.data,
		});
	}

	function handleDeny() {
		ondeny({
			approvalId: approvalRequest.approvalId,
			message: "拒否されました",
		});
	}
</script>

<div
	class="rounded-lg p-4 mb-4 {approvalStatus === 'approved'
		? 'bg-green-100 border border-green-200'
		: approvalStatus === 'denied'
			? 'bg-red-100 border border-red-200'
			: 'bg-yellow-100 border border-yellow-200'}"
>
	<div class="mb-3">
		<h3 class="m-0 text-yellow-800 text-base">
			{#if approvalStatus === "approved"}
				✅ 承認済み
			{:else if approvalStatus === "denied"}
				❌ 拒否済み
			{:else}
				⏳ 承認が必要です
			{/if}
		</h3>
	</div>
	<div class="mb-4">
		<p class="mb-3 text-yellow-800">
			以下の操作を実行してもよろしいですか？
		</p>
		<pre
			class="bg-gray-50 border border-gray-200 rounded p-3 text-xs overflow-x-auto text-gray-700">{JSON.stringify(
				approvalRequest.data,
				null,
				2,
			)}</pre>
	</div>
	{#if approvalStatus === "pending" || !approvalStatus}
		<div class="flex gap-2">
			<button
				class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded cursor-pointer text-sm transition-colors duration-200"
				onclick={handleApprove}
			>
				許可する
			</button>
			<button
				class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white border-none rounded cursor-pointer text-sm transition-colors duration-200"
				onclick={handleDeny}
			>
				拒否する
			</button>
		</div>
	{/if}
</div>
