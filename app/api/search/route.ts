import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import os from "os";


import { auth } from "@/auth";
import { checkLimit, incrementUsage } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';


async function ensureGoogleCredentials() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return;
  }
  const credentialsJson = process.env.GCP_CREDENTIALS_JSON;
  if (!credentialsJson) {
    return;
  }
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, "google-credentials.json");
  try {
    let content = credentialsJson;
    try {
      JSON.parse(content);
    } catch {
      try {
        content = Buffer.from(credentialsJson, 'base64').toString('utf-8');
        JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse GCP_CREDENTIALS_JSON");
        return;
      }
    }
    await writeFile(filePath, content);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
  } catch (error) {
    console.error("Failed to write credentials file:", error);
  }
}


function extractTextFromGenAIResult(result: any): string {
  try {
    if (typeof result.text === 'function') return result.text();
    if (typeof result.text === 'string') return result.text;
    if (result.response?.text && typeof result.response.text === 'function') return result.response.text();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) return result.candidates[0].content.parts[0].text;
    return JSON.stringify(result);
  } catch (e) {
    console.error("Text Extraction Failed:", e);
    return "";
  }
}


async function intelligentMediaSelection(query: string, items: any[], projectId: string) {
  if (items.length <= 4) return items;

  try {
    const genAI = new GoogleGenAI({ vertexai: true, project: projectId, location: 'global' });

    const prompt = `
    You are an intelligent media curator.
    User Query: "${query}"

    Task: Select the top 8 most relevant images/videos from the list below that best match the user's intent.
    Context:
    - If query is for a specific movie (e.g., "Re:Born"), prefer movie posters or scenes.
    - If query is for news, prefer recent and relevant thumbnails.
    - Ignore irrelevant or low-quality items.

    List:
    ${items.map((item, index) => `${index}: ${item.title} (${item.link})`).join('\n')}

    Return ONLY a JSON array of the top 8 indices. Do not explain.
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = extractTextFromGenAIResult(result);
    // console.log("[Intelligent Select] Raw AI Response:", text.substring(0, 100) + "...");

    // Extract JSON using robust bracket finding
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.substring(start, end + 1);
      const indices = JSON.parse(jsonStr);
      if (Array.isArray(indices)) {
        const selected = indices.map(i => items[i]).filter(Boolean);
        console.log(`[Intelligent Select] Input: ${items.length} -> Output: ${selected.length}`);
        return selected.length > 0 ? selected : items.slice(0, 8);
      }
    }
  } catch (e) {
    console.error("Intelligent Selection Failed:", e);
  }

  // Fallback
  return items.slice(0, 4);
}


async function fetchGoogleMedia(query: string, apiKey: string, cxId: string, youtubeApiKey?: string, onlyVideo: boolean = false, sortByDate: boolean = false) {
  const images: any[] = [];
  const videos: any[] = [];

  console.log(`[fetchGoogleMedia] START: "${query}" (onlyVideo=${onlyVideo}, sortByDate=${sortByDate})`);

  try {
    // 1. Fetch Images (Custom Search API)
    if (!onlyVideo) {
      const imageParams = new URLSearchParams({
        key: apiKey,
        cx: cxId,
        q: query,
        searchType: 'image',
        num: '10', // Fetch 10 images
        safe: 'active'
      });

      console.log(`[fetchGoogleMedia] Requesting Images: ${imageParams.toString()}`);
      const imageRes = await fetch(`https://www.googleapis.com/customsearch/v1?${imageParams.toString()}`);

      if (imageRes.ok) {
        const data = await imageRes.json();
        console.log(`[fetchGoogleMedia] Image Response OK. Items: ${data.items?.length || 0}`);

        if (data.items) {
          data.items.forEach((item: any) => {
            if (item.link) {
              images.push({
                title: item.title || "Image",
                link: item.image?.contextLink || item.link,
                src: item.link,
                thumbnail: item.image?.thumbnailLink || item.link,
                height: item.image?.height || 0,
                width: item.image?.width || 0
              });
            }
          });
        }
      } else {
        console.error(`[fetchGoogleMedia] Image Error ${imageRes.status}:`, await imageRes.text());
      }
    }

    // 2. Fetch Videos (YouTube API Preferred, Fallback to Custom Search)
    if (youtubeApiKey) {
      let targetChannelId = null;

      // STEP A: Channel Authority Check
      // If user wants "latest" (sortByDate), first find the Official Channel to avoid global spam/shorts.
      if (sortByDate) {
        try {
          const channelParams = new URLSearchParams({
            part: 'snippet',
            maxResults: '1',
            q: query,
            type: 'channel',
            key: youtubeApiKey
          });
          const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${channelParams.toString()}`);
          if (channelRes.ok) {
            const cData = await channelRes.json();
            if (cData.items && cData.items.length > 0) {
              targetChannelId = cData.items[0].id.channelId;
              console.log(`[fetchGoogleMedia] Official Channel Found: ${cData.items[0].snippet.title}`);
            }
          }
        } catch (e) {
          console.error("Channel Lookup Failed:", e);
        }
      }

      // Hack: Append "-shorts" to query to filter out Shorts if user is asking for "video"
      const videoQuery = query.toLowerCase().includes("short") ? query : `${query} -shorts`;

      // Use YouTube Data API (scoped to channel if found)
      const youtubeParams = new URLSearchParams({
        part: 'snippet',
        maxResults: '8',
        q: videoQuery,
        type: 'video',
        key: youtubeApiKey,
        order: sortByDate ? 'date' : 'relevance',
        ...(targetChannelId ? { channelId: targetChannelId } : {})
      });

      console.log(`[fetchGoogleMedia] Requesting Videos: q="${videoQuery}", channel=${targetChannelId || 'global'}, order=${sortByDate ? 'date' : 'relevance'}`);
      const youtubeRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${youtubeParams.toString()}`);
      if (youtubeRes.ok) {
        const data = await youtubeRes.json();
        console.log(`[fetchGoogleMedia] YouTube API OK. Items: ${data.items?.length || 0}`);
        if (data.items) {
          data.items.forEach((item: any) => {
            videos.push({
              title: item.snippet.title,
              link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
              videoId: item.id.videoId,
              publishedAt: item.snippet.publishedAt // Useful for context
            });
          });
        }
      } else {
        console.warn("YouTube API failed, falling back to Custom Search for videos.");
      }
    }

    // Fallback: If no YouTube results (or no API key), try Custom Search for videos
    if (videos.length === 0) {
      console.log("Using CSE Video Fallback. SortByDate:", sortByDate);
      const videoParams = new URLSearchParams({
        key: apiKey,
        cx: cxId,
        q: query + " youtube -shorts", // Enforce video intent + no shorts
        num: '4',
        safe: 'active',
        ...(sortByDate ? { sort: 'date' } : {}) // Support recency in CSE
      });
      const videoRes = await fetch(`https://www.googleapis.com/customsearch/v1?${videoParams.toString()}`);
      if (videoRes.ok) {
        const data = await videoRes.json();
        if (data.items) {
          data.items.forEach((item: any) => {
            // Try to extract video ID
            let videoId = null;
            if (item.link?.includes('youtube.com/watch')) {
              try { videoId = new URL(item.link).searchParams.get('v'); } catch (e) { }
            } else if (item.link?.includes('youtu.be/')) {
              try { videoId = item.link.split('youtu.be/')[1]; } catch (e) { }
            }

            if (videoId) {
              videos.push({
                title: item.title,
                link: item.link,
                thumbnail: item.pagemap?.cse_image?.[0]?.src || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                videoId: videoId
              });
            }
          });
        }
      }
    }

    console.log(`[fetchGoogleMedia] RESULT: Images=${images.length}, Videos=${videos.length}`);
    return { images, videos };
  } catch (error) {
    console.error("fetchGoogleMedia Error:", error);
    return { images: [], videos: [] };
  }
}


async function fetchShoppingResults(query: string, apiKey: string, cxId: string) {
  const items: any[] = [];
  try {
    // Context-Aware: Check for Indian currency or location to target specific sites
    const isIndia = /rs\.?|inr|rupees|india/i.test(query);
    const siteFilter = isIndia ? " (site:amazon.in OR site:flipkart.com)" : "";

    const shoppingParams = new URLSearchParams({
      key: apiKey,
      cx: cxId,
      q: query + " buy online price" + siteFilter, // Enforce shopping intent + regional filter
      num: '6',
      safe: 'active'
    });
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${shoppingParams.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.items) {
        data.items.forEach((item: any) => {
          // Extract price if available in structured data
          let price = "Unknown Price";
          let currency = "";
          if (item.pagemap?.offer?.[0]) {
            price = item.pagemap.offer[0].price;
            currency = item.pagemap.offer[0].pricecurrency;
          }

          items.push({
            title: item.title,
            link: item.link,
            source: item.displayLink,
            price: price !== "Unknown Price" ? `${currency} ${price}` : "",
            snippet: item.snippet
          });
        });
      }
    }
  } catch (e) {
    console.error("fetchShoppingResults Error:", e);
  }
  return items;
}


async function generateMediaSearchQuery(originalQuery: string, projectId: string): Promise<string> {
  try {
    const genAI = new GoogleGenAI({ vertexai: true, project: projectId, location: 'global' });
    const prompt = `
    You are an expert search optimizations assistant.
    User Query: "${originalQuery}"

    Goal: Rewrite this query into a highly effective keyword-based search string specifically for finding relevant IMAGES and VIDEOS on Google.
    - Remove conversational fluff ("show me", "latest", "who is", "find").
    - Focus on finding the visual subject.
    - If the query is about a specific person, place, or thing, ensure the name is prominent.
    - If the query is vague, infer the most likely visual intent.
    
    Examples:
    - "Who is the CEO of Nvidia?" -> "Jensen Huang Nvidia CEO"
    - "iPhone 15 pro max review" -> "iPhone 15 Pro Max"
    - "Show me videos of falcons" -> "falcon bird flight"

    Return ONLY the raw search string. No quotes, no markdown.
    `;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = extractTextFromGenAIResult(result);
    // Sanity Check: If AI refused or failed
    if (!text || text.length > 50 || text.toLowerCase().includes("sorry") || text.toLowerCase().includes("cannot")) {
      console.warn("Query Rewriter Invalid Output. Fallback to original.");
      return originalQuery;
    }

    const refined = text.trim();
    console.log(`[Query Rewriter] "${originalQuery}" -> "${refined}"`);
    return refined || originalQuery;
  } catch (e) {
    console.error("Query Rewriter Failed:", e);
    return originalQuery;
  }
}






async function generateStandaloneQuery(query: string, history: any[], projectId: string) {
  if (!history || history.length === 0) return query;

  try {
    const genAI = new GoogleGenAI({ vertexai: true, project: projectId, location: 'global' });
    const lastFewMessages = history.slice(-10); // Take last 10 messages for deeper context

    let contextText = "";
    for (const msg of lastFewMessages) {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const text = msg.parts?.[0]?.text || "";
      // Truncate long messages to save tokens/latency
      contextText += `${role}: ${text.substring(0, 300)}\n`;
    }

    const prompt = `
        Conversation History:
        ${contextText}
        
        Current User Request: "${query}"
        
        Task: Rewrite the "Current User Request" into a standalone, detailed search query that includes all necessary context from the conversation history.
        - If the request is "Show me more images", and previous topic was "Tiger Woods", the fallback query should be "Tiger Woods images".
        - If the request is "Who is his wife?", and previous topic was "Barack Obama", the fallback query should be "Barack Obama wife".
        - If the request is entirely new (e.g., "Weather in Tokyo"), return it exactly as is.
        - RETURN ONLY THE PLAIN QUERY STRING. NO MARKDOWN. NO EXPLANATION.
        `;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = extractTextFromGenAIResult(result).trim();
    return text.replace(/^"|"$/g, '').trim() || query;

  } catch (e) {
    console.error("Standalone Query Generation Failed:", e);
    return query;
  }
}

export async function POST(req: Request) {
  const { query, history = [] } = await req.json();

  await ensureGoogleCredentials();

  const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;

  // Use the CORRECT environment variables found during debugging
  const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
  const GOOGLE_SEARCH_CX_ID = process.env.Google_Search_CX_ID;
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  console.log("DEBUG: YOUTUBE_API_KEY Loaded?", !!YOUTUBE_API_KEY);
  console.log("DEBUG: Query:", query);

  if (!GOOGLE_CLOUD_PROJECT) {
    return NextResponse.json({ error: "Missing GOOGLE_CLOUD_PROJECT environment variable" }, { status: 500 });
  }



  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: GOOGLE_CLOUD_PROJECT,
      location: 'global',
    });

    const isVideoIntent = /youtube|video|watch|clip/i.test(query);
    const isShoppingIntent = /buy|price|cost|cheap|budget|under \d+|best \w+/i.test(query);
    const activeModel = "gemini-3-flash-preview";



    let mediaQuery = query;
    if (process.env.GOOGLE_SEARCH_API_KEY) {
      if (history.length > 0) {
        mediaQuery = await generateStandaloneQuery(query, history, GOOGLE_CLOUD_PROJECT!);
        console.log(`[Context] Original: "${query}" -> Standalone: "${mediaQuery}"`);
      } else {
        mediaQuery = await generateMediaSearchQuery(query, GOOGLE_CLOUD_PROJECT!);
      }
    }

    const isRecencyRequested = /latest|recent|newest|fresh|updates/i.test(query);



    const hasPronouns = /\b(this|that|these|those|he|she|they|it|him|her)\b/i.test(query);
    if (hasPronouns && history.length > 0) {
      // Find the last user message in history
      const lastUserMsg = [...history].reverse().find((msg: any) => msg.role === 'user');
      if (lastUserMsg && lastUserMsg.parts?.[0]?.text) {
        const lastQuery = lastUserMsg.parts[0].text;
        console.log(`Context Dependency Detected. Merging: "${mediaQuery}" + "${lastQuery}"`);
        mediaQuery = `${mediaQuery} ${lastQuery}`;
      }
    }

    const rawMediaResults = (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX_ID)
      ? await fetchGoogleMedia(mediaQuery, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX_ID, YOUTUBE_API_KEY, isVideoIntent, isRecencyRequested)
      : { images: [], videos: [] };



    const mediaResults = {
      images: rawMediaResults.images.slice(0, 8),
      videos: rawMediaResults.videos.slice(0, 6)
    };

    const shouldScrape = !isVideoIntent && !isShoppingIntent;

    const scrapePromise = Promise.resolve([]);

    const shoppingPromise = (isShoppingIntent && GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX_ID)
      ? fetchShoppingResults(query, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_CX_ID)
      : Promise.resolve([]);

    const [scrapedImages, shoppingResults] = await Promise.all([scrapePromise, shoppingPromise]);



    if (scrapedImages.length > 0) {
      mediaResults.images = [...scrapedImages, ...mediaResults.images];
    }

    // Prepare Context
    let mediaContext = "";
    if (mediaResults.videos.length > 0) {
      mediaContext += "\n\nVERIFIED FOUND VIDEOS (Use these real links preferentially):\n" +
        mediaResults.videos.map((v: any) => `- "${v.title}" (${v.publishedAt ? 'Uploaded: ' + v.publishedAt : 'Unknown Date'}): ${v.link}`).join("\n");
    }

    let shoppingContext = "";
    if (shoppingResults.length > 0) {
      shoppingContext = "\n\nVERIFIED SHOPPING LINKS (Use these for 'Buy' columns):\n" +
        shoppingResults.map((s: any) => `- [${s.title}](${s.link}) ${s.price ? '- ' + s.price : ''} (Source: ${s.source})`).join("\n");
    }

    const videoSystemInstruction = `You are a YouTube Video Assistant.
Query: "${query}"

${mediaContext}

Goal: Search for and find relevant videos for the user's query. Provide a summary and list them.

Guidelines:
1. **Prioritize Verified Videos**: The list of 'VERIFIED FOUND VIDEOS' above are confirmed generic YouTube results. You should discuss these if they are relevant.
2. **Use Search Tool**: You MUST use the Google Search tool to find *additional* details or specific videos if the verified ones are insufficient.
3. **Link Validation (STRICT)**:
   - **ONLY** use links that are explicitly listed in 'VERIFIED FOUND VIDEOS' or *exactly* extracted from a Google Search result.
   - **NEVER** construct a link yourself or use a placeholder like '.../watch?v=v_v_v_v_v'.
   - If you mention a video but do not have a verified, working link, **DO NOT** include a link. Just state the title (and channel/date if known).
   - **BAD LINK PENALTY**: Generating a link that does not start with 'https://www.youtube.com/watch?v=' and contain a valid ID is a critical failure.
4. **Brief Summary**: Provide a concise summary of what the user can expect to see in these videos.
5. **Citations**: Use [1], [2] style citations for any claims.

Formatting:
- **STRICTLY PROHIBITED**: Do NOT use Markdown links like [Title](URL). This triggers a penalty.
- Use standard Markdown.
`;

    const searchSystemInstruction = `You are Groverbits, a real-time AI search engine.
Your goal is to provide comprehensive, accurate, and well-structured answers to user queries based *strictly* on the provided search results (grounding).

Query: ${query}

Query: ${query}

${mediaContext}
${shoppingContext}

Guidelines:
1.  **Search & Synthesis**: You have access to Google Search. **Use it FREELY and UNLIMITEDLY.** Do not limit your search. Use the Google Search tool as many times as needed to find comprehensive, deep, and varied information. Synthesize the results into a coherent answer.
2.  **Citations (CRITICAL)**: You *must* cite your sources using the [source_id] format (e.g., [1], [2]).
    - **PREFERRED**: Use \`[1]\`, \`[2]\` citations at the end of sentences.
    - **ALLOWED**: You may use natural Markdown links like \`[Spaceflight Now](URL)\` if it fits the flow and the URL is verified.
    - **NO GUESSING**: Do not guess URLs.
    - **VERIFICATION**: Verify that every citation corresponds to a grounded search result.
3.  **Visuals & Formatting (CRITICAL - STRICT ADHERENCE)**:
    - **TABLES OVER LISTS**: Use **Markdown Tables** for ALL structured data.
      - **STRICT TABLE SYNTAX**: You MUST use outer pipes for every row to ensure proper rendering.
        - Correct: \`| Feature | Detail |\`
        - Incorrect: \`Feature | Detail\`
      - If listing people, roles, dates, or stats: **USE A TABLE**.
      - If comparing items: **USE A TABLE**.
      - **DO NOT** use bulleted lists for data that can be tabulated. Lists look "cheap" for data; Tables look professional.
    - **Headings**: Use H2 ("##") for main sections and H3 ("###") for subsections.
    - **Emphasis**: Use **bold** for important concepts.
4.  **Tone**: Professional, helpful, direct, and neutral.
5.  **No Hallucinations**: Do not make up information or URLs. If a specific video or page is not found in the search results, state that it is not available rather than inventing a link.

6.  **Shopping & Product Recommendations**:
    - **MANDATORY**: For product recommendations (e.g., "best gaming mouse"), you **MUST** include a "Buy / Link" column in your Markdown tables.
    - **Dynamic Search Steps**:
        1.  **Check Verified Links**: Look at the "VERIFIED SHOPPING LINKS" list provided above. Use these if they match your recommended products confidenty.
        2.  **Fallback to Tool Use (CRITICAL)**: If a recommended product is NOT in the verified list, or the match is poor, you **MUST** use the \`googleSearch\` tool to find a specific link for that exact product (e.g., search for "Logitech G102 buy online price India").
        3.  **Fill the Gap**: Do **NOT** leave the "Buy / Link" column empty if possible. Make an active effort to find a link for every row.
    - **Format**: \`[Buy on Amazon](Verified_URL)\`.
    - **Price**: Include approximate price if found.
    - **Matching**: Be careful with models, but common sense applies. "Logitech G102" matches "Logitech G102 Lightsync".

7.  **Relevant Videos (from 'VERIFIED FOUND VIDEOS' list above)**:
    - If, and ONLY if, there are Relevant Videos in the 'VERIFIED FOUND VIDEOS' list provided in the context above:
        - You may list them at the end of your response under a "### Recommended Videos" heading.
        - You ARE ALLOWED to use the exact links provided in that verified list (and ONLY those links).
        - **LIMIT**: List ONLY the top 4 most relevant videos.
        - Format: \`- [Video Title](Link)\`

8.  **Related Questions**:
    - You may provide 3 very short follow-up questions at the very end.
    - Header: \`### Related Questions\`
    - Format: \`- Question text\`

9.  **Identity Response**: **ONLY** if explicitly asked "who created you", "what model are you", or for internal details, then reply: "I am an experimental AI search engine focusing on accuracy, powered by Google and working on the latest LLMs, and built by a student." **NEVER** include this message in standard search results or answers about other topics.

Formatting:
- **PRIORITIZE TABLES**.
- Use outer pipes \`| | \` for tables.
- Use standard Markdown.
`;
    const geminiTask = ai.models.generateContentStream({
      model: activeModel,
      contents: [
        ...history,
        {
          role: "user",
          parts: [{
            text: isVideoIntent ? videoSystemInstruction : searchSystemInstruction
          }]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: ThinkingLevel.HIGH
        },
        temperature: 0.1
      }
    });

    const result = await geminiTask;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let hasSentMedia = false;

        try {
          // Send Status
          const statuses = isVideoIntent
            ? ["Searching YouTube...", "Finding relevant clips...", "Analyzing video content..."]
            : ["Searching Google...", "Reading sources...", "Synthesizing answer..."];

          for (const status of statuses) {
            controller.enqueue(encoder.encode(`__THOUGHT_START__${status}__THOUGHT_END__`));
            await new Promise(r => setTimeout(r, 600));
          }

          // Media results already awaited (injected into context)

          // Send Media IMMEDIATELY if available
          if ((mediaResults.images.length > 0 || mediaResults.videos.length > 0) && !hasSentMedia) {
            const mediaJson = JSON.stringify(mediaResults);
            controller.enqueue(encoder.encode(`__MEDIA_START__\n${mediaJson}\n__MEDIA_END__\n\n`));
            hasSentMedia = true;
          }

          // Stream Vertex AI Text
          for await (const chunk of result) {
            const c = chunk as any;
            let text = "";

            // Extract text content
            if (typeof c.text === 'function') { text = c.text(); }
            else if (typeof c.text === 'string') { text = c.text; }
            else if (c.candidates?.[0]?.content?.parts?.[0]) {
              const part = c.candidates[0].content.parts[0];
              if (part.thought) { text = `__THOUGHT_START__${part.text}__THOUGHT_END__`; }
              else { text = part.text || ""; }
            }

            // Extract Sources from Grounding Metadata
            if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              const chunks = c.candidates[0].groundingMetadata.groundingChunks;
              const dynamicSources = chunks
                .filter((chunk: any) => chunk.web)
                .map((chunk: any) => ({
                  web: {
                    uri: chunk.web.uri,
                    title: chunk.web.title,
                    snippet: chunk.web.snippet || ""
                  }
                }));

              if (dynamicSources.length > 0) {
                const sourcesJson = JSON.stringify({ sources: dynamicSources });
                controller.enqueue(encoder.encode(`\n\n__JSON_START__\n${sourcesJson}\n__JSON_END__\n\n`));
              }
            }

            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();

        } catch (error: any) {
          console.error("Stream Error:", error);
          controller.enqueue(encoder.encode(`\n\n[SYSTEM ERROR: Stream interrupted - ${error.message}]`));
          controller.close();
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