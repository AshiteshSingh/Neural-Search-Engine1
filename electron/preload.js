const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    // Add any needed IPC here
})
