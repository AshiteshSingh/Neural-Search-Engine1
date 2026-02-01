const fetch = require('node-fetch'); // Assuming node-fetch is available or using global fetch in Node 18+

async function testFetch(query, apiKey, cxId) {
    console.log(`Testing query: ${query}`);
    const generalUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cxId}&q=${encodeURIComponent(query)}&num=10`;

    try {
        const res = await fetch(generalUrl);
        const data = await res.json();

        console.log(`Status: ${res.status}`);
        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        console.log(`Total Items: ${data.items ? data.items.length : 0}`);

        const videos = [];
        if (data.items) {
            data.items.forEach((item, i) => {
                console.log(`[${i}] ${item.link}`);
                if (item.link && (item.link.includes('youtube.com/watch') || item.link.includes('youtu.be'))) {
                    videos.push(item.link);
                }
            });
        }
        console.log("Extracted Videos:", videos);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

// Mock env vars usually needed, but here we need real ones. 
// I will read them from .env.local parsing manually since I can't require 'dotenv' easily if not installed.
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) env[k.trim()] = v.trim();
});

testFetch("Apple M4 MacBook Pro review", env.GOOGLE_SEARCH_API_KEY, env.GOOGLE_SEARCH_CX_ID);
