/**
 * REPL environment for code execution with access to context and recursive LLM calls.
 */
export class REPLEnv {
    public state: Record<string, any>;
    public blackboard: Record<string, any>;
    private llmQueryFn: (prompt: string, role?: string) => Promise<string>;

    constructor(llmQueryFn: (prompt: string, role?: string) => Promise<string>, context: any) {
        this.state = { context };
        this.blackboard = {};
        this.llmQueryFn = llmQueryFn;
    }

    async execute(code: string): Promise<string> {
        let output = "";
        const MAX_OUTPUT_LEN = 2000;
        let isTruncated = false;
        const appendOutput = (text: string) => {
            if (isTruncated) return;
            output += text;
            if (output.length > MAX_OUTPUT_LEN) {
                output = output.substring(0, MAX_OUTPUT_LEN) + "\n... [OUTPUT TRUNCATED TO 2000 CHARACTERS]";
                isTruncated = true;
            }
        };
        const customConsole = {
            log: (...args: any[]) => {
                const line = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
                appendOutput(line);
            },
            error: (...args: any[]) => {
                const line = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
                appendOutput(line);
            }
        };

        try {
            // Using AsyncFunction to evaluate code and support top-level await 
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            
            // Function signature: async function(context, llm_query, console, state, blackboard) { ... }
            const func = new AsyncFunction('context', 'llm_query', 'console', 'state', 'blackboard', code);
            
            await func(this.state.context, this.llmQueryFn, customConsole, this.state, this.blackboard);
            return output ? output.trim() : "(no output)";
        } catch (e: any) {
            return `Error: ${e.message}`;
        }
    }
}
