import { LLMClient } from "./LLMClient";
import { REPLEnv } from "./REPLEnv";
import { buildSystemPrompt } from "./prompts";

/**
 * Main class that makes the iterative REPL-based reasoning loop.
 */
export class RLM {
    private llm: LLMClient;
    private subLlm: LLMClient;
    private maxIterations: number;
    private repl: REPLEnv | null;

    constructor(model: string = "auto", subModel: string = "auto", maxIterations: number = 15) {
        this.llm = new LLMClient(undefined, model);
        this.subLlm = new LLMClient(undefined, subModel);
        this.maxIterations = maxIterations;
        this.repl = null;
    }

    private async _llmQuery(prompt: string, role: string = "general"): Promise<string> {
        const systemPrompts: Record<string, string> = {
            general: "You are a helpful AI sub-agent.",
            coder: "You are an expert software developer and code analyst. Write clean, working code.",
            security: "You are a cybersecurity auditor focusing on vulnerabilities and bugs.",
            summarizer: "You are a concise summarizer. Extract only essential facts and bullet points.",
            analyst: "You are a logic and data analyst. Focus on pattern extraction and strict reasoning."
        };

        const systemContent = systemPrompts[role] || systemPrompts.general;
        const response = await this.subLlm.chat([
            { role: "system", content: systemContent },
            { role: "user", content: prompt }
        ]);

        // Automatic Blackboard Log: Record sub-agent actions
        if (this.repl && this.repl.blackboard) {
            if (!Array.isArray(this.repl.blackboard.history)) {
                this.repl.blackboard.history = [];
            }
            this.repl.blackboard.history.push({
                timestamp: new Date().toISOString(),
                role,
                prompt,
                response
            });
        }

        return response;
    }

    private _findCodeBlocks(text: string): string[] {
        const pattern = /```repl\s*([\s\S]*?)```/g;
        const blocks: string[] = [];
        let match;
        while ((match = pattern.exec(text)) !== null) {
            blocks.push(match[1].trim());
        }
        return blocks;
    }

    private _findFinal(text: string): string | null {
        // FINAL_VAR
        const varMatch = /FINAL_VAR\(['"]?(\w+)['"]?\)/.exec(text);
        if (varMatch && this.repl) {
            const varName = varMatch[1];
            return String(this.repl.state[varName] !== undefined ? this.repl.state[varName] : `Variable '${varName}' not found`);
        }

        // FINAL
        const finalMatch = /FINAL\(([\s\S]+?)\)/.exec(text);
        if (finalMatch) {
            return finalMatch[1].trim();
        }

        return null;
    }

    async completion(context: any, query: string, verbose: boolean = true): Promise<string | null> {
        this.repl = new REPLEnv(this._llmQuery.bind(this), context);

        const messages: {role: string, content: string}[] = [
            { role: "system", content: buildSystemPrompt(context) }
        ];

        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            const userMsg = iteration === 0
                ? `First, explore the context in the REPL. Then answer: "${query}"\n\nYour next action:`
                : `Continue working to answer: "${query}"\n\nYour next action:`;

            messages.push({ role: "user", content: userMsg });

            if (verbose) {
                console.log(`\n${'='.repeat(60)}\n[Iteration ${iteration + 1}]`);
            }

            const response = await this.llm.chat(messages);
            messages.push({ role: "assistant", content: response });

            if (verbose) {
                console.log(`Response:\n${response.substring(0, 500)}${response.length > 500 ? '...' : ''}`);
            }

            const codeBlocks = this._findCodeBlocks(response);
            for (const code of codeBlocks) {
                const output = await this.repl.execute(code);
                
                if (verbose) {
                    console.log(`\nREPL Output:\n${output.substring(0, 500)}${output.length > 500 ? '...' : ''}`);
                }
                
                messages.push({
                    role: "user",
                    content: `Code executed:\n\`\`\`javascript\n${code}\n\`\`\`\n\nOutput:\n${output}`
                });
            }

            const final = this._findFinal(response);
            if (final) {
                if (verbose) {
                    console.log(`\n${'='.repeat(60)}\n✓ Final answer found!\n`);
                }
                return final;
            }
        }

        console.log(`\n⚠ Max iterations (${this.maxIterations}) reached without final answer`);
        return null;
    }
}
