import type { AgentMessage, CodingAgent, CodingAgentFactory, CodingPermission } from "$lib/domain";
import { query } from '@anthropic-ai/claude-code';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
// import { serve } from "bun";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { z } from "zod";

export class ClaudeCodingAgent implements CodingAgent {
  #cwd: string;
  #claudeCodeSessionId: string | undefined;
  #abortController: AbortController | undefined;
  #mcp: { url: string, close: () => Promise<void> };
  #permitActionCallback: ((data: any) => Promise<CodingPermission>) | undefined;

  constructor(cwd: string) {
    this.#cwd = cwd;
    this.#claudeCodeSessionId = undefined;
    this.#abortController = undefined;
    this.#mcp = this.#startApprovalPromptMcpServer();
    this.#permitActionCallback = undefined;
  }

  async *process(props: {
    prompt: string,
    permitAction: (data: any) => Promise<CodingPermission>
  }): AsyncIterable<AgentMessage> {
    if (this.#abortController) {
      throw new Error('作業中です.');
    }

    try {
      this.#abortController = new AbortController();
      this.#permitActionCallback = props.permitAction;

      // ClaudeCode実行
      for await (const sdkMessage of query({
        prompt: props.prompt,
        options: {
          resume: this.#claudeCodeSessionId,
          abortController: this.#abortController,
          cwd: this.#cwd,
          executable: "bun",
          mcpServers: { permission_prompt: { type: "http", url: this.#mcp.url, } },
          permissionPromptToolName: "permission_prompt__approval_prompt"
        }
      })) {
        // セッションIDを保存（再開可能にするため）
        if (sdkMessage.session_id) {
          this.#claudeCodeSessionId = sdkMessage.session_id;
        }

        // メッセージを適切な形式に変換して yield
        yield {
          msgId: crypto.randomUUID(),
          content: JSON.stringify(sdkMessage)
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Unknown error: ${error}`);
      }
    } finally {
      this.#abortController = undefined;
      this.#permitActionCallback = undefined;
    }
  }

  #startApprovalPromptMcpServer() {
    // const bunServer = serve({
    //   port: 0, // Use port 0 to get an available port automatically
    //   routes: {
    //     "/mcp": async (bunReq) => {
    //       const server = new McpServer({ name: "PermissionPromptServer", version: "1.0.0" });
    //       server.tool(
    //         "approval_prompt",
    //         '権限チェックをユーザに問い合わせる',
    //         {
    //           tool_name: z.string().describe("権限を要求するツール"),
    //           input: z.object({}).passthrough().describe("ツールの入力"),
    //         },
    //         async ({ input }) => {
    //           if (!this.#permitActionCallback) {
    //             throw new Error("No permit action callback available");
    //           }

    //           // 権限確認を実行
    //           const permission = await this.#permitActionCallback(input);

    //           return {
    //             content: [{ type: "text", text: JSON.stringify(permission) }]
    //           };
    //         }
    //       );

    //       const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    //       server.connect(transport);
    //       try {
    //         const body = await bunReq.json();
    //         const { req, res } = toReqRes(bunReq);
    //         await transport.handleRequest(req, res, body);
    //         return toFetchResponse(res);
    //       } finally {
    //         server.close();
    //         transport.close();
    //       }
    //     }
    //   }
    // });

    // const url = `http://${bunServer.hostname}:${bunServer.port}/mcp`;

    return {
      url:"http://localhost:3002/api/mcp",
      async close() {
        // await bunServer.stop();
      }
    };
  }

  async close(): Promise<void> {
    if (this.#abortController) {
      this.#abortController.abort();
    }
    await this.#mcp.close();
  }
}

export class ClaudeCodingAgentFactory implements CodingAgentFactory {
  createAgent(cwd: string): CodingAgent {
    return new ClaudeCodingAgent(cwd);
  }
}