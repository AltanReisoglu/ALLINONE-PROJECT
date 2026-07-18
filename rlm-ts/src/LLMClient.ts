import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.RLM_API_URL || "https://api.openai.com/v1";
const API_KEY = process.env.API_KEY || process.env.OPENAI_API_KEY || "";

/**
 * Minimal LLM client for APIs.
 */
export class LLMClient {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = API_URL, model: string = "auto") {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    private async resolveModel(model: string): Promise<string> {
        if (model !== "auto") return model;
        try {
            const resp = await fetch(`${this.baseUrl}/models`, {
                headers: API_KEY ? { "Authorization": `Bearer ${API_KEY}` } : {}
            });
            const data: any = await resp.json();
            const models = data.data || data.models || data;
            
            if (models && Array.isArray(models) && models.length > 0) {
                const m = typeof models[0] === 'object' ? models[0].id : models[0];
                console.log(`Auto-selected model: ${m}`);
                return m;
            }
        } catch (e) {
            console.log(`Could not auto-detect model: ${e}`);
        }
        return "gpt-3.5-turbo"; // Fallback model
    }

    async chat(messages: {role: string, content: string}[], kwargs: any = {}): Promise<string> {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (API_KEY) {
            headers["Authorization"] = `Bearer ${API_KEY}`;
        }

        const resolvedModel = await this.resolveModel(this.model);

        const data = {
            model: resolvedModel,
            messages: messages,
            max_tokens: kwargs.max_tokens || 2048,
            temperature: kwargs.temperature ?? 0.7,
        };

        const resp = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status} - ${await resp.text()}`);
        }

        const json: any = await resp.json();
        return json.choices[0].message.content;
    }
}
