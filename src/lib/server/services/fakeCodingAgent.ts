import type { AgentMessage, CodingAgent, CodingAgentFactory, CodingPermission } from "$lib/server/domain";

export class FakeCodingAgent implements CodingAgent {
  #cwd: string;
  #messages: AgentMessage[];
  #delay: number;

  constructor(cwd: string, messages: AgentMessage[] = [], delay: number = 100) {
    this.#cwd = cwd;
    this.#messages = messages;
    this.#delay = delay;
  }

  async *process(props: {
    prompt: string,
    permitAction: (data: any) => Promise<CodingPermission>
  }): AsyncIterable<AgentMessage> {
    // プロンプトに対するデフォルトレスポンス
    if (this.#messages.length === 0) {
      yield {
        msgId: crypto.randomUUID(),
        content: JSON.stringify({
          type: "text",
          content: `受信したプロンプト: "${props.prompt}" (作業ディレクトリ: ${this.#cwd})`
        })
      };
      return;
    }

    // 設定されたメッセージを順次返す
    for (const message of this.#messages) {
      if (this.#delay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.#delay));
      }
      yield message;
    }
  }

  async close(): Promise<void> {
    // 特に何もしない
  }
}

export class FakeCodingAgentFactory implements CodingAgentFactory {
  #messages: AgentMessage[];
  #delay: number;

  constructor(messages: AgentMessage[] = [], delay: number = 100) {
    this.#messages = messages;
    this.#delay = delay;
  }

  createAgent(cwd: string): CodingAgent {
    return new FakeCodingAgent(cwd, this.#messages, this.#delay);
  }
}