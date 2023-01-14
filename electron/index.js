// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { streamPath, servePath } = require("../demo/script");

const { readFileSync, writeFileSync } = require("fs")

const net = require("net")

class ServerSerializer {
  constructor(contentRoot) {
    this._contentRoot = contentRoot;
    this._servers = {};
    this._streams = {};
  }

  lock(cb) {
    const p = new Promise(async ()=>{
      await cb();
    });
    if (this._lock) {
      this._lock.then(p);
    } else {
      this._lock = p;
    }
  }

  async servePath(subPath) {
    if (!this._servers[subPath]) {
      try {
        this._servers[subPath] = await servePath(this._contentRoot, subPath);
      } catch (ex) {
        console.log("Exception serving path: ", ex);
        return;
      }
    }
    return this._servers[subPath];
  }

  async streamPath(subPath) {
    if (!this._streams[subPath]) {
      const stream = await streamPath(this._contentRoot, subPath)
      stream.setCallbackUrl(subPath)
      this._streams[subPath] = stream
    }
    return this._streams[subPath];
  }

  async callback(subPath, callbackId, val) {
    const stream = await this.streamPath(subPath);
    stream.callback(callbackId, val)
  }
}

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

  console.log(process.argv);
  console.log(`SITE_ROOT=${process.env.SITE_ROOT}`);
  const streamRoot = (process.env.SITE_ROOT || process.argv[2]) || process.cwd()
  console.log(`streamRoot is ${streamRoot}`);
  const serializer = new ServerSerializer(streamRoot);

  ipcMain.on('parsegraph-splice', (_, text, index, count, subPath)=>{
    try {
      console.log("Splicing ", subPath);
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

  ipcMain.on('parsegraph-callback', async (_, callbackUrl, callbackId, val)=>{
    try {
      await serializer.callback(callbackUrl, callbackId, val);
    } catch(ex) {
      console.log("Callback exception", ex);
    }
  })

  ipcMain.on('parsegraph-start', async (_, url)=>{
    console.log("START ", url)
    try {
      const stream = await serializer.servePath(url)
      stream.setCallbackUrl(url)
      stream.connect((...args)=>{
        //console.log("Parsegraph stream", ...args)
        mainWindow.webContents.send('parsegraph', url, ...args)
      });
    } catch(ex) {
      console.log("Error starting server", ex);
    }
  })

  ipcMain.on('parsegraph-stream', async (_, url)=>{
    console.log("CONNECTED TO", url)
    const server = await serializer.streamPath(url);
    server.connect((...args)=>{
      mainWindow.webContents.send('parsegraph-stream-event', url, ...args)
    });
  })

  ipcMain.on('parsegraph-populate', async (_, url)=>{
    serializer.lock(async ()=>{
      const server = await serializer.servePath(url);
      server.forEach((...args)=>{
        mainWindow.webContents.send('parsegraph-populate-event', url, ...args)
      });
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
