
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import os from "os";

// Load .env.local
try {
    const envPath = path.resolve(__dirname, ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const [key, ...valParts] = line.split("=");
        if (key && valParts.length > 0) {
            process.env[key.trim()] = valParts.join("=").trim();
        }
    });
} catch (e) {
    console.log("Could not read .env.local");
}

async function ensureGoogleCredentials() {
    const credentialsJson = process.env.GCP_CREDENTIALS_JSON;
    if (!credentialsJson) {
        console.log("No GCP_CREDENTIALS_JSON found in env");
        return;
    }

    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, "google-credentials-test.json");
    let content = credentialsJson;
    try {
        JSON.parse(content);
    } catch {
        content = Buffer.from(credentialsJson, 'base64').toString('utf-8');
    }
    fs.writeFileSync(filePath, content);

    // Force overwrite
    process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
    console.log("Credentials written to:", filePath);
}

async function main() {
    await ensureGoogleCredentials();

    const ai = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT,
        location: 'global',
    });

    const model = "gemini-3-flash-preview";
    console.log(`Running query on ${model}...`);

    try {
        const result = await ai.models.generateContent({
            model: model,
            contents: [{ role: "user", parts: [{ text: "Find me images of cute cats." }] }],
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const c = result.candidates?.[0];
        if (c?.groundingMetadata) {
            console.log("Grounding Metadata Found!");
            // Log everything
            console.log(JSON.stringify(c.groundingMetadata, null, 2));
        } else {
            console.log("No grounding metadata.");
            console.log(JSON.stringify(result, null, 2));
        }

    } catch (error: any) {
        console.error("Error occurred:", error.message);
    }
}

main();
