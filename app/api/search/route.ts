import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { ensureGoogleCredentials } from "../../lib/auth";

export async function POST(req: Request) {
  try {
    // Ensure credentials are available (for Vercel)
    await ensureGoogleCredentials();

    const { query } = await req.json();

    // Initialize the new unified client
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: "global",
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use ai.models.generateContentStream for streaming
          const result = await ai.models.generateContentStream({
            model: "gemini-3-flash-preview",
            contents: [{
              role: "user",
              parts: [{
                text: `You are ChiruSearch, a real-time internet intelligence search engine.
                Provide a comprehensive, well-structured answer to the user's query.
                You MUST use Markdown formatting to structure your response:
                - **START** your response with a section titled "## Key Answer" containing a direct, high-level summary.
                - Use H2 (##) for every new section header.
                - Use **double newlines** between all paragraphs and list items.
                - Use **bold** for key terms.
                - Use > blockquotes for important definitions or takeaways.
                - Use lists (-) heavily for readability.
                - Keep the tone professional, objective, and helpful.
                - At the end, force a section titled "## Related" with 5 related follow-up questions or actions.
                
                User Query: ${query}`
              }]
            }],
            config: {
              tools: [{ googleSearch: {} }],
              thinkingConfig: {
                includeThoughts: true,
                thinkingLevel: "high" as any
              }
            }
          });

          // Iterate through the stream
          for await (const chunk of result) {
            // Get text content if available
            // safe cast to any to avoid TS issues with the SDK types for now if they are inconsistent
            const c = chunk as any;
            let text = "";
            if (typeof c.text === 'function') {
              text = c.text();
            } else if (typeof c.text === 'string') {
              text = c.text;
            } else if (c.candidates && c.candidates.length > 0) {
              text = c.candidates[0].content?.parts?.[0]?.text || "";
            }

            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }

            // Check for grounding metadata (sources) in this chunk
            const groundingMetadata = c.candidates?.[0]?.groundingMetadata;
            if (groundingMetadata) {
              const sourcesJson = JSON.stringify({ sources: groundingMetadata.groundingChunks || [] });
              controller.enqueue(new TextEncoder().encode(`\n\n__JSON_START__\n${sourcesJson}\n__JSON_END__`));
            }
          }

          controller.close();
        } catch (error: any) {
          console.error("Stream Error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error("Search API Init Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}