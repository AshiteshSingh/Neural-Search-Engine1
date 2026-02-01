const fs = require('fs')
const path = require('path')

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })

    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
        } else {
            fs.copyFileSync(srcPath, destPath)
        }
    }
}

const example = () => {
    const standaloneDir = path.join(__dirname, '../.next/standalone')
    const staticSrc = path.join(__dirname, '../.next/static')
    const publicSrc = path.join(__dirname, '../public')

    const staticDest = path.join(standaloneDir, '.next/static')
    const publicDest = path.join(standaloneDir, 'public')

    console.log('Copying static assets to standalone folder...')

    copyDir(staticSrc, staticDest)
    console.log('Copied .next/static')

    copyDir(publicSrc, publicDest)
    console.log('Copied public')
}

example()
