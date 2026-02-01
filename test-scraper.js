const cheerio = require('cheerio');

async function testScraper() {
    const url = "https://www.littleflowerschoolgkp.com/";
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        console.log(`Status: ${res.status}`);
        const html = await res.text();
        console.log(`Body Length: ${html.length}`);

        // Log first 500 chars to see if it's a block page or JS skeleton
        console.log("--- HTML PREVIEW ---");
        console.log(html.substring(0, 500));
        console.log("--------------------");

        const $ = cheerio.load(html);
        const images = [];

        $('img').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src) images.push(src);
        });

        // Check Open Graph tags
        $('meta[property="og:image"]').each((i, el) => {
            const src = $(el).attr('content');
            if (src) images.push(src);
        });

        console.log(`Extracted ${images.length} images:`);
        console.log(images);

    } catch (error) {
        console.error("Error:", error);
    }
}

testScraper();
