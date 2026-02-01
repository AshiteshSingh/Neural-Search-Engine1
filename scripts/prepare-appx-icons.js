const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '../public')
const buildDir = path.join(__dirname, '../build/appx')

// Ensure destination exists
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true })
}

// Source files expected from PWA Builder output in public
const sourceAndroid = path.join(publicDir, 'android')
const sourceWin11 = path.join(publicDir, 'windows11')

// Mapping as requested:
// icon-512x512.png -> StoreLogo.png
// icon-192x192.png -> Square150x150Logo.png
// icon-192x192.png -> Square44x44Logo.png
// landscape -> Wide310x150Logo.png

// We use the android assets as the "base" icons if available, falling back to specific known files
function copyFile(src, destFilename) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(buildDir, destFilename))
        console.log(`Copied ${path.basename(src)} -> ${destFilename}`)
    } else {
        console.warn(`Source not found: ${src}`)
    }
}

console.log('Preparing AppX icons...')

// 1. Copy base images from Android folder (usually high res)
copyFile(path.join(sourceAndroid, 'android-launchericon-512-512.png'), 'StoreLogo.png')
copyFile(path.join(sourceAndroid, 'android-launchericon-192-192.png'), 'Square150x150Logo.png')
copyFile(path.join(sourceAndroid, 'android-launchericon-192-192.png'), 'Square44x44Logo.png')

// 2. Wide logo from Windows 11 folder
copyFile(path.join(sourceWin11, 'Wide310x150Logo.scale-100.png'), 'Wide310x150Logo.png')

// 3. IMPORTANT: Copy all pre-scaled assets from Windows 11 folder
// Electron-builder uses these automatically for optimal display
if (fs.existsSync(sourceWin11)) {
    const files = fs.readdirSync(sourceWin11)
    files.forEach(file => {
        // Skip if directory (though simple check)
        const srcPath = path.join(sourceWin11, file)
        if (fs.lstatSync(srcPath).isFile()) {
            fs.copyFileSync(srcPath, path.join(buildDir, file))
        }
    })
    console.log(`Copied ${files.length} scaled assets from windows11 folder`)
}

console.log('AppX icons ready in build/appx/')
