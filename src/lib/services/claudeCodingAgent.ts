import type { AgentMessage, CodingAgent, CodingAgentFactory, CodingPermission } from "$lib/domain";


export class ClaudeCodingAgent implements CodingAgent {
    #cwd: string;
    constructor(cwd: string) {
        this.#cwd = cwd;
    }

    process(props: { prompt: string; continuationToken?: string; permitAction: (data: any) => Promise<CodingPermission>; }): AsyncIterable<AgentMessage, { continuationToken: string; }> {
        throw new Error("Method not implemented.");
    }
}

export class ClaudeCodingAgentFactory implements CodingAgentFactory {
    createAgent(cwd: string): CodingAgent {
        return new ClaudeCodingAgent(cwd);
    }
}