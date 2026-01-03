
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listModels() {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
    if (!apiKey) {
        console.error("API Key not found in .env.local");
        return;
    }
    const genAI = new GoogleGenAI(apiKey);
    try {
        const models = await genAI.listModels();
        console.log("Available Models:");
        models.models.forEach(m => {
            console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods.join(", ")})`);
        });
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
