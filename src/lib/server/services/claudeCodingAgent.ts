import type { AgentMessage, CodingAgent, CodingAgentFactory, CodingPermission } from "$lib/server/domain";
import { query } from '@anthropic-ai/claude-code';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
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
    console.log("startssss")
    if (this.#abortController) {
      throw new Error('作業中です.');
    }

    try {
      this.#abortController = new AbortController();
      this.#permitActionCallback = props.permitAction;

      console.log("query")
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
        console.log("EACH")
        // セッションIDを保存（再開可能にするため）
        if (sdkMessage.session_id) {
          this.#claudeCodeSessionId = sdkMessage.session_id;
        }

        // メッセージを適切な形式に変換して yield
        yield {
          msgId: crypto.randomUUID(),
          content: JSON.stringify(sdkMessage)
        };
        console.log("f")
      }
      console.log("FIN")
    } catch (error) {
      console.log(error)
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
    const mcpTmpServer = createServer(async (req, res) => {
      if (req.url === '/mcp' && req.method === 'POST') {
        const server = new McpServer({ name: "PermissionPromptServer", version: "1.0.0" });
        server.tool(
          "approval_prompt",
          '権限チェックをユーザに問い合わせる',
          {
            tool_name: z.string().describe("権限を要求するツール"),
            input: z.object({}).passthrough().describe("ツールの入力"),
          },
          async ({ input }) => {
            if (!this.#permitActionCallback) {
              throw new Error("No permit action callback available");
            }

            // 権限確認を実行
            const permission = await this.#permitActionCallback(input);

            return {
              content: [{ type: "text", text: JSON.stringify(permission) }]
            };
          }
        );

        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        server.connect(transport);
        try {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const parsedBody = JSON.parse(body);
              await transport.handleRequest(req, res, parsedBody);
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        } finally {
          server.close();
          transport.close();
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    mcpTmpServer.listen(0); // Use port 0 to get an available port automatically
    const address = mcpTmpServer.address();
    const port = typeof address === 'string' ? 0 : address?.port || 0;
    const url = `http://localhost:${port}/mcp`;

    return {
      url,
      async close() {
        mcpTmpServer.close();
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