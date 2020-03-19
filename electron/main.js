const { app, BrowserWindow, Menu } = require('electron')
if (process.env.NODE_ENV === 'development') {
  const { client } = require('electron-connect')
}

Menu.setApplicationMenu(null)
// app.commandLine.appendSwitch('force-fieldtrials', 'WebRTC-SupportVP9SVC/EnabledByFlag_3SL3TL/')


function createWindow() {
  const win = new BrowserWindow({
    show:false,
    // width: 1024,
    // height: 768,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.maximize()  
  win.loadFile('./public/index.html')
  win.show()

  // win.webContents.openDevTools()

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
