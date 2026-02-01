const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const net = require('net')
const fs = require('fs')

let mainWindow
let serverProcess
const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
    // Determine icon path based on environment
    const iconPath = app.isPackaged
        ? path.join(process.resourcesPath, 'app_srv', 'public', 'neural.png')
        : path.join(__dirname, '../public/neural.png')

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    })

    // Intercept new window API
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Open all external links in system browser
        shell.openExternal(url)
        return { action: 'deny' }
    })

    mainWindow.setMenuBarVisibility(false)

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `http://localhost:${process.env.PORT || 3000}`

    if (isDev) {
        const waitForUrl = async () => {
            try {
                await mainWindow.loadURL(startUrl)
                mainWindow.webContents.openDevTools()
            } catch (e) {
                setTimeout(waitForUrl, 1000)
            }
        }
        waitForUrl()
    } else {
        const loadProd = async () => {
            try {
                await mainWindow.loadURL(startUrl)
            } catch (e) {
                setTimeout(loadProd, 1000)
            }
        }
        loadProd()
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer()
        server.once('error', () => resolve(false))
        server.once('listening', () => {
            server.close()
            resolve(true)
        })
        server.listen(port, '127.0.0.1')
    })
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer()
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port
            server.close(() => resolve(port))
        })
        server.on('error', reject)
    })
}

function log(msg) {
    const logPath = path.join(app.getPath('userData'), 'app-debug.log')
    const fs = require('fs')
    fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`)
    console.log(msg)
}

// Global port tracking
let serverPort = 3000

async function startServer() {
    if (isDev) return

    log('Starting server process...')

    let port = 3000
    const isFree = await isPortFree(port)
    if (!isFree) {
        log('Port 3000 is busy, trying to find another port but Auth might fail...')
        port = await getFreePort()
    }
    serverPort = port
    process.env.PORT = port

    const exePath = app.getPath('exe')
    log(`Executable path: ${exePath}`)

    const appPath = app.isPackaged ? path.join(process.resourcesPath, 'app_srv') : path.join(__dirname, '../.next/standalone')
    const startScript = path.join(appPath, 'server.js')
    log(`App path: ${appPath}`)
    log(`Start script path: ${startScript}`)

    // Load .env.local manually
    let env = { ...process.env, PORT: port, HOSTNAME: '127.0.0.1', NODE_ENV: 'production' }

    const envPath = app.isPackaged ? path.join(process.resourcesPath, '.env.local') : path.join(__dirname, '../.env.local')

    if (fs.existsSync(envPath)) {
        log(`Loading env from: ${envPath}`)
        const dotenv = fs.readFileSync(envPath, 'utf8')
        const lines = dotenv.split(/\r?\n/)
        lines.forEach(line => {
            line = line.trim()
            if (!line || line.startsWith('#')) return

            const match = line.match(/^([^=]+)=(.*)$/)
            if (match) {
                const key = match[1].trim()
                let value = match[2].trim()
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1)
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1)
                }
                env[key] = value
            }
        })
    } else {
        log(`No .env.local found at ${envPath}`)
    }

    const keys = Object.keys(env)
    log(`Loaded env keys: ${keys.filter(k => k.includes('AUTH') || k.includes('GOOGLE')).join(', ')}`)

    if (env.AUTH_SECRET && !env.NEXTAUTH_SECRET) {
        env.NEXTAUTH_SECRET = env.AUTH_SECRET
    }
    if (!env.AUTH_SECRET && env.NEXTAUTH_SECRET) {
        env.AUTH_SECRET = env.NEXTAUTH_SECRET
    }

    env.NEXTAUTH_URL = `http://localhost:${port}`
    env.AUTH_URL = `http://localhost:${port}`

    env.ELECTRON_RUN_AS_NODE = '1'

    // Verify paths exist
    if (!fs.existsSync(exePath)) log(`[ERROR] Executable path not found: ${exePath}`)
    else log(`[OK] Executable exists`)

    if (!fs.existsSync(appPath)) log(`[ERROR] App path (CWD) not found: ${appPath}`)
    else log(`[OK] App path exists`)

    if (!fs.existsSync(startScript)) log(`[ERROR] Start script not found: ${startScript}`)
    else log(`[OK] Start script exists`)

    log('Spawning server process...')

    try {
        serverProcess = spawn(exePath, [startScript], {
            env: env,
            cwd: appPath,
        })

        serverProcess.stdout.on('data', (data) => {
            log(`Server: ${data}`)
        })

        serverProcess.stderr.on('data', (data) => {
            log(`Server Error: ${data}`)
        })

        serverProcess.on('error', (err) => {
            log(`Failed to spawn server: ${err.message}`)
        })

        serverProcess.on('exit', (code, signal) => {
            log(`Server exited with code ${code} and signal ${signal}`)
        })

    } catch (e) {
        log(`Exception spawning server: ${e.message}`)
    }
}

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('neuralscholar', process.execPath, [path.resolve(process.argv[1])])
    }
} else {
    app.setAsDefaultProtocolClient('neuralscholar')
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }

        const url_str = commandLine.find(arg => arg.startsWith('neuralscholar://'))
        if (url_str) handleDeepLink(url_str)
    })

    app.on('open-url', (event, url) => {
        event.preventDefault()
        handleDeepLink(url)
    })

    app.whenReady().then(async () => {
        try {
            await startServer()
        } catch (e) {
            log(`Startup error: ${e.message}`)
        }
        createWindow()

        const url_str = process.argv.find(arg => arg.startsWith('neuralscholar://'))
        if (url_str) handleDeepLink(url_str)

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow()
            }
        })
    })
}

async function handleDeepLink(urlStr) {
    log(`Received Deep Link: ${urlStr}`)
    try {
        const urlObj = new URL(urlStr)
        const token = urlObj.searchParams.get('token')

        if (token && mainWindow) {
            log('Injecting Session Token...')

            const targetUrl = `http://localhost:${serverPort}`

            const cookie = {
                url: targetUrl,
                name: 'authjs.session-token',
                value: token,
                sameSite: 'lax',
                httpOnly: true
            }

            try {
                await mainWindow.webContents.session.cookies.set(cookie)
                log('Insecure cookie set successfully.')
            } catch (e) {
                log(`Failed to set insecure cookie: ${e.message}`)
            }

            const secureCookie = {
                url: targetUrl,
                name: '__Secure-authjs.session-token',
                value: token,
                sameSite: 'lax',
                httpOnly: true,
                secure: true
            }

            try {
                await mainWindow.webContents.session.cookies.set(secureCookie)
                log('Secure cookie set.')
            } catch (e) {
                log(`Expected error setting secure cookie (HTTP): ${e.message}`)
            }

            log('Reloading app to apply session...')
            mainWindow.reload()
            mainWindow.focus()
        }
    } catch (e) {
        log(`Deep Link Parse Error: ${e.message}`)
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill()
    }
})
