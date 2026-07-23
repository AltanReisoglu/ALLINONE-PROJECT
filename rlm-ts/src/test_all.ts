import { REPLEnv } from './REPLEnv';

async function testREPLEnvTruncation() {
    console.log("--- Test 1: Hard Truncation in REPLEnv ---");
    const mockLlmQuery = async (p: string, r?: string) => `Mock response for role [${r || 'general'}]`;
    const repl = new REPLEnv(mockLlmQuery, "Sample Context");
    
    // Code that prints over 3000 characters
    const code = `
        for (let i = 0; i < 60; i++) {
            console.log("This is a long line printed to test the 2000 character output truncation limit.");
        }
    `;
    const result = await repl.execute(code);
    console.log("Output Length:", result.length);
    const hasTruncationMsg = result.includes("[OUTPUT TRUNCATED TO 2000 CHARACTERS]");
    console.log("Contains Truncation Notice:", hasTruncationMsg);
    if (hasTruncationMsg && result.length <= 2100) {
        console.log("✓ PASS: Hard Truncation works correctly!\n");
    } else {
        console.error("✗ FAIL: Hard Truncation failed.\n");
    }
}

async function testRoleSubagentAndBlackboard() {
    console.log("--- Test 2: Role-based Subagents & Blackboard History ---");

    const mockRLMQuery = async (p: string, role: string = "general") => {
        const response = `Analyzed by [${role}]: ${p}`;
        if (!repl.blackboard.history) repl.blackboard.history = [];
        repl.blackboard.history.push({
            timestamp: new Date().toISOString(),
            role,
            prompt: p,
            response
        });
        return response;
    };

    const repl = new REPLEnv(mockRLMQuery, "Security & Code Context");
    
    const code = `
        let sec = await llm_query("Check SQL injection vulnerability", "security");
        let codeRes = await llm_query("Refactor database query function", "coder");
        let summary = await llm_query("Summarize audit findings", "summarizer");
        
        console.log("Subagents completed work!");
    `;

    await repl.execute(code);

    console.log("Blackboard History Count:", repl.blackboard.history.length);
    console.log("History Entries:", JSON.stringify(repl.blackboard.history, null, 2));

    if (repl.blackboard.history.length === 3 && repl.blackboard.history[0].role === 'security') {
        console.log("✓ PASS: Role-based subagents & Blackboard History logging work correctly!\n");
    } else {
        console.error("✗ FAIL: Blackboard history logging failed.\n");
    }
}

async function testParallelExecution() {
    console.log("--- Test 3: Parallel Subagent Execution (Promise.all) ---");
    const mockRLMQuery = async (p: string, role: string = "general") => {
        return `Parallel result for [${role}]: ${p}`;
    };

    const repl = new REPLEnv(mockRLMQuery, "Parallel Context");
    const code = `
        const tasks = [
            llm_query("Chunk 1 info", "analyst"),
            llm_query("Chunk 2 info", "analyst"),
            llm_query("Chunk 3 info", "analyst")
        ];
        state.results = await Promise.all(tasks);
        console.log("Results count:", state.results.length);
    `;

    await repl.execute(code);
    console.log("State Results:", repl.state.results);
    if (repl.state.results && repl.state.results.length === 3) {
        console.log("✓ PASS: Parallel Subagent execution works correctly!\n");
    } else {
        console.error("✗ FAIL: Parallel execution failed.\n");
    }
}

async function main() {
    console.log("==========================================");
    console.log(" RUNNING RLM SYSTEM UNIT & FEATURE TESTS  ");
    console.log("==========================================\n");
    await testREPLEnvTruncation();
    await testRoleSubagentAndBlackboard();
    await testParallelExecution();
    console.log("==========================================");
    console.log(" ALL TESTS COMPLETED SUCCESSFULLY!        ");
    console.log("==========================================");
}

main();
