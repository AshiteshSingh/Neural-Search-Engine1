import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

// Helper to write GCP credentials to a temporary file for the SDK
// (Duplicated from existing routes to ensure connectivity)
async function ensureGoogleCredentials() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
    const credentialsJson = process.env.GCP_CREDENTIALS_JSON;
    if (!credentialsJson) return;
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, "google-credentials.json");
    try {
        let content = credentialsJson;
        try { JSON.parse(content); } catch { content = Buffer.from(credentialsJson, 'base64').toString('utf-8'); }
        await writeFile(filePath, content);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
    } catch (error) { console.error("Credential error:", error); }
}

export async function POST(req: Request) {
    try {
        const { content, userPrompt } = await req.json();

        if (!content) {
            return NextResponse.json({ error: "No content provided" }, { status: 400 });
        }

        await ensureGoogleCredentials();
        const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;

        if (!GOOGLE_CLOUD_PROJECT) {
            return NextResponse.json({ error: "Missing GCP configuration" }, { status: 500 });
        }

        const ai = new GoogleGenAI({ vertexai: true, project: GOOGLE_CLOUD_PROJECT, location: 'global' });
        // Use a fast, capable model for summarization

        const prompt = `You are a helpful moderation assistant.
        Please summarize the following "Inappropriate Content" and "Original Prompt" concisely for a user report.
        
        Original Prompt: "${userPrompt || 'N/A'}"
        
        Inappropriate Content: "${content.substring(0, 10000)}..." (Formatted truncated for summary)
        
        Output **ONLY** valid JSON in this format:
        {
          "contentSummary": "One or two sentences summarizing the inappropriate content...",
          "promptSummary": "One sentence summarizing the user's request..."
        }`;

        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        // Handling response structure for new SDK
        let responseText = "{}";
        // result IS the response object in the new SDK
        if (result && result.candidates && result.candidates.length > 0) {
            const candidate = result.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                // @ts-ignore
                responseText = candidate.content.parts[0].text;
            }
        }

        // Clean markdown code blocks if present
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let summaries = { contentSummary: content, promptSummary: userPrompt };

        try {
            summaries = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse JSON summary:", responseText);
            // Fallback to simple extraction or original text if JSON fails
        }

        return NextResponse.json(summaries);

    } catch (error: any) {
        console.error("Summarization API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
