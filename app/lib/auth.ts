import { writeFile } from "fs/promises";
import path from "path";
import os from "os";

export async function ensureGoogleCredentials() {
    // If GOOGLE_APPLICATION_CREDENTIALS is already set and file exists, we are good.
    // But on Vercel, we likely only have the JSON content in an env var.

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return; // Already configured (e.g. locally or via other means)
    }

    const credentialsJson = process.env.GCP_CREDENTIALS_JSON;
    if (!credentialsJson) {
        console.warn("GCP_CREDENTIALS_JSON not found. Auth might fail if not running locally with ADC.");
        return;
    }

    // Write to a temp file
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, "google-credentials.json");

    try {
        // Decode if base64? The user usually pastes raw JSON, but sometimes base64.
        // Let's assume raw JSON for now as commonly pasted in Vercel dashboard.
        // If it fails parse, maybe try base64.
        let content = credentialsJson;
        try {
            JSON.parse(content);
        } catch {
            // Maybe base64?
            try {
                content = Buffer.from(credentialsJson, 'base64').toString('utf-8');
                JSON.parse(content); // verify
            } catch (e) {
                console.error("Failed to parse GCP_CREDENTIALS_JSON as JSON or Base64");
                return;
            }
        }

        await writeFile(filePath, content);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = filePath;
        console.log("Created temporary credentials file at:", filePath);
    } catch (error) {
        console.error("Failed to write credentials file:", error);
    }
}
