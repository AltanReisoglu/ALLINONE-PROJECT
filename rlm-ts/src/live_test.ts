import { RLM } from './RLM';
import * as dotenv from 'dotenv';
dotenv.config();

async function runLiveTest() {
    console.log("==========================================");
    console.log(" RUNNING LIVE RLM TEST WITH HUGGING FACE  ");
    console.log(" Model: meta-llama/Llama-3.1-8B-Instruct");
    console.log("==========================================\n");

    const targetModel = "meta-llama/Llama-3.1-8B-Instruct";
    const rlm = new RLM(targetModel, targetModel, 5);

    const document = `
Project Code Snippet:

function processUserData(user) {
    let query = "SELECT * FROM users WHERE id = '" + user.id + "'";
    db.query(query);
}

function handleAuth(token) {
    if (!token) return false;
    return true;
}
    `;

    const query = "Analyze the provided code snippets using your subagents (use role 'security' for security analysis and 'coder' for code quality). Store findings in state and summarize.";

    try {
        console.log("Starting RLM completion process...");
        const result = await rlm.completion(document, query, true);
        console.log("\n==========================================");
        console.log("FINAL LIVE RESULT:");
        console.log(result);
        console.log("==========================================");
    } catch (e: any) {
        console.error("Error during live RLM test:", e.message || e);
    }
}

runLiveTest();
