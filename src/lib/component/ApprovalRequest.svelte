<script lang="ts">
	interface ApprovalRequest {
		approvalId: string;
		data: any;
	}

	let { approvalRequest, onapprove, ondeny }: { 
		approvalRequest: ApprovalRequest;
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

<div class="approval-request">
	<div class="approval-header">
		<h3>承認が必要です</h3>
	</div>
	<div class="approval-content">
		<p>以下の操作を実行してもよろしいですか？</p>
		<pre>{JSON.stringify(approvalRequest.data, null, 2)}</pre>
	</div>
	<div class="approval-actions">
		<button
			class="btn btn-primary"
			onclick={handleApprove}
		>
			許可する
		</button>
		<button
			class="btn btn-danger"
			onclick={handleDeny}
		>
			拒否する
		</button>
	</div>
</div>

<style>
	.approval-request {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 8px;
		padding: 16px;
		margin-bottom: 16px;
	}

	.approval-header h3 {
		margin: 0 0 12px 0;
		color: #856404;
		font-size: 16px;
	}

	.approval-content p {
		margin: 0 0 12px 0;
		color: #856404;
	}

	.approval-content pre {
		background: #f8f9fa;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 12px;
		font-size: 12px;
		overflow-x: auto;
		margin: 0 0 16px 0;
		color: #374151;
	}

	.approval-actions {
		display: flex;
		gap: 8px;
	}

	.btn {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: background-color 0.2s;
	}

	.btn-primary {
		background: #007bff;
		color: white;
	}

	.btn-primary:hover {
		background: #0056b3;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
	}

	.btn-danger:hover {
		background: #c82333;
	}
</style>