const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const APP_DATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const CACHE_DIR = path.join(APP_DATA, 'electron-builder', 'Cache', 'winCodeSign');
const VERSION = '2.6.0';
const URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-${VERSION}/winCodeSign-${VERSION}.7z`;

const DEST_DIR = path.join(CACHE_DIR, `winCodeSign-${VERSION}`);
const ZIP_FILE = path.join(CACHE_DIR, `winCodeSign-${VERSION}.7z`);

if (!fs.existsSync(CACHE_DIR)) {
    console.log('Creating cache dir...');
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function run(cmd) {
    console.log(`> ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Command failed: ${cmd}`);
        process.exit(1);
    }
}

function extract() {
    console.log(`Extracting to ${DEST_DIR}...`);
    let sevenZip;
    try {
        sevenZip = require('7zip-bin').path7za;
    } catch (e) {
        console.error('7zip-bin not found in node_modules.');
        process.exit(1);
    }

    // Clean old
    if (fs.existsSync(DEST_DIR)) {
        try { execSync(`rmdir /s /q "${DEST_DIR}"`, { shell: 'cmd.exe', stdio: 'ignore' }); } catch (e) { }
    }

    // Extract: -xr!darwin -xr!linux
    // Note: ensure quotes around paths
    const cmd = `"${sevenZip}" x "${ZIP_FILE}" -o"${DEST_DIR}" -y -xr!darwin -xr!linux`;
    run(cmd);
    console.log('Extraction complete (macOS/Linux binaries excluded).');
}

console.log(`Downloading winCodeSign ${VERSION} using curl...`);

// Use curl for reliable download with redirects
// -L follows redirects, -o output file
const curlCmd = `curl -L "${URL}" -o "${ZIP_FILE}"`;
run(curlCmd);

console.log('Download complete.');
extract();
