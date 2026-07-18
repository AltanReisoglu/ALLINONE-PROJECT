/**
 * REPL environment for code execution with access to context and recursive LLM calls.
 */
export class REPLEnv {
    public state: Record<string, any>;
    private llmQueryFn: (prompt: string) => Promise<string>;

    constructor(llmQueryFn: (prompt: string) => Promise<string>, context: any) {
        this.state = { context };
        this.llmQueryFn = llmQueryFn;
    }

    async execute(code: string): Promise<string> {
        let output = "";
        
        // Custom console to capture stdout from the executed code
        const customConsole = {
            log: (...args: any[]) => {
                output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
            },
            error: (...args: any[]) => {
                output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
            }
        };

        try {
            // Using AsyncFunction to evaluate code and support top-level await 
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            
            // Function signature: async function(context, llm_query, console, state) { ... }
            const func = new AsyncFunction('context', 'llm_query', 'console', 'state', code);
            
            await func(this.state.context, this.llmQueryFn, customConsole, this.state);
            return output ? output.trim() : "(no output)";
        } catch (e: any) {
            return `Error: ${e.message}`;
        }
    }
}
