import { query } from "@anthropic-ai/claude-code";

for await (const sdkMessage of query({
    prompt: "現在の編集状況",
    options: {
        // resume: this.#claudeCodeSessionId,
        // abortController: this.#abortController,
        cwd: process.cwd(),
        executable: "bun",
        // mcpServers: { permission_prompt: { type: "http", url: this.#mcp.url, } },
        // permissionPromptToolName: "permission_prompt__approval_prompt"
        options: {
            maxTurns: 3,
        },
    }
})) {
    console.log(sdkMessage)
}