const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("GOOGLE_SEARCH_API_KEY present:", !!process.env.GOOGLE_SEARCH_API_KEY);
console.log("GOOGLE_SEARCH_CX_ID present:", !!process.env.GOOGLE_SEARCH_CX_ID);
if (!process.env.GOOGLE_SEARCH_API_KEY) console.log("WARNING: API Key is missing.");
if (!process.env.GOOGLE_SEARCH_CX_ID) console.log("WARNING: CX ID is missing.");
