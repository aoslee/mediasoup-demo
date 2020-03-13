const { app, BrowserWindow } = require('electron')
if (process.env.NODE_ENV === 'development') {
  const { client } = require('electron-connect')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('./public/index.html')

  win.webContents.openDevTools()

  if (process.env.NODE_ENV === 'development') {
    client.create(win);
  }

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
