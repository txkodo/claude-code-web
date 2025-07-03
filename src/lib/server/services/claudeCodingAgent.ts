import type { AgentMessage, CodingAgent, CodingAgentFactory, CodingPermission } from "$lib/server/domain";
import { query } from '@anthropic-ai/claude-code';
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
            yield {
              type: "text",
              msgId: crypto.randomUUID(),
              content: JSON.stringify(sdkMessage)
            };
            break;
          case "user":
            // ツール結果を個別に処理
            const content = sdkMessage.message.content;
            if (Array.isArray(content)) {
              for (const item of content) {
                switch (item.type) {
                  case "tool_result":
                    if (typeof item.content === 'string') {
                      yield {
                        type: "tool_result",
                        msgId: crypto.randomUUID(),
                        toolOutput: { type: "text", text: item.content }
                      };
                    } else if (Array.isArray(item.content)) {
                      for (const x of item.content) {
                        switch (x.type) {
                          case "text":
                            yield {
                              type: "tool_result",
                              msgId: crypto.randomUUID(),
                              toolOutput: { type: "text", text: x.text }
                            };
                            break;
                          case "image":
                            yield {
                              type: "tool_result",
                              msgId: crypto.randomUUID(),
                              toolOutput: { type: "image", uri: x.source.type === "base64" ? `data:${x.source.media_type};base64,${x.source.data}` : x.source.url }
                            };
                            break;
                        }
                      }
                    }
                    break;
                  default:
                    yield {
                      type: "text",
                      msgId: crypto.randomUUID(),
                      content: JSON.stringify(item)
                    };
                    break;
                }
              }
            }
            break;
          case "result":
            switch (sdkMessage.subtype) {
              case "success":
                yield {
                  type: "text",
                  msgId: crypto.randomUUID(),
                  content: sdkMessage.result
                };
                break;
              case "error_during_execution":
                yield {
                  type: "text",
                  msgId: crypto.randomUUID(),
                  content: 'エラーが発生しました',
                };
                break;
              case "error_max_turns":
                yield {
                  type: "text",
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