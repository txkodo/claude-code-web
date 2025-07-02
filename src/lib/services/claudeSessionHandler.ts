import type { SessionEvent, SessionHandler, SessionHandlerFactory, UserMessage } from "$lib/domain";
import { query } from '@anthropic-ai/claude-code';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { serve } from "bun";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { z } from "zod";

export class ClaudeSessionHandler implements SessionHandler {
  #sessionId: string;
  #claudeCodeSessionId: string | undefined;
  #abortController: AbortController | undefined;
  #cwd: string
  #mcp: { url: string, close: () => Promise<void> };
  #handlers: ((event: SessionEvent) => void)[];

  constructor(sessionId: string, cwd: string) {
    this.#sessionId = sessionId;
    this.#claudeCodeSessionId = undefined;
    this.#abortController = undefined;
    this.#cwd = cwd;
    this.#mcp = this.#startApprovalPromptMcpServer();
    this.#handlers = [];
  }

  sessionId(): string {
    return this.#sessionId;
  }

  async pushMessage(massage: UserMessage): Promise<void | Error> {
    if (this.#abortController) {
      return new Error('作業中です.');
    }

    try {
      this.#abortController = new AbortController();

      // ClaudeCode実行
      for await (const sdkMessage of query({
        prompt: massage.content,
        options: {
          resume: this.#claudeCodeSessionId,
          abortController: this.#abortController,
          cwd: this.#cwd,
          executable: "bun",
          mcpServers: { permission_prompt: { type: "http", url: this.#mcp.url, } },
          permissionPromptToolName: "permission_prompt__approval_prompt"
        }
      })) {
        // TODO: sdkMessage の内容を適切に処理する
        this.#emitEvent({
          type: "push_agent_message",
          message: {
            msgId: crypto.randomUUID(),
            content: JSON.stringify(sdkMessage)
          }
        })
      }
    } catch (error) {
      if (error instanceof Error) {
        return error;
      } else {
        return new Error(`Unknown error: ${error}`);
      }
    }
  }

  listenEvent(listener: (event: SessionEvent, unsubnscribe: () => void) => void): { unsubscribe(): void; } {
    let unsubscribe = () => { }
    let _listener = (event: SessionEvent) => listener(event, unsubscribe);
    this.#handlers.push(_listener);
    unsubscribe = () => this.#handlers = this.#handlers.filter(h => h !== _listener);
    return { unsubscribe };
  }

  #emitEvent(event: SessionEvent): void {
    for (const handler of this.#handlers) {
      handler(event);
    }
  }

  #startApprovalPromptMcpServer() {
    const bunServer = serve({
      routes: {
        "/mcp": async (bunReq) => {
          const server = new McpServer({ name: "PermissionPromptServer", version: "1.0.0" });
          server.tool(
            "approval_prompt",
            '権限チェックをユーザに問い合わせる',
            {
              tool_name: z.string().describe("権限を要求するツール"),
              input: z.object({}).passthrough().describe("ツールの入力"),
            },
            async ({ input }) => {
              const approvalId = crypto.randomUUID();

              // イベント発行
              this.#emitEvent(
                {
                  type: "ask_approval",
                  approvalId,
                  data: input,
                }
              )

              // イベントの答えが来るまで待機
              const approvalAnswer = new Promise(resolve => {
                this.listenEvent((event, unsubnscribe) => {
                  if (event.type === "answer_approval" && event.approvalId === approvalId) {
                    unsubnscribe()
                    resolve(event.data)
                  }
                })
              })

              return {
                content: [{ type: "text", text: JSON.stringify(approvalAnswer) }]
              }
            }
          )
          const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
          server.connect(transport);
          try {
            const body = await bunReq.json();
            const { req, res } = toReqRes(bunReq);
            await transport.handleRequest(req, res, body);
            return toFetchResponse(res)
          } finally {
            server.close();
            transport.close();
          }
        }
      }
    })

    const url = `http://${bunServer.hostname}:${bunServer.port}/mcp`;

    return {
      url,
      async close() {
        await bunServer.stop();
      }
    }
  }

  async close() {
    await this.#mcp.close()
  }
}

export class ClaudeSessionHandlerFactory implements SessionHandlerFactory {
  createSession(cwd: string, id: string): SessionHandler {
    return new ClaudeSessionHandler(id, cwd);
  }
}