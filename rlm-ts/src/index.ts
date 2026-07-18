export { LLMClient } from './LLMClient';
export { REPLEnv } from './REPLEnv';
export { buildSystemPrompt, SYSTEM_PROMPT } from './prompts';
export { RLM } from './RLM';

// For testing or direct execution:
async function runDemo() {
    // Note: requires API_KEY environment variable to be set
    if (require.main === module) {
        console.log("Running RLM TypeScript demo...");
        const { RLM } = await import('./RLM');
        const rlm = new RLM("gpt-4o-mini", "gpt-4o-mini", 5);
        
        const document = `
This report discusses the development of a new battery technology.
It covers technical design choices, manufacturing trade-offs, safety concerns,
cost reduction strategies, and future commercialization plans.

One section focuses on performance improvements in energy density.
Another section discusses supply-chain risks and regulatory constraints.
The final section outlines expected market impact and open research questions.
        `;

        const query = "Summarize the main ideas discussed in this document.";
        
        try {
            const result = await rlm.completion(document, query);
            console.log("\nFINAL RESULT:");
            console.log(result);
        } catch (e) {
            console.error("Error running RLM:", e);
        }
    }
}

runDemo();
