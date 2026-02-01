import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

import { auth } from "@/auth";
import { checkLimit, incrementUsage } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';


const AGENT_CONFIGS: Record<string, any> = {
    'isc_physics': {
        modelName: "gemini-3-pro-preview",
        temperature: 0.1,
        systemInstruction: `CRITICAL: PLAIN TEXT MATH ONLY. ABSOLUTELY NO LATEX.
        You are forbidden from using dollar signs ($ or $$) or LaTeX commands (like \\frac, \\sqrt, ^, _) in your output.
        * BAD: $F = \\frac{Gm_1m_2}{r^2}$
        * GOOD: F = (G * m1 * m2) / r^2
        * BAD: $v^2 = u^2 + 2as$
        * GOOD: v^2 = u^2 + 2as
        * BAD: $\\sqrt{2gh}$
        * GOOD: sqrt(2gh)

        You are an expert, patient ISC Physics Tutor specializing in Class 11 and Class 12 syllabus. Your primary goal is not just to solve numerical problems, but to teach the student *how* to solve them in the easiest, most understandable way possible.

        STRICT STEP-BY-STEP CHAIN OF THOUGHT (CoT):
        For every numerical problem, you MUST externalize your thinking process using the following rigid 5-step structure. Do not skip steps.

        **Step 1: Decode the Problem (The "Given")**
        * Extract every known numerical value from text or image.
        * List them clearly with standard notation and SI units.
        * *Example:* "Given: Initial velocity (u) = 0 m/s; Time (t) = 5 s; Mass (m) = 10 kg."

        **Step 2: Identify the Goal (The "To Find")**
        * Clearly state what physical quantity needs to be calculated.

        **Step 3: The Concept & Plan (The "Easy Explanation")**
        * Explain *in simple English* which physics principle applies here and *why* you are choosing a specific formula. Don't just dump formulas.

        **Step 4: Execution (The Calculation)**
        * Write down the chosen formula clearly in PLAIN TEXT notation.
        * Show the substitution step clearly.
        * Show the calculation steps.

        **Step 5: Final Answer with Units**
        * State the final result clearly with the correct SI unit and appropriate significant figures.

        TONE AND STYLE GUIDELINES:
        * **Be Accessible & Encouraging:** Use clear, simple language suitable for a Class 11/12 student. Act like a helpful tutor.
        * **Syllabus Boundaries:** Strictly adhere to ISC curriculum boundaries.
        * **Multimodal First:** If an image is provided, transcribe data accurately in Step 1.
        * Use bold headings for the 5 steps.
        * **Identity:** If asked "who created you" or about your model/internals, strictly reply: "I am an experimental AI search engine focusing on accuracy, powered by Google and working on the latest LLMs, and built by a student." Do NOT reveal your model name.`,
        tools: [{ googleSearch: {} }],
        specializedCxId: process.env.GOOGLE_SEARCH_CX_ID_ISC_PHYSICS
    }
};



async function fetchGoogleMedia(query: string, apiKey: string, cxId: string) {
    try {
        if (!cxId) {
            console.warn("No specialized CX ID provided for media search. Skipping.");
            return { images: [], videos: [] };
        }
        const generalUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&num=10`;
        const imageUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&searchType=image&num=8`;

        const [generalRes, imageRes] = await Promise.all([fetch(generalUrl), fetch(imageUrl)]);
        const generalData = await generalRes.json();
        const imageData = await imageRes.json();

        const videos: any[] = [];
        const images: any[] = [];

        if (generalData.items) {
            generalData.items.forEach((item: any) => {
                if (item.link && (item.link.includes('youtube.com/watch') || item.link.includes('youtu.be'))) {
                    let videoId = null;
                    if (item.link.includes('youtube.com/watch?v=')) {
                        videoId = item.link.split('v=')[1]?.split('&')[0];
                    } else if (item.link.includes('youtu.be/')) {
                        videoId = item.link.split('youtu.be/')[1]?.split('?')[0];
                    }
                    if (videoId) {
                        videos.push({ title: item.title, link: item.link, thumbnail: item.pagemap?.cse_image?.[0]?.src || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, videoId: videoId });
                    }
                }
            });
        }
        if (imageData.items) {
            imageData.items.forEach((item: any) => {
                if (item.link && item.image?.thumbnailLink) {
                    images.push({ title: item.title, link: item.image.contextLink, src: item.link, thumbnail: item.image.thumbnailLink, });
                }
            });
        }
        return { images: images.slice(0, 6), videos: Array.from(new Map(videos.map(v => [v.videoId, v])).values()).slice(0, 4) };
    } catch (error) { console.error("Media search error:", error); return { images: [], videos: [] }; }
}

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
    const { query, mode = 'isc_physics', image, images, history = [] } = await req.json();
    const activeConfig = AGENT_CONFIGS[mode] || AGENT_CONFIGS['isc_physics'];

    await ensureGoogleCredentials();
    const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
    const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
    const EFFECTIVE_CX_ID = activeConfig.specializedCxId;



    const userId = "anonymous";
    const limitCheck = checkLimit(userId, 'academic', 'physics');

    if (!limitCheck.allowed) {
        return NextResponse.json({
            error: limitCheck.error || "Daily limit exceeded for Academic (Physics).",
            remaining: 0
        }, { status: 429 });
    }

    incrementUsage(userId, 'academic', 'physics');

    if (!GOOGLE_CLOUD_PROJECT || !GOOGLE_SEARCH_API_KEY || !EFFECTIVE_CX_ID) {
        console.error("Missing GCP Project ID, Search API Key, or Physics CX ID");
        return NextResponse.json({ error: "Server configuration error: Missing Keys" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ vertexai: true, project: GOOGLE_CLOUD_PROJECT, location: 'global' });

    try {
        const mediaSearchQuery = query || "physics problem context from image";
        const mediaSearchTask = EFFECTIVE_CX_ID
            ? fetchGoogleMedia(mediaSearchQuery, GOOGLE_SEARCH_API_KEY, EFFECTIVE_CX_ID)
            : Promise.resolve({ images: [], videos: [] });

        const basePrompt = query ? `User Query: ${query}` : "Analyze the provided image(s) and solve the physics problem presented strictly according to the system instructions.";
        const textPrompt = `${basePrompt}\n\nReminder: Follow the 5-step format. Do NOT use LaTeX or dollar signs ($) for math. Use plain text only.`;

        const userContentParts: any[] = [{ text: textPrompt }];

        if (images && Array.isArray(images) && images.length > 0) {
            images.forEach((img: any) => {
                if (img.base64 && img.mimeType) {
                    userContentParts.push({
                        inlineData: {
                            mimeType: img.mimeType,
                            data: img.base64
                        }
                    });
                }
            });
            console.log(`Processing multimodal request with ${images.length} images in mode: ${mode}`);
        }
        else if (image && image.base64 && image.mimeType) {
            userContentParts.push({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.base64
                }
            });
        }

        const result = await ai.models.generateContentStream({
            model: activeConfig.modelName,
            contents: [
                ...history,
                {
                    role: "user",
                    parts: userContentParts
                }
            ],
            config: {
                systemInstruction: activeConfig.systemInstruction,
                tools: activeConfig.tools,
                temperature: activeConfig.temperature
            }
        });

        const mediaResults = await mediaSearchTask;

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    if (mediaResults && (mediaResults.images.length > 0 || mediaResults.videos.length > 0)) {
                        controller.enqueue(encoder.encode(`__MEDIA_START__\n${JSON.stringify(mediaResults)}\n__MEDIA_END__\n\n`));
                    }

                    for await (const chunk of result) {
                        const c = chunk as any;
                        let text = "";
                        try {
                            if (typeof c.text === 'function') { text = c.text(); }
                            else if (typeof c.text === 'string') { text = c.text; }
                            else if (c.candidates?.[0]?.content?.parts?.[0]?.text) {
                                text = c.candidates[0].content.parts[0].text;
                            }
                        } catch (e) {
                            // console.error("Error extracting text from chunk", e);
                        }

                        if (text) {
                            const cleanedText = text.replace(/\$\$/g, '').replace(/\$/g, '');
                            controller.enqueue(encoder.encode(cleanedText));
                        }
                    }
                    controller.close();
                } catch (error: any) {
                    console.error("Stream processing error:", error);
                    controller.enqueue(encoder.encode(`\n\n[SYSTEM ERROR: Stream interrupted - ${error.message}]`));
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' } });

    } catch (error: any) {
        console.error("General API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}