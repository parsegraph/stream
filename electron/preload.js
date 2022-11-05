// preload.js
//

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    parsegraph: (url, callback) => {
      ipcRenderer.send('parsegraph-start', url);
      if (callback) {
        ipcRenderer.on('parsegraph', (_, eventUrl, ...args)=>{
          if (eventUrl === url) {
            callback(...args)
          }
        })
      }
    },
    parsegraphSplice: (text, offset, len, subPath) => {
      ipcRenderer.send('parsegraph-splice', text, offset, len, subPath)
    },
    parsegraphCallback: (callbackUrl, callbackId, val) => {
      ipcRenderer.send('parsegraph-callback', callbackUrl, callbackId, val)
    },
    parsegraphStream: (url, callback) => {
      ipcRenderer.send('parsegraph-stream', url);
      if (callback) {
        const listener = (_, eventUrl, ...args)=>{
          if (eventUrl === url) {
            callback(...args)
          }
        }
        ipcRenderer.on('parsegraph-stream-event', listener)
      }
    },
    parsegraphLog: (text) => {
      ipcRenderer.send("parsegraph-log", text)
    }
})

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
})
