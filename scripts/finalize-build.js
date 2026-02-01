const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const src = path.join(__dirname, '../.next/standalone')
const dest = path.join(__dirname, '../dist/win-unpacked/resources/app_srv')

console.log('Finalizing build: Copying standalone server to resources...')
console.log(`Source: ${src}`)
console.log(`Dest: ${dest}`)

// Ensure destination parent exists
const destParent = path.dirname(dest)
if (!fs.existsSync(destParent)) {
    fs.mkdirSync(destParent, { recursive: true })
}

// Use robocopy for robust file copying
// /E = copy subdirectories including empty ones
// /IS = include same files
// /MOVE = move files and dirs? No, we want copy.
// /NFL = no directory list logging
// /NDL = no file list logging
// /NJH = no job header
// /NJS = no job summary
// /nc /ns /np = no class, no size, no progress
// Robocopy returns codes: 0-7 are success (mostly). 1 = files copied. 0 = no files copied.
try {
    // Note: Robocopy arguments order: source destination [files] [options]
    execSync(`robocopy "${src}" "${dest}" /E /NFL /NDL /NJH /NJS /nc /ns /np`, { stdio: 'inherit' })
} catch (e) {
    // Robocopy exits with non-zero on success (files copied), so we check status
    // If exit code is <= 7, it's fine.
    // Node throws on non-zero exit code.
    if (e.status > 8) {
        console.error('Robocopy failed with code:', e.status)
        process.exit(1)
    }
}

console.log('Copy complete.')
