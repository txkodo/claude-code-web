import type { AgentMessage, CodingAgent, CodingAgentFactory, CodingPermission } from "$lib/server/domain";
import { query } from '@anthropic-ai/claude-code';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { z } from "zod";
import type { PermissionMcpServer } from "./permissionMcp";

export class ClaudeCodingAgent implements CodingAgent {
  #cwd: string;
  #claudeCodeSessionId: string | undefined;
  #abortController: AbortController | undefined;
  #permissionMcpServer: PermissionMcpServer;

  constructor(cwd: string, permissionMcpServer: PermissionMcpServer) {
    this.#permissionMcpServer = permissionMcpServer;
    this.#cwd = cwd;
    this.#claudeCodeSessionId = undefined;
    this.#abortController = undefined;
  }

  async *process(props: {
    prompt: string,
    permitAction: (data: any) => Promise<CodingPermission>
  }): AsyncIterable<AgentMessage> {
    if (this.#abortController) {
      throw new Error('作業中です.');
    }

    const mcpSubscription = await this.#permissionMcpServer.subscribe(props.permitAction)

    try {
      this.#abortController = new AbortController();


      // ClaudeCode実行
      for await (const sdkMessage of query({
        prompt: props.prompt,
        options: {
          resume: this.#claudeCodeSessionId,
          abortController: this.#abortController,
          cwd: this.#cwd,
          executable: "bun",
          mcpServers: { permission_prompt: mcpSubscription.mcpServerConfig },
          permissionPromptToolName: `mcp__permission_prompt__${mcpSubscription.toolName}`
        }
      })) {
        console.log(sdkMessage);
        // セッションIDを保存（再開可能にするため）
        if (sdkMessage.session_id) {
          this.#claudeCodeSessionId = sdkMessage.session_id;
        }

        switch (sdkMessage.type) {
          case "system":
          case "assistant":
            break;
          case "user":
            yield {
              msgId: crypto.randomUUID(),
              content: JSON.stringify(sdkMessage.message)
            };
            break;
          case "result":
            switch (sdkMessage.subtype) {
              case "success":
                yield {
                  msgId: crypto.randomUUID(),
                  content: sdkMessage.result
                };
                break;
              case "error_during_execution":
                yield {
                  msgId: crypto.randomUUID(),
                  content: 'エラーが発生しました',
                };
                break;
              case "error_max_turns":
                yield {
                  msgId: crypto.randomUUID(),
                  content: '最大ターン数に達しました',
                };
                break;
            }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Unknown error: ${error}`);
      }
    } finally {
      this.#abortController = undefined;
      mcpSubscription.unsubscribe();
    }
  }

  async close(): Promise<void> {
    if (this.#abortController) {
      this.#abortController.abort();
    }
  }
}

export class ClaudeCodingAgentFactory implements CodingAgentFactory {
  constructor(private permissionMcpServer: PermissionMcpServer) { }
  createAgent(cwd: string): CodingAgent {
    return new ClaudeCodingAgent(cwd, this.permissionMcpServer);
  }
}