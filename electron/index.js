// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { streamPath, servePath } = require("../demo/script");

const { readFileSync, writeFileSync } = require("fs")

const net = require("net")

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

  try {
    const logSocket = net.connect(28122, "localhost", ()=>{
      ipcMain.on('parsegraph-log', (_, text)=>{
        logSocket.write(text + "\r\n")
      })
    })
  } catch (ex) {
    console.log(ex);
  }

  const streamRoot = process.env.SITE_ROOT || process.cwd()

  ipcMain.on('parsegraph-splice', (_, text, index, count, subPath)=>{
    try {
      const filePath = path.join(streamRoot, subPath);
      const str = readFileSync(filePath).toString();
      if (isNaN(index) || isNaN(count)) {
        return;
      }
      writeFileSync(
        filePath,
        str.slice(0, index) + (text || "") + str.slice(index + count)
      );
      mainWindow.webContents.send('parsegraph', subPath, "spliceComplete")
    } catch (ex) {
      console.log(ex);
    }
  })

  const streams = {}
  ipcMain.on('parsegraph-callback', (_, callbackUrl, callbackId, val)=>{
    const stream = streams[callbackUrl]
    if (!stream) {
      console.log("Unhandled callback", callbackUrl)
      return;
    }
    stream.callback(callbackId, val)
  })

  ipcMain.on('parsegraph-start', async (_, url)=>{
    console.log("START ", url)
    const stream = await servePath(streamRoot, url)
    stream.setCallbackUrl(url)
    stream.connect((...args)=>{
      //console.log("Parsegraph stream", ...args)
      mainWindow.webContents.send('parsegraph', url, ...args)
    });
  })

  ipcMain.on('parsegraph-stream', async (_, url)=>{
    console.log("CONNECTED TO", url)
    const stream = await streamPath(streamRoot, url)
    stream.setCallbackUrl(url)
    streams[url] = stream
    stream.connect((...args)=>{
      mainWindow.webContents.send('parsegraph-stream-event', url, ...args)
    });
  })

  const servers = {};
  ipcMain.on('parsegraph-populate', async (_, url)=>{
    if (!servers[url]) {
      servers[url] = await servePath(streamRoot, subPath);
    }
    const server = servers[url]
    server.forEach((...args)=>{
      mainWindow.webContents.send('parsegraph-populate-event', url, ...args)
    });
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
